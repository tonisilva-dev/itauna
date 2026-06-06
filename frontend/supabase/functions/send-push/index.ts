/**
 * Edge Function: send-push
 * Recebe { title, body, url?, targetUserIds? } e envia Web Push
 * para todos os dispositivos inscritos (ou apenas para targetUserIds).
 *
 * Variáveis de ambiente necessárias no Supabase Dashboard:
 *   VAPID_PUBLIC_KEY   — chave pública VAPID (base64url)
 *   VAPID_PRIVATE_KEY  — chave privada VAPID (base64url)
 *   VAPID_SUBJECT      — mailto: ou https: do remetente
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC     = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE    = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@itauna.org';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

/* ── VAPID JWT helpers (sem dependência externa) ── */
function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function buildVapidJwt(audience: string): Promise<{ auth: string; key: string }> {
  const privateKeyBytes = urlBase64ToUint8Array(VAPID_PRIVATE);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', privateKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  ).catch(async () =>
    // Fallback: tenta como pkcs8 se der erro em raw
    crypto.subtle.importKey(
      'pkcs8', privateKeyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    )
  );

  const header  = base64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now     = Math.floor(Date.now() / 1000);
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    aud: audience, exp: now + 43200, sub: VAPID_SUBJECT,
  })));
  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig      = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey as CryptoKey, sigInput);
  const jwt      = `${header}.${payload}.${base64url(sig)}`;

  return { auth: `vapid t=${jwt},k=${VAPID_PUBLIC}`, key: VAPID_PUBLIC };
}

/* ── Encrypt payload (Web Push encryption — RFC 8291) ── */
async function encryptPayload(
  sub: { endpoint: string; p256dh: string; auth: string },
  plaintext: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const clientPublicKey = urlBase64ToUint8Array(sub.p256dh);
  const clientAuth      = urlBase64ToUint8Array(sub.auth);
  const salt            = crypto.getRandomValues(new Uint8Array(16));

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey }, serverKeyPair.privateKey, 256
  );

  // HKDF extract + expand (simplified for Web Push)
  const prk = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']);

  const authInfo = enc.encode('Content-Encoding: auth\0');
  const authBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: clientAuth, info: authInfo }, prk, 256
  );

  const context = new Uint8Array([
    ...enc.encode('P-256\0'),
    0, 65, ...clientPublicKey,
    0, 65, ...serverPublicKeyRaw,
  ]);

  const keyInfo = new Uint8Array([...enc.encode('Content-Encoding: aesgcm\0'), ...context]);
  const nonceInfo = new Uint8Array([...enc.encode('Content-Encoding: nonce\0'), ...context]);

  const prk2 = await crypto.subtle.importKey('raw', authBits, 'HKDF', false, ['deriveBits']);
  const [keyBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prk2, 128),
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prk2, 96),
  ]);

  const aesKey = await crypto.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['encrypt']);
  const msg = enc.encode(plaintext);
  const padded = new Uint8Array([0, 0, ...msg]); // 2-byte padding length
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, aesKey, padded)
  );

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

/* ── Envia uma notificação para uma subscription ── */
async function sendToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object
): Promise<boolean> {
  try {
    const origin   = new URL(sub.endpoint).origin;
    const { auth } = await buildVapidJwt(origin);
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(sub, JSON.stringify(payload));

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization':    auth,
        'Content-Type':     'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption':       `salt=${base64url(salt.buffer)}`,
        'Crypto-Key':       `dh=${base64url(serverPublicKey.buffer)}`,
        'TTL':              '86400',
      },
      body: ciphertext,
    });

    if (res.status === 410 || res.status === 404) {
      // Subscription expirada — remove do banco
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
    return res.ok || res.status === 201;
  } catch {
    return false;
  }
}

/* ── Handler principal ── */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const { title, body, url, targetUserIds } = await req.json() as {
      title: string; body: string; url?: string; targetUserIds?: string[];
    };

    let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth');
    if (targetUserIds?.length) query = query.in('user_id', targetUserIds);
    const { data: subs } = await query;
    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

    const payload = { title, body, url: url ?? '/', icon: '/logo-itauna.png', badge: '/logo-itauna.png' };
    const results = await Promise.allSettled(subs.map(s => sendToSubscription(s, payload)));
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
