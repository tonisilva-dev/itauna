// Biometric authentication via WebAuthn Platform Authenticator.
// A digital NUNCA sai do dispositivo — armazenada no secure enclave (Keychain/TPM).
// A biometria é usada apenas como "portão local" antes de renovar a sessão Supabase.

const STATE_KEY   = 'itauna:bio:state';
const OFFERED_KEY = 'itauna:bio:offered';

export interface BiometricState {
  enabled:        boolean;
  enabledAt?:     string;
  lastUsed?:      string;
  userId?:        string;
  email?:         string;
  credentialId?:  string; // base64 do rawId
  accessToken?:   string; // renovado a cada sessão
  refreshToken?:  string; // renovado a cada uso — one-time rotation
}

export function getBiometricState(): BiometricState {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') ?? { enabled: false };
  } catch {
    return { enabled: false };
  }
}

function patchState(patch: Partial<BiometricState>): void {
  localStorage.setItem(STATE_KEY, JSON.stringify({ ...getBiometricState(), ...patch }));
}

export function clearBiometric(): void {
  localStorage.removeItem(STATE_KEY);
}

/** Apaga apenas os tokens de sessão, preservando a configuração biométrica (credencial, e-mail, etc.). */
export function clearBiometricTokens(): void {
  const s = getBiometricState();
  if (!s.enabled) return;
  const { accessToken: _a, refreshToken: _r, ...rest } = s;
  localStorage.setItem(STATE_KEY, JSON.stringify(rest));
}

export function hasShownOffer(): boolean {
  return localStorage.getItem(OFFERED_KEY) === '1';
}

export function markOfferShown(): void {
  localStorage.setItem(OFFERED_KEY, '1');
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function randBytes(n: number): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(n)).buffer as ArrayBuffer;
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// Registra uma passkey de plataforma após o primeiro login com senha.
export async function registerBiometric(userId: string, displayName: string, email: string): Promise<boolean> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: randBytes(32),
        rp: { name: 'Condomínio Itaúna', id: window.location.hostname },
        user: {
          id:          new TextEncoder().encode(userId).buffer as ArrayBuffer,
          name:        displayName,
          displayName: displayName,
        },
        pubKeyCredParams: [
          { alg: -7,   type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification:        'required',
          residentKey:             'preferred',
        },
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;

    if (!cred) return false;

    patchState({
      enabled:      true,
      enabledAt:    new Date().toISOString(),
      userId,
      email,
      credentialId: toB64(cred.rawId),
    });
    return true;
  } catch {
    return false;
  }
}

// Armazena tokens Supabase no estado biométrico (chamado após login e após TOKEN_REFRESHED).
export function storeSessionTokens(accessToken: string, refreshToken: string): void {
  patchState({ accessToken, refreshToken });
}

// Autentica com a passkey registrada. Retorna true se o SO validou a biometria.
export async function verifyBiometric(): Promise<boolean> {
  const state = getBiometricState();
  if (!state.enabled || !state.credentialId) return false;

  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: randBytes(32),
        allowCredentials: [{
          type:       'public-key',
          id:         fromB64(state.credentialId).buffer as ArrayBuffer,
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout:          60_000,
      },
    }) as PublicKeyCredential | null;

    if (!cred) return false;

    patchState({ lastUsed: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}
