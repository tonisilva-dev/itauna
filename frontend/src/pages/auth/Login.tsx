import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ChevronRight, AlertCircle, Bell, Fingerprint,
} from 'lucide-react';
import { checkRateLimit, resetRateLimit, sanitize } from '../../lib/security';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  isBiometricAvailable, getBiometricState, registerBiometric,
  verifyBiometric, clearBiometric, hasShownOffer, markOfferShown, storeSessionTokens,
} from '@/lib/biometric';

/* ─────────────────────────────────────────────────────────────
   SPINNER
   ───────────────────────────────────────────────────────────── */
const DotsSpinner = () => {
  const dots = Array.from({ length: 8 });
  return (
    <div style={{ position: 'relative', width: 44, height: 44 }}>
      {dots.map((_, i) => (
        <span key={i} style={{
          position: 'absolute', width: 4, height: 4, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', top: '50%', left: '50%',
          transform: `rotate(${i * 45}deg) translate(0, -18px)`,
          transformOrigin: '50% 50%',
          animation: `dot-fade 1s ${i * 0.125}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`@keyframes dot-fade{0%,100%{opacity:.12}50%{opacity:1}}`}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TELA DE PROGRESSÃO
   ───────────────────────────────────────────────────────────── */
const ProgressScreen = ({ label = 'Entrando...' }: { label?: string }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 24,
    background: 'rgba(30,35,48,0.72)',
    backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
    animation: 'prog-in 0.3s ease-out forwards',
  }}>
    <style>{`@keyframes prog-in{from{opacity:0}to{opacity:1}}`}</style>
    <DotsSpinner />
    <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 'clamp(15px,3.5vw,18px)', fontWeight: 600 }}>
      {label}
    </p>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   AUTOCOMPLETE DE E-MAIL
   ───────────────────────────────────────────────────────────── */
const DOMAINS = ['gmail.com', 'itauna.org', 'hotmail.com', 'outlook.com', 'yahoo.com.br'];

const EmailInput = ({ value, onChange, inputRef }: {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) => {
  const [list, setList] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const handleChange = (v: string) => {
    if (v.trim().toLowerCase() === 'admin') { onChange('admin@itauna.org'); setOpen(false); return; }
    onChange(v);
    const at = v.indexOf('@');
    if (at !== -1) {
      const typed = v.slice(at + 1).toLowerCase();
      const filtered = DOMAINS.filter(d => d.startsWith(typed) && d !== typed);
      setList(filtered.map(d => `${v.slice(0, at + 1)}${d}`));
      setOpen(filtered.length > 0);
    } else setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef} type="email" placeholder="seu@email.com"
        value={value} onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="email" required className="login-input" style={inputStyle}
      />
      {open && (
        <ul style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
          zIndex: 50, borderRadius: 10, overflow: 'hidden',
          background: 'rgba(20,28,46,0.97)',
          border: '1px solid rgba(87,216,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', listStyle: 'none',
        }}>
          {list.map(s => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.8)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(87,216,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s.split('@')[0]}<span style={{ color: '#57d8ff' }}>@{s.split('@')[1]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ESTILOS BASE
   ───────────────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.38)',
  border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8,
  padding: '13px 18px', color: '#fff', fontSize: 15,
  outline: 'none', transition: 'all 0.2s', caretColor: '#57d8ff',
  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
};

const btnDark: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(100,92,85,0.62)',
  backdropFilter: 'blur(10px)', color: '#fff',
  fontWeight: 700, fontSize: 15, cursor: 'pointer',
  transition: 'all 0.2s', letterSpacing: '0.01em',
  boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

/* ─────────────────────────────────────────────────────────────
   ÍCONE BIOMÉTRICO ANIMADO
   ───────────────────────────────────────────────────────────── */
type BioScan = 'idle' | 'scanning' | 'success' | 'fail';

const BioIcon = ({ scan, size = 28 }: { scan: BioScan; size?: number }) => {
  const color = {
    idle:     'rgba(255,255,255,0.7)',
    scanning: '#57d8ff',
    success:  '#10b981',
    fail:     '#ef4444',
  }[scan];
  return (
    <>
      <style>{`
        @keyframes bio-ring  { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
        @keyframes bio-idle  { 0%,100%{opacity:.55} 50%{opacity:1} }
      `}</style>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {scan === 'scanning' && (
          <span style={{
            position: 'absolute', width: size, height: size, borderRadius: '50%',
            border: '1.5px solid #57d8ff',
            animation: 'bio-ring 1.1s ease-out infinite',
          }} />
        )}
        <Fingerprint
          size={size} color={color} strokeWidth={1.5}
          style={{
            transition: 'color 0.3s',
            animation: scan === 'idle' ? 'bio-idle 2.5s ease-in-out infinite' : 'none',
          }}
        />
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   MODAL DE CONVITE BIOMÉTRICO — opt-in, exibido 1x por dispositivo
   ───────────────────────────────────────────────────────────── */
const EnrollModal = ({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    background: 'rgba(8,13,24,0.65)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    animation: 'enroll-in 0.3s ease-out forwards',
  }}>
    <style>{`@keyframes enroll-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}`}</style>
    <div style={{
      width: '100%', maxWidth: 340,
      background: 'linear-gradient(160deg, rgba(16,22,38,0.97), rgba(10,14,26,0.99))',
      border: '1px solid rgba(87,216,255,0.15)',
      borderRadius: 22, padding: '32px 28px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(87,216,255,0.08)', border: '1px solid rgba(87,216,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Fingerprint size={32} color="#57d8ff" strokeWidth={1.4} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Acesso mais rápido</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
          Use sua digital ou Face ID para entrar sem digitar a senha.{' '}
          Sua biometria <strong style={{ color: 'rgba(255,255,255,0.8)' }}>nunca é armazenada</strong> no app — apenas no seu dispositivo.
        </p>
      </div>

      <button onClick={onAccept} style={{
        ...btnDark, marginTop: 4,
        background: 'linear-gradient(135deg, rgba(87,216,255,0.2), rgba(100,164,255,0.15))',
        border: '1px solid rgba(87,216,255,0.28)',
      }}>
        Ativar digital
      </button>

      <button onClick={onDecline} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)',
        fontSize: 13, cursor: 'pointer', padding: '4px 8px', transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
      >
        Agora não
      </button>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════ */
type LoginMode = 'form' | 'reset';

const MAX_BIO_ATTEMPTS = 3;

export const Login = () => {
  const { user, loading, signIn, resetPassword, restoreSession } = useAuth();
  const navigate   = useNavigate();
  const emailRef   = useRef<HTMLInputElement>(null);
  const passRef    = useRef<HTMLInputElement>(null);
  const userRef    = useRef<{ id: string; email: string } | null>(null);

  const [bgPhase,       setBgPhase]       = useState<'copa' | 'natureza'>('copa');
  const [mode,          setMode]          = useState<LoginMode>('form');
  const [bioScan,       setBioScan]       = useState<BioScan>('idle');
  const [bioAttempts,   setBioAttempts]   = useState(0);
  const [bioAvailable,  setBioAvailable]  = useState(false);
  const [bioEnabled,    setBioEnabled]    = useState(false);
  const [showEnroll,    setShowEnroll]    = useState(false);
  const [forceEnroll,   setForceEnroll]   = useState(false);

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [progressing,   setProgressing]   = useState(false);
  const [progressLabel, setProgressLabel] = useState('Entrando...');
  const [error,         setError]         = useState('');
  const [focusedInput,  setFocusedInput]  = useState<'email' | 'pass' | null>(null);
  const [resetEmail,    setResetEmail]    = useState('');
  const [resetSent,     setResetSent]     = useState(false);
  // true quando digital foi confirmada mas sessão expirou — pede só a senha
  const [bioVerifiedNeedsPass, setBioVerifiedNeedsPass] = useState(false);

  // Troca de background: copa → natureza após 27s
  useEffect(() => {
    const t = setTimeout(() => setBgPhase('natureza'), 27000);
    return () => clearTimeout(t);
  }, []);

  // Verifica disponibilidade biométrica
  useEffect(() => {
    if (loading) return;
    (async () => {
      const available = await isBiometricAvailable();
      setBioAvailable(available);
      setBioEnabled(available && getBiometricState().enabled);
      setTimeout(() => emailRef.current?.focus(), 200);
    })();
  }, [loading]);

  // Já autenticado → redireciona
  useEffect(() => {
    if (user && !loading) {
      setProgressLabel('Bem-vindo de volta!');
      setProgressing(true);
      const t = setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
      return () => clearTimeout(t);
    }
  }, [user, loading, navigate]);

  if (loading)     return <ProgressScreen label="Verificando sessão..." />;
  if (progressing) return <ProgressScreen label={progressLabel} />;

  /* ── LOGIN BIOMÉTRICO ── */
  const handleBioLogin = async () => {
    if (bioScan === 'scanning') return;
    setBioScan('scanning');
    setError('');
    try {
      const ok = await verifyBiometric();
      if (!ok) { handleBioFail(); return; }

      // Digital confirmada — recupera a sessão Supabase que permaneceu no
      // localStorage após o logout suave (sem revogação do token).
      const restored = await restoreSession();
      if (restored) {
        setBioScan('success');
        setProgressLabel('Bem-vindo!');
        setProgressing(true);
        return; // useEffect [user] cuida da navegação
      }

      // Sessão expirada (>7 dias sem usar o app) — pede só a senha
      const storedEmail = getBiometricState().email ?? '';
      setBioScan('idle');
      setBioVerifiedNeedsPass(true);
      if (storedEmail) setEmail(storedEmail);
      setTimeout(() => passRef.current?.focus(), 150);
    } catch {
      handleBioFail();
    }
  };

  const handleBioFail = () => {
    const n = bioAttempts + 1;
    setBioAttempts(n);
    setBioScan('fail');
    if (n >= MAX_BIO_ATTEMPTS) {
      clearBiometric();
      setBioEnabled(false);
      setTimeout(() => {
        setBioScan('idle');
        setBioAttempts(0);
        setError('Muitas tentativas biométricas. Use sua senha para entrar.');
        setTimeout(() => emailRef.current?.focus(), 100);
      }, 1400);
    } else {
      setTimeout(() => setBioScan('idle'), 1400);
    }
  };

  /* ── LOGIN COM SENHA ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!email.trim() || !password) {
      setError('Campo(s) de preenchimento obrigatório.');
      return;
    }

    const rlKey = `login:${sanitize(email).toLowerCase()}`;
    const rl = checkRateLimit(rlKey, 5);
    if (!rl.allowed) {
      const mins = Math.ceil(rl.retryAfterMs / 60000);
      setError(`Muitas tentativas. Aguarde ${mins} minuto${mins > 1 ? 's' : ''}.`);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: err } = await signIn(sanitize(email).trim(), password);
      if (err) throw err;
      resetRateLimit(rlKey);

      if (data?.user || data?.session) {
        userRef.current = {
          id:    data.user?.id ?? data.session?.user?.id ?? email,
          email: sanitize(email).trim(),
        };
        setBioVerifiedNeedsPass(false);

        // Se biometria já está configurada, renovar os tokens de sessão agora
        // (podem ter sido apagados pelo logout fatal) para que o próximo acesso
        // por digital funcione sem exigir senha novamente.
        if (getBiometricState().enabled && data?.session) {
          storeSessionTokens(data.session.access_token, data.session.refresh_token);
        }

        // forceEnroll ignora bioAvailable (usuário pediu explicitamente)
        const shouldEnroll = !getBiometricState().enabled && (forceEnroll || (bioAvailable && !hasShownOffer()));
        if (shouldEnroll) {
          markOfferShown();
          setForceEnroll(false);
          setSubmitting(false);
          setShowEnroll(true);
        } else {
          setProgressLabel('Entrando...');
          setProgressing(true);
          setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
        }
      }
    } catch (err: any) {
      setError(
        err?.message?.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.' :
        err?.message?.includes('Email not confirmed')        ? 'Confirme seu e-mail antes de entrar.' :
        err?.message?.includes('Too many requests')          ? 'Muitas tentativas. Aguarde um momento.' :
        'Erro ao entrar. Tente novamente.'
      );
      setSubmitting(false);
    }
  };

  /* ── ENROLLMENT ── */
  const handleEnrollAccept = async () => {
    setShowEnroll(false);
    const { id, email: userEmail } = userRef.current ?? { id: email, email };
    const ok = await registerBiometric(id, userEmail.split('@')[0], userEmail);
    if (!ok) {
      setError('Não foi possível cadastrar a digital. Verifique se o dispositivo suporta biometria e tente novamente.');
      return;
    }
    // Grava tokens da sessão atual para que o próximo login biométrico funcione sem senha
    const { data: { session: enrollSess } } = await supabase.auth.getSession();
    if (enrollSess) {
      const { storeSessionTokens } = await import('@/lib/biometric');
      storeSessionTokens(enrollSess.access_token, enrollSess.refresh_token);
    }
    setBioEnabled(true);
    setProgressLabel('Digital ativada! ✓');
    setProgressing(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
  };

  const handleEnrollDecline = () => {
    setShowEnroll(false);
    setProgressLabel('Entrando...');
    setProgressing(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
  };

  /* ── RESET DE SENHA ── */
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      setError('Erro ao enviar e-mail. Verifique o endereço.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── RENDER ── */
  return (
    <>
      {/* Fundo copa — some gradualmente */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(3px) brightness(0.95) saturate(0.95)',
        transform: 'scale(1.04)',
        opacity: bgPhase === 'copa' ? 1 : 0,
        transition: 'opacity 2s ease-in-out',
      }} />
      {/* Fundo natureza — aparece gradualmente */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/login-bg-natureza.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(3px) brightness(0.9) saturate(1.1)',
        transform: 'scale(1.04)',
        opacity: bgPhase === 'natureza' ? 1 : 0,
        transition: 'opacity 2s ease-in-out',
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(10,14,26,0.72)' }} />

      {/* Modal de convite */}
      {showEnroll && <EnrollModal onAccept={handleEnrollAccept} onDecline={handleEnrollDecline} />}

      {/* Conteúdo */}
      <div style={{
        position: 'relative', zIndex: 10, minHeight: '100svh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(16px,4vw,40px)',
      }}>

        {/* ══════════ FORMULÁRIO DE LOGIN ══════════ */}
        {mode === 'form' && (
          <div style={{
            width: '100%', maxWidth: 'clamp(280px,90vw,400px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'clamp(12px,3vw,18px)',
            animation: 'slide-up 0.4s ease-out forwards',
          }}>
            <style>{`
              @keyframes slide-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
              .login-input:focus{border-color:rgba(255,255,255,0.22)!important;background:rgba(0,0,0,0.3)!important;border-bottom:2px solid #57d8ff!important;border-radius:8px 8px 2px 2px!important;}
            `}</style>

            {/* Logo */}
            <div style={{
              width: 96, height: 96, borderRadius: '50%', background: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0, marginBottom: 4,
            }}>
              <img src="/logo-itauna.png" alt="Itaúna" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            </div>

            <p style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.7)', textAlign: 'center', textShadow: '0 2px 16px rgba(0,0,0,0.6)', marginBottom: 8 }}>
              Um refúgio ecológico para chamar de seu
            </p>

            {/* Formulário senha */}
            <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <EmailInput
                inputRef={emailRef as React.RefObject<HTMLInputElement>}
                value={email} onChange={v => { setEmail(v); setError(''); }}
              />

              <div style={{ position: 'relative' }}>
                <input
                  ref={passRef} type={showPass ? 'text' : 'password'} placeholder="Senha"
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  onFocus={() => setFocusedInput('pass')} onBlur={() => setFocusedInput(null)}
                  autoComplete="current-password" required className="login-input"
                  style={{ ...inputStyle, paddingRight: 44, borderColor: focusedInput === 'pass' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)' }}
                />
                {password ? (
                  <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                ) : (
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <ChevronRight size={18} />
                  </span>
                )}
              </div>

              {bioVerifiedNeedsPass && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.28)',
                  color: '#34d399', fontSize: 'clamp(11px,2.5vw,13px)',
                  animation: 'slide-up 0.25s ease-out',
                }}>
                  <Fingerprint size={14} style={{ flexShrink: 0 }} />
                  Digital confirmada ✓ — sessão expirada. Informe apenas sua senha para renovar o acesso.
                </div>
              )}

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5', fontSize: 'clamp(11px,2.5vw,13px)',
                  animation: 'slide-up 0.25s ease-out',
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
                </div>
              )}

              <button type="submit" disabled={submitting} style={{
                ...btnDark, marginTop: 4,
                background: submitting ? 'rgba(100,92,85,0.28)' : 'rgba(100,92,85,0.48)',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = 'rgba(120,110,102,0.6)'; }}
              onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = 'rgba(100,92,85,0.48)'; }}
              >
                {submitting ? <><DotsSpinner /><span style={{ fontSize: 13 }}>Verificando...</span></> : 'Entrar'}
              </button>
            </form>

            {/* ── BOTÃO BIOMÉTRICO — opção adicional ── */}
            {bioEnabled && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                {/* Divisor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 500, letterSpacing: '0.06em' }}>OU</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Feedback de estado biométrico */}
                {bioScan !== 'idle' && (
                  <p style={{
                    fontSize: 12, textAlign: 'center',
                    color: bioScan === 'fail'    ? '#fca5a5' :
                           bioScan === 'success' ? '#34d399' : '#57d8ff',
                    transition: 'color 0.3s',
                  }}>
                    {{
                      scanning: 'Verificando biometria...',
                      success:  'Identidade confirmada ✓',
                      fail:     bioAttempts >= MAX_BIO_ATTEMPTS
                                  ? 'Limite atingido — use sua senha'
                                  : `Não reconhecido — ${MAX_BIO_ATTEMPTS - bioAttempts} tentativa${MAX_BIO_ATTEMPTS - bioAttempts !== 1 ? 's' : ''} restante${MAX_BIO_ATTEMPTS - bioAttempts !== 1 ? 's' : ''}`,
                    }[bioScan as 'scanning' | 'success' | 'fail']}
                  </p>
                )}

                {/* Botão de digital */}
                <button
                  onClick={handleBioLogin}
                  disabled={bioScan === 'scanning' || bioScan === 'success'}
                  style={{
                    ...btnDark,
                    background: bioScan === 'fail'
                      ? 'rgba(239,68,68,0.15)'
                      : 'rgba(87,216,255,0.08)',
                    border: bioScan === 'fail'
                      ? '1px solid rgba(239,68,68,0.25)'
                      : '1px solid rgba(87,216,255,0.18)',
                    color: bioScan === 'fail' ? '#fca5a5' : '#57d8ff',
                    cursor: (bioScan === 'scanning' || bioScan === 'success') ? 'not-allowed' : 'pointer',
                    opacity: (bioScan === 'scanning' || bioScan === 'success') ? 0.7 : 1,
                  }}
                >
                  <BioIcon scan={bioScan} size={18} />
                  {bioScan === 'scanning' ? 'Aguardando sensor...' :
                   bioScan === 'fail' && bioAttempts < MAX_BIO_ATTEMPTS ? 'Tentar digital novamente' :
                   'Entrar com digital'}
                </button>

                {/* Toggle desativar biometria */}
                <button
                  onClick={() => { clearBiometric(); setBioEnabled(false); setBioScan('idle'); }}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                    fontSize: 11, cursor: 'pointer', padding: '2px 8px', transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fca5a5')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  Desativar digital neste dispositivo
                </button>
              </div>
            )}

            {/* ── CADASTRAR DIGITAL — sempre visível quando não ativada ── */}
            {!bioEnabled && (
              <button
                onClick={() => {
                  setForceEnroll(true);
                  setError('');
                  passRef.current?.focus();
                }}
                style={{
                  background: 'rgba(87,216,255,0.07)', border: '1px solid rgba(87,216,255,0.28)',
                  borderRadius: 8, color: '#57d8ff', fontSize: 13,
                  cursor: 'pointer', padding: '11px 16px', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all 0.2s', fontWeight: 600,
                  boxShadow: '0 2px 12px rgba(87,216,255,0.1)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,0.14)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,0.07)'; }}
              >
                <Fingerprint size={14} strokeWidth={1.5} />
                {forceEnroll ? 'Faça login para ativar a digital ↑' : 'Ativar acesso por digital'}
              </button>
            )}

            {/* Links secundários */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <button onClick={() => { setMode('reset'); setError(''); }} style={{
                background: 'none', border: 'none', color: '#a3aab5', fontSize: 13,
                cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
                padding: 4, transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#a3aab5')}
              >
                Esqueci minha senha
              </button>

              <button onClick={() => navigate('/')} style={{
                background: 'none', border: 'none', color: '#828a96',
                fontSize: 12, cursor: 'pointer', padding: 4, transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = '#828a96')}
              >
                Conhecer o Condomínio
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bell size={13} color="#57d8ff" />
                <span style={{ fontSize: 14, color: '#57d8ff', fontWeight: 800, letterSpacing: '0.14em', textShadow: '0 0 18px rgba(87,216,255,0.5)' }}>ITAÚNA</span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(87,216,255,0.6)', fontWeight: 600, letterSpacing: '0.22em' }}>DIGITAL</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4, letterSpacing: '0.05em' }}>
                build {__BUILD_TIME__}
              </span>
            </div>
          </div>
        )}

        {/* ══════════ RECUPERAÇÃO DE SENHA ══════════ */}
        {mode === 'reset' && (
          <div style={{
            width: '100%', maxWidth: 'clamp(280px,90vw,380px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 20, animation: 'slide-up 0.35s ease-out forwards',
          }}>
            <p style={{ fontSize: 'clamp(18px,4.5vw,22px)', fontWeight: 600, color: '#fff', textAlign: 'center' }}>
              Recuperar senha
            </p>
            <p style={{ fontSize: 'clamp(12px,2.8vw,14px)', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.6 }}>
              Informe seu e-mail e enviaremos um link de recuperação.
            </p>

            {resetSent ? (
              <div style={{
                padding: '20px 24px', borderRadius: 12, width: '100%',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', textAlign: 'center',
              }}>
                <p style={{ color: '#34d399', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>✓ E-mail enviado!</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Verifique sua caixa de entrada.</p>
              </div>
            ) : (
              <form onSubmit={handleReset} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="email" placeholder="seu@email.com"
                  value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  required style={inputStyle}
                />
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fca5a5', fontSize: 13,
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
                  </div>
                )}
                <button type="submit" disabled={submitting} style={{ ...btnDark, borderRadius: 8 }}>
                  {submitting ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>
            )}

            <button onClick={() => { setMode('form'); setError(''); setResetSent(false); }} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
              textUnderlineOffset: 3, transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            >
              ← Voltar ao login
            </button>
          </div>
        )}
      </div>
    </>
  );
};
