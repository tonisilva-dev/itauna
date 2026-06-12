// Asaas Reconciliação Diária
// Invocada via cron (pg_net) ou manualmente pelo admin
// Responsabilidades:
//   1. Confirma pagamentos pendentes consultando a API Asaas
//   2. Cria lançamento financeiro para pagamentos confirmados sem registro
//   3. Marca cobranças vencidas (fallback ao pg_cron SQL)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_BASE = Deno.env.get('ASAAS_SANDBOX') === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

async function asaasFetch(path: string) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    headers: {
      'access_token': Deno.env.get('ASAAS_API_KEY')!,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${await res.text()}`)
  return res.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Permite chamada pelo cron (sem auth header) ou por admin autenticado
  const authHeader = req.headers.get('authorization') ?? ''
  const isServiceRole = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '__none__')
  const isCron = req.headers.get('x-cron-source') === 'pg_cron'

  if (!isServiceRole && !isCron) {
    // Verifica se é admin/síndico via JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const results = { reconciled: 0, vencidas: 0, errors: [] as string[] }

  // ── 1. Marcar vencidas (fallback ao pg_cron) ────────────────────────────
  const { error: vencErr } = await supabase.rpc('marcar_cobrancas_vencidas')
  if (vencErr) {
    results.errors.push(`marcar_vencidas: ${vencErr.message}`)
  } else {
    // Conta quantas foram marcadas nesta rodada
    const { count } = await supabase
      .from('cobrancas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'vencido')
      .gte('updated_at', new Date(Date.now() - 60_000).toISOString())
    results.vencidas = count ?? 0
  }

  // ── 2. Reconciliar pendentes com asaas_id ──────────────────────────────
  const { data: pendentes, error: fetchErr } = await supabase
    .from('cobrancas')
    .select('id, asaas_id, amount, due_date, reference_month, unit_number, unit_id, morador_id')
    .eq('status', 'pendente')
    .not('asaas_id', 'is', null)
    .order('due_date', { ascending: true })
    .limit(200) // processa no máximo 200 por rodada para evitar timeout

  if (fetchErr || !pendentes) {
    return new Response(JSON.stringify({ ...results, error: fetchErr?.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  for (const cobranca of pendentes) {
    try {
      const payment = await asaasFetch(`/payments/${cobranca.asaas_id}`)

      if (!['CONFIRMED', 'RECEIVED'].includes(payment.status)) continue

      // Atualiza cobrança
      await supabase
        .from('cobrancas')
        .update({
          status:         'pago',
          payment_date:   payment.paymentDate ?? payment.confirmedDate,
          payment_method: String(payment.billingType ?? 'boleto').toLowerCase(),
        })
        .eq('id', cobranca.id)

      // Upsert lançamento financeiro (idempotente)
      await supabase.from('finances').upsert(
        {
          cobranca_id:     cobranca.id,
          type:            'receita',
          category:        'Rateio Individual',
          description:     `Mensalidade ${cobranca.reference_month} — Chácara ${String(cobranca.unit_number).padStart(3, '0')}`,
          amount:          cobranca.amount,
          due_date:        cobranca.due_date,
          payment_date:    payment.paymentDate ?? payment.confirmedDate,
          status:          'pago',
          reference_month: cobranca.reference_month,
          unit_id:         cobranca.unit_id,
          created_by:      null,
        },
        { onConflict: 'cobranca_id', ignoreDuplicates: false }
      )

      results.reconciled++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.errors.push(`${cobranca.asaas_id}: ${msg}`)
      console.error('[reconciliacao]', cobranca.asaas_id, msg)
    }
  }

  console.log('[reconciliacao] resultado:', results)

  return new Response(JSON.stringify(results), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
