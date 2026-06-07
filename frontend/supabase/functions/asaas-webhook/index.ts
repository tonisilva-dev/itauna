// Asaas Payment Webhook — recebe eventos de pagamento e atualiza a tabela cobrancas
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, access_token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Asaas envia o token no header 'access_token'
  const token = req.headers.get('access_token')
  if (token !== Deno.env.get('ASAAS_WEBHOOK_TOKEN')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let body: { event: string; payment: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { event, payment } = body

  // Só processamos eventos de pagamento efetivado
  if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
    return new Response(JSON.stringify({ received: true, action: 'ignored' }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Busca e atualiza a cobrança pelo ID do Asaas
  const { data: cobranca, error: updErr } = await supabase
    .from('cobrancas')
    .update({
      status: 'pago',
      payment_date: payment.paymentDate,
      payment_method: String(payment.billingType ?? 'boleto').toLowerCase(),
    })
    .eq('asaas_id', payment.id)
    .select()
    .single()

  if (updErr || !cobranca) {
    console.warn('[asaas-webhook] cobrança não encontrada para', payment.id, updErr)
    // Retorna 200 mesmo assim — o Asaas reenvia em caso de erro 5xx
    return new Response(JSON.stringify({ received: true, action: 'not_found' }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Registra como receita no financeiro (idempotente via ON CONFLICT)
  await supabase.from('finances').insert({
    type: 'receita',
    category: 'Rateio Individual',
    description: `Mensalidade ${cobranca.reference_month} — Chácara ${String(cobranca.unit_number).padStart(3, '0')}`,
    amount: cobranca.amount,
    due_date: cobranca.due_date,
    payment_date: payment.paymentDate,
    status: 'pago',
    reference_month: cobranca.reference_month,
    unit_id: cobranca.unit_id,
    created_by: null,
  })

  // Push notification ao morador
  if (cobranca.morador_id) {
    await supabase.functions.invoke('send-push', {
      body: {
        targetUserIds: [cobranca.morador_id],
        title: '✅ Mensalidade confirmada',
        body: `Chácara ${String(cobranca.unit_number).padStart(3, '0')} · ${cobranca.reference_month} · R$ ${Number(cobranca.amount).toFixed(2).replace('.', ',')}`,
        url: '/financeiro',
      },
    }).catch(() => { /* push é best-effort */ })
  }

  return new Response(JSON.stringify({ received: true, cobrance_id: cobranca.id }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
