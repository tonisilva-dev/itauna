// google-auth-callback — Recebe o code do Google, troca por tokens e armazena criptografado
// URL de redirect registrada no Google Cloud Console:
//   https://dokenybeazecjsszrbeo.supabase.co/functions/v1/google-auth-callback
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ─── AES-GCM (Web Crypto API — disponível no Deno) ─────────── */
async function getKey(keyHex: string): Promise<CryptoKey> {
  const bytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(plain: string, keyHex: string): Promise<string> {
  const key = await getKey(keyHex)
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  const combined = new Uint8Array(12 + enc.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(enc), 12)
  return btoa(String.fromCharCode(...combined))
}

serve(async (req) => {
  const url    = new URL(req.url)
  const code   = url.searchParams.get('code')
  const error  = url.searchParams.get('error')

  const FRONTEND = Deno.env.get('FRONTEND_URL') ?? 'https://www.itauna.org'

  if (error || !code) {
    return Response.redirect(`${FRONTEND}/reunioes?google_error=${error ?? 'no_code'}`)
  }

  const clientId     = Deno.env.get('GOOGLE_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!
  const redirectUri  = Deno.env.get('GOOGLE_REDIRECT_URI')
    ?? `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-auth-callback`
  const encKey = Deno.env.get('TOKEN_ENCRYPTION_KEY')!

  // Troca o authorization code por access_token + refresh_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()

  if (!tokens.refresh_token) {
    return Response.redirect(`${FRONTEND}/reunioes?google_error=no_refresh_token`)
  }

  // Armazena tokens criptografados no Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  await supabase.from('google_tokens').upsert({
    account:       'itauna',
    access_token:  await encrypt(tokens.access_token, encKey),
    refresh_token: await encrypt(tokens.refresh_token, encKey),
    expiry_date:   Date.now() + (tokens.expires_in ?? 3600) * 1000,
    updated_at:    new Date().toISOString(),
  }, { onConflict: 'account' })

  return Response.redirect(`${FRONTEND}/reunioes?google_connected=true`)
})
