// Geração de Ata de Reunião — Groq (gratuito, Llama 3.3 70B)
// Entrada: { meeting_id }
// Saída:   { ata: string, meeting_title: string }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Auth: apenas gestores
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
  const { data: profile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'sindico', 'assistente'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { meeting_id } = await req.json() as { meeting_id: string }
  if (!meeting_id) {
    return new Response(JSON.stringify({ error: 'meeting_id obrigatório' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const [{ data: meeting }, { data: agenda }, { data: rsvps }] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', meeting_id).single(),
    supabase.from('agenda_items').select('*').eq('meeting_id', meeting_id).order('position'),
    supabase.from('meeting_rsvp')
      .select('response, profiles(full_name, unit_number)')
      .eq('meeting_id', meeting_id),
  ])

  if (!meeting) {
    return new Response(JSON.stringify({ error: 'Reunião não encontrada' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const confirmed  = (rsvps ?? []).filter((r: any) => r.response === 'confirmed')
  const totalRsvps = (rsvps ?? []).length

  const contexto = `
REUNIÃO: ${meeting.title}
DATA: ${new Date(meeting.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
HORÁRIO: ${new Date(meeting.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
DURAÇÃO PREVISTA: ${meeting.duration_min} minutos
CONDOMÍNIO: Chácaras Itaúna — Ibiporã, PR

PRESENÇA:
- Confirmados: ${confirmed.length} de ${totalRsvps} convocados
${confirmed.map((r: any) => `  • ${r.profiles?.full_name ?? 'Não identificado'} (Chácara ${r.profiles?.unit_number ?? '—'})`).join('\n')}

PAUTA E DELIBERAÇÕES:
${(agenda ?? []).map((item: any, i: number) => `
${i + 1}. ${item.title}
   Situação: ${{ pending: 'Pendente', approved: 'APROVADO', rejected: 'REJEITADO', deferred: 'ADIADO' }[item.status as string] ?? item.status}
   ${item.description ? `Descrição: ${item.description}` : ''}
   ${item.notes ? `Notas/Decisão: ${item.notes}` : ''}
`).join('')}
`.trim()

  const prompt = `Você é o secretário do Condomínio de Chácaras Itaúna. Redija a ata oficial desta reunião em português formal e direto, seguindo o padrão jurídico brasileiro.

Regras:
- Use linguagem formal de ata condominial (sem gírias, sem informalidades)
- Estruture: Abertura → Verificação de quórum → Pauta item por item → Encerramento
- Para cada item de pauta, registre a deliberação final (aprovado/rejeitado/adiado) e, se houver notas, incorpore-as como decisão tomada
- Inclua espaço para assinaturas no final (síndico + secretário)
- Não invente informações além do que foi fornecido
- Saída somente em Markdown limpo

Dados da reunião:
${contexto}`

  // Groq — API compatível com OpenAI, sem SDK necessário
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  })

  if (!groqRes.ok) {
    const err = await groqRes.text()
    console.error('[gerar-ata] Groq error:', err)
    return new Response(JSON.stringify({ error: 'Falha ao chamar Groq API', detail: err }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const groqData = await groqRes.json()
  const ata = groqData?.choices?.[0]?.message?.content ?? ''

  return new Response(JSON.stringify({ ata, meeting_title: meeting.title }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
