// criar-reuniao — Agenda reunião no Supabase + Google Calendar + envia notificações
// POST /functions/v1/criar-reuniao
// Body: { title, description?, scheduled_at (ISO), duration_min?, agenda_items?: string[] }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ─── Crypto helpers ─────────────────────────────────────────── */
async function getKey(keyHex: string): Promise<CryptoKey> {
  const bytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
async function decrypt(cipherB64: string, keyHex: string): Promise<string> {
  const key = await getKey(keyHex)
  const combined = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, key, combined.slice(12))
  return new TextDecoder().decode(plain)
}
async function encrypt(plain: string, keyHex: string): Promise<string> {
  const key = await getKey(keyHex)
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  const combined = new Uint8Array(12 + enc.byteLength)
  combined.set(iv); combined.set(new Uint8Array(enc), 12)
  return btoa(String.fromCharCode(...combined))
}

/* ─── Google Calendar helpers ────────────────────────────────── */
async function getAccessToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const encKey = Deno.env.get('TOKEN_ENCRYPTION_KEY')!
  const { data } = await supabase.from('google_tokens').select('*').eq('account', 'itauna').single()
  if (!data) throw new Error('Google Calendar não conectado. Acesse Reuniões → Conectar Google.')

  // Renova se expirado (margem de 5 min)
  if (!data.expiry_date || data.expiry_date < Date.now() + 300_000) {
    const refreshToken = await decrypt(data.refresh_token, encKey)
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })
    const tokens = await res.json()
    const newAccess = await encrypt(tokens.access_token, encKey)
    await supabase.from('google_tokens').update({
      access_token: newAccess,
      expiry_date:  Date.now() + (tokens.expires_in ?? 3600) * 1000,
      updated_at:   new Date().toISOString(),
    }).eq('account', 'itauna')
    return tokens.access_token
  }

  return await decrypt(data.access_token, encKey)
}

async function createGoogleMeet(accessToken: string, title: string, description: string, startIso: string, durationMin: number) {
  const start = new Date(startIso)
  const end   = new Date(start.getTime() + durationMin * 60_000)

  const body = {
    summary:     title,
    description: description || '',
    start:  { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
    end:    { dateTime: end.toISOString(),   timeZone: 'America/Sao_Paulo' },
    conferenceData: {
      createRequest: {
        requestId: `itauna-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )
  return res.json()
}

/* ─── Main ───────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Valida role gestor
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!prof || !['admin','sindico','assistente'].includes(prof.role)) {
    return new Response('Forbidden', { status: 403, headers: CORS })
  }

  const { title, description = '', scheduled_at, duration_min = 60, agenda_items = [] } = await req.json()
  if (!title || !scheduled_at) {
    return new Response(JSON.stringify({ error: 'title e scheduled_at são obrigatórios' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 1. Cria reunião no Supabase (sem meet_link ainda)
  const { data: meeting, error: mErr } = await admin.from('meetings').insert({
    title, description, scheduled_at, duration_min, created_by: user.id, status: 'scheduled',
  }).select().single()
  if (mErr || !meeting) {
    return new Response(JSON.stringify({ error: mErr?.message ?? 'DB error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 2. Insere itens de pauta
  if (agenda_items.length > 0) {
    await admin.from('agenda_items').insert(
      agenda_items.map((title: string, i: number) => ({
        meeting_id: meeting.id, position: i + 1, title,
      }))
    )
  }

  // 3. Tenta criar evento Google Calendar (graceful degradation se não conectado)
  let meetLink: string | null = null
  let googleEventId: string | null = null
  try {
    const accessToken = await getAccessToken(admin)
    const calEvent    = await createGoogleMeet(accessToken, title, description, scheduled_at, duration_min)
    meetLink       = calEvent.conferenceData?.entryPoints?.[0]?.uri ?? null
    googleEventId  = calEvent.id ?? null

    if (meetLink) {
      await admin.from('meetings').update({ meet_link: meetLink, google_event_id: googleEventId }).eq('id', meeting.id)
    }
  } catch (err) {
    console.warn('[criar-reuniao] Google Calendar indisponível:', err)
    // Continua sem o link — gestor pode conectar depois
  }

  // 4. Notifica todos os moradores ativos por push + email
  try {
    await admin.functions.invoke('reunioes-notificar', {
      body: { meeting_id: meeting.id, event: 'reuniao_agendada' },
    })
  } catch { /* notificações são best-effort */ }

  return new Response(JSON.stringify({ ...meeting, meet_link: meetLink }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
