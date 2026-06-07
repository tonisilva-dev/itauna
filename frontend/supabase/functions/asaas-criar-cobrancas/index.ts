// Asaas — Criar Cobranças Mensais
// Chamada pelo gestor via frontend: POST /functions/v1/asaas-criar-cobrancas
// Body: { reference_month: 'YYYY-MM', due_day: number, amount_override?: number }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_BASE = Deno.env.get('ASAAS_SANDBOX') === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

async function asaasFetch(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'access_token': Deno.env.get('ASAAS_API_KEY')!,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function getOrCreateCustomer(
  cpf: string, name: string, email: string, phone: string | null, externalRef: string
): Promise<string> {
  // Tenta encontrar cliente existente pelo CPF
  const existing = await asaasFetch(`/customers?cpfCnpj=${cpf}`)
  if (existing.data?.length > 0) return existing.data[0].id

  // Cria novo cliente
  const created = await asaasFetch('/customers', 'POST', {
    name,
    cpfCnpj: cpf,
    email,
    phone: phone ?? undefined,
    externalReference: externalRef,
  })
  return created.id
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Valida usuário autenticado e role gestor
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['admin', 'sindico', 'assistente'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { reference_month, due_day = 10, amount_override } = await req.json()
  if (!reference_month || !/^\d{4}-\d{2}$/.test(reference_month)) {
    return new Response(JSON.stringify({ error: 'reference_month inválido (YYYY-MM)' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const [year, month] = reference_month.split('-').map(Number)
  const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(due_day).padStart(2, '0')}`

  // Busca unidades com moradores ativos
  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: units, error: unitsErr } = await adminSupabase
    .from('units')
    .select('id, unit_number, monthly_fee, owner_id, profiles!owner_id(id, full_name, email, phone, cpf)')
    .eq('status', 'regular')

  if (unitsErr) {
    return new Response(JSON.stringify({ error: unitsErr.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const results: Array<{ unit_number: number; status: string; cobranca_id?: string; error?: string }> = []

  for (const unit of (units ?? [])) {
    const profile = Array.isArray(unit.profiles) ? unit.profiles[0] : unit.profiles
    if (!profile) {
      results.push({ unit_number: unit.unit_number, status: 'sem_morador' })
      continue
    }

    // Verifica se já existe cobrança para este mês
    const { data: existing } = await adminSupabase
      .from('cobrancas')
      .select('id, status, asaas_id')
      .eq('unit_number', unit.unit_number)
      .eq('reference_month', reference_month)
      .single()

    if (existing?.asaas_id) {
      results.push({ unit_number: unit.unit_number, status: 'ja_existe', cobranca_id: existing.id })
      continue
    }

    const amount = amount_override ?? unit.monthly_fee ?? 120

    try {
      // Obtém ou cria cliente no Asaas
      const customerId = await getOrCreateCustomer(
        profile.cpf ?? '00000000000',
        profile.full_name ?? `Chácara ${unit.unit_number}`,
        profile.email,
        profile.phone,
        `unit-${unit.unit_number}`
      )

      // Cria cobrança no Asaas (boleto + PIX simultaneamente)
      const payment = await asaasFetch('/payments', 'POST', {
        customer: customerId,
        billingType: 'UNDEFINED', // permite boleto ou PIX à escolha do pagador
        value: amount,
        dueDate,
        description: `Mensalidade condominial ${reference_month} — Chácara ${String(unit.unit_number).padStart(3, '0')}`,
        externalReference: `cob-${unit.unit_number}-${reference_month}`,
        postalService: false,
      })

      if (!payment.id) throw new Error(`Asaas error: ${JSON.stringify(payment)}`)

      // Persiste / atualiza no banco
      const cobRow = {
        unit_number: unit.unit_number,
        unit_id: unit.id,
        morador_id: profile.id,
        reference_month,
        amount,
        due_date: dueDate,
        status: 'pendente',
        asaas_id: payment.id,
        asaas_customer_id: customerId,
        asaas_invoice_url: payment.invoiceUrl ?? null,
        asaas_pix_qrcode: payment.pixQrCode?.encodedImage ?? null,
        asaas_pix_payload: payment.pixQrCode?.payload ?? null,
      }

      if (existing) {
        await adminSupabase.from('cobrancas').update(cobRow).eq('id', existing.id)
        results.push({ unit_number: unit.unit_number, status: 'atualizado', cobranca_id: existing.id })
      } else {
        const { data: inserted } = await adminSupabase
          .from('cobrancas').insert(cobRow).select('id').single()
        results.push({ unit_number: unit.unit_number, status: 'criado', cobranca_id: inserted?.id })
      }
    } catch (err) {
      console.error('[asaas-criar] unit', unit.unit_number, err)
      results.push({ unit_number: unit.unit_number, status: 'erro', error: String(err) })
    }
  }

  return new Response(JSON.stringify({ reference_month, results }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
