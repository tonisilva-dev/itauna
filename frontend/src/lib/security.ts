/**
 * security.ts — Camadas de proteção frontend
 * ─────────────────────────────────────────────
 * 1. Sanitização de inputs (XSS prevention)
 * 2. Rate limiting em memória (brute-force login)
 * 3. Validação de e-mail / telefone / texto
 * 4. Helpers LGPD (consentimento, anonimização)
 */

/* ── 1. Sanitização XSS ──────────────────────────────────────── */

/** Remove tags HTML e caracteres perigosos de uma string */
export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/** Sanitiza um objeto inteiro (shallow) */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const key in obj) {
    const val = obj[key];
    result[key] = typeof val === 'string' ? (sanitize(val) as unknown as T[typeof key]) : val;
  }
  return result;
}

/* ── 2. Rate Limiting em memória ─────────────────────────────── */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
  blockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Verifica e incrementa o rate limit para uma chave (ex: 'login:email@x.com').
 * @param key    Identificador único (ação + usuário)
 * @param limit  Máximo de tentativas permitidas
 * @param windowMs  Janela de tempo em ms (default: 15 minutos)
 * @param blockMs   Tempo de bloqueio após exceder (default: 30 minutos)
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
  blockMs  = 30 * 60 * 1000,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  // Entrada expirada → reset
  if (entry && now - entry.firstAttempt > windowMs && !entry.blocked) {
    entry = undefined;
    rateLimitStore.delete(key);
  }

  if (!entry) {
    entry = { count: 0, firstAttempt: now, blocked: false, blockedUntil: 0 };
    rateLimitStore.set(key, entry);
  }

  // Bloqueado?
  if (entry.blocked) {
    if (now < entry.blockedUntil) {
      return { allowed: false, remaining: 0, retryAfterMs: entry.blockedUntil - now };
    }
    // Desbloqueado — reset
    entry.count = 0;
    entry.firstAttempt = now;
    entry.blocked = false;
    entry.blockedUntil = 0;
  }

  entry.count++;

  if (entry.count > limit) {
    entry.blocked = true;
    entry.blockedUntil = now + blockMs;
    return { allowed: false, remaining: 0, retryAfterMs: blockMs };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

/** Reseta o rate limit de uma chave (após login bem-sucedido) */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/* ── 3. Validações ───────────────────────────────────────────── */

export const validators = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),

  phone: (v: string) => /^(\(?\d{2}\)?\s?)(\d{4,5}-?\d{4})$/.test(v.replace(/\s/g, '')),

  cpf: (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const calc = (digits: string, len: number) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i);
      const rem = (sum * 10) % 11;
      return rem === 10 || rem === 11 ? 0 : rem;
    };
    return calc(d, 9) === parseInt(d[9]) && calc(d, 10) === parseInt(d[10]);
  },

  minLength: (v: string, min: number) => v.trim().length >= min,

  maxLength: (v: string, max: number) => v.trim().length <= max,

  noSqlInjection: (v: string) => {
    const pattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|--|;|\/\*|\*\/)/i;
    return !pattern.test(v);
  },

  password: (v: string) => ({
    valid: v.length >= 8,
    hasUpper: /[A-Z]/.test(v),
    hasNumber: /\d/.test(v),
    hasSpecial: /[^A-Za-z0-9]/.test(v),
    length: v.length,
    strength: v.length >= 12 && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v) ? 'forte'
            : v.length >= 8 ? 'média' : 'fraca',
  }),
};

/* ── 4. LGPD — Consentimento ─────────────────────────────────── */

const CONSENT_KEY = 'itauna_lgpd_consent';

export interface LgpdConsent {
  granted: boolean;
  timestamp: number;
  version: string;  // versão da política de privacidade
}

export const lgpd = {
  /** Verifica se o usuário já deu consentimento */
  hasConsent(): boolean {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return false;
      const c: LgpdConsent = JSON.parse(raw);
      return c.granted === true;
    } catch {
      return false;
    }
  },

  /** Registra o consentimento do usuário */
  grantConsent(version = '1.0'): void {
    const consent: LgpdConsent = { granted: true, timestamp: Date.now(), version };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  },

  /** Revoga o consentimento e limpa dados locais */
  revokeConsent(): void {
    localStorage.removeItem(CONSENT_KEY);
    // Limpa outros dados de preferência (não tokens de sessão)
    const keysToRemove = Object.keys(localStorage).filter(
      k => k.startsWith('itauna_pref_')
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
  },

  /** Anonimiza um nome para exibição pública */
  anonymizeName(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '***';
    return parts[0] + (parts.length > 1 ? ' ' + parts[parts.length - 1][0] + '.' : '');
  },

  /** Mascara um e-mail para exibição */
  maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return '***';
    const visible = user.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(2, user.length - 2))}@${domain}`;
  },

  /** Mascara um telefone */
  maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) return '****';
    return digits.slice(0, 2) + ' ****-' + digits.slice(-4);
  },
};

/* ── 5. Content Security Policy (meta tag) ───────────────────── */

/**
 * Injeta a meta tag CSP no <head> (chamada em main.tsx).
 * Reforça no lado cliente enquanto o servidor não tem header próprio.
 */
export function injectCSPMeta(): void {
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
  document.head.appendChild(meta);
}
