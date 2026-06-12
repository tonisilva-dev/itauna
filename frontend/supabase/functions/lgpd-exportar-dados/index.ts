// LGPD Art. 18 — Portabilidade: exporta todos os dados do titular autenticado
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('authorization') ?? ''
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: authHeader } } }
  )

  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const uid = user.id

  // Coleta todos os dados do titular em paralelo
  const [
    { data: perfil },
    { data: cobrancas },
    { data: agendamentos },
    { data: ocorrencias },
    { data: eventos },
    { data: classificados },
    { data: achados },
    { data: convites },
    { data: solicitacoes },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name,email,phone,unit_number,role,created_at').eq('id', uid).single(),
    supabase.from('cobrancas').select('reference_month,amount,status,payment_date,payment_method,due_date').eq('morador_id', uid),
    supabase.from('bookings').select('area_id,date,start_time,end_time,status,created_at').eq('user_id', uid),
    supabase.from('incidents').select('title,category,priority,status,created_at').eq('user_id', uid),
    supabase.from('event_inscricoes').select('event_id,created_at').eq('user_id', uid),
    supabase.from('classificados').select('title,category,price,status,created_at').eq('user_id', uid),
    supabase.from('achados_perdidos').select('tipo,descricao,local,status,created_at').eq('user_id', uid),
    supabase.from('portaria_convites').select('visitante_nome,data_visita,status,created_at').eq('morador_id', uid),
    supabase.from('lgpd_solicitacoes').select('tipo,status,created_at,processado_em').eq('user_id', uid),
  ])

  const exportData = {
    exportado_em: new Date().toISOString(),
    base_legal: 'LGPD Art. 18, V — Portabilidade dos dados a outro fornecedor',
    controlador: 'Condomínio de Chácaras Itaúna — Ibiporã, PR',
    titular: perfil,
    dados: {
      cobrancas:    cobrancas    ?? [],
      agendamentos: agendamentos ?? [],
      ocorrencias:  ocorrencias  ?? [],
      inscricoes_eventos: eventos ?? [],
      classificados: classificados ?? [],
      achados_perdidos: achados ?? [],
      convites_visitantes: convites ?? [],
      solicitacoes_lgpd: solicitacoes ?? [],
    },
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="meus-dados-itauna-${new Date().toISOString().slice(0,10)}.json"`,
    },
  })
})
