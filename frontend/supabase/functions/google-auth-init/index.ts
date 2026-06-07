// google-auth-init — Retorna URL de autorização OAuth 2.0 Google Calendar
// Chamada pelo frontend (gestor) para iniciar o fluxo de conexão com Google
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Valida gestor
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

  const clientId    = Deno.env.get('GOOGLE_CLIENT_ID')!
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    ?? `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-auth-callback`

  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',   // força refresh_token mesmo se já autorizado
    state: user.id,      // para verificar que é o gestor autorizando
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  return new Response(JSON.stringify({ authUrl }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
