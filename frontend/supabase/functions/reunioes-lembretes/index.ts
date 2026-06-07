// reunioes-lembretes — Cron job: envia lembretes de reuniões futuras
// Schedule: a cada hora via Supabase Dashboard → Edge Functions → Schedule
// Ou via pg_cron: SELECT cron.schedule('reunioes-lembretes','0 * * * *','select net.http_post(...)');
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

function formatDatePtBR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now   = new Date()

  // Busca reuniões agendadas (não canceladas, não encerradas)
  const { data: meetings } = await admin
    .from('meetings')
    .select('id, title, scheduled_at, meet_link, duration_min')
    .eq('status', 'scheduled')
    .gt('scheduled_at', now.toISOString())

  if (!meetings?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })

  const results: { meeting_id: string; tipo: string }[] = []

  for (const m of meetings) {
    const diff = new Date(m.scheduled_at).getTime() - now.getTime()
    const horas = diff / 3_600_000

    // Janelas: D-7 (168h ±1h), D-1 (24h ±1h), D-0 (2h ±1h)
    const isD7 = horas >= 167 && horas <= 169
    const isD1 = horas >= 23  && horas <= 25
    const isD0 = horas >= 1   && horas <= 3

    if (!isD7 && !isD1 && !isD0) continue

    const tipo    = isD7 ? 'D-7' : isD1 ? 'D-1' : 'D-0'
    const urgente = isD0 || isD1

    // Checa se já foi enviado este tipo de lembrete
    const { count } = await admin.from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', m.id)
      .eq('channel', 'push')
      .contains('metadata', { tipo })

    if ((count ?? 0) > 0) continue

    // Dispara notificações via send-push
    const title = urgente ? `⏰ Reunião em breve — ${tipo}` : `📅 Lembrete de reunião — ${tipo}`
    const body  = `${m.title} · ${formatDatePtBR(m.scheduled_at)}`

    await admin.functions.invoke('send-push', {
      body: { title, body, url: '/reunioes', broadcast: true },
    }).catch(() => {})

    // Loga para evitar reenvio
    await admin.from('notification_log').insert({
      meeting_id: m.id,
      channel:    'push',
      status:     'sent',
      metadata:   { tipo, broadcast: true },
    })

    results.push({ meeting_id: m.id, tipo })
  }

  // Encerra reuniões que já passaram do horário de término
  const { data: encerrar } = await admin
    .from('meetings')
    .select('id, scheduled_at, duration_min')
    .eq('status', 'scheduled')
    .lt('scheduled_at', now.toISOString())

  for (const m of encerrar ?? []) {
    const fim = new Date(m.scheduled_at).getTime() + (m.duration_min ?? 60) * 60_000
    if (fim < now.getTime() - 30 * 60_000) { // 30min de tolerância
      await admin.from('meetings').update({ status: 'done' }).eq('id', m.id)
    }
  }

  return new Response(JSON.stringify({ sent: results.length, lembretes: results }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
