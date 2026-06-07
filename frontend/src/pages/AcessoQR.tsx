/**
 * AcessoQR — Experiência do visitante ao escanear o QR Code.
 * URL: /acesso?p=1  ou  /acesso?p=2
 *
 * Wizard 3 passos: Nome → CPF → Aguardando → Resultado
 * Design: zero barreira, máxima clareza, responsivo, acessível.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TreePine, ChevronRight, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  insertSolicitacao, fetchSolicitacaoById, isPortariaBusy,
  fetchConviteByCpf, fetchRecorrenteByCpf,
} from '../lib/supabase-queries';
import { maskCPF } from '../utils/format';

/* ── Paleta ── */
const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const RED   = '#ef4444';

/* ── Mascarar CPF para exibição: ***.456.789-** ── */
function maskCpf(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length < 11) return maskCPF(raw);
  return `***.${d.slice(3,6)}.${d.slice(6,9)}-**`;
}

type Step = 'nome' | 'cpf' | 'busy' | 'waiting' | 'approved' | 'denied';

/* ── Componente de passo — wrapper com animação ── */
const StepWrap = ({ children, dir = 'in' }: { children: React.ReactNode; dir?: 'in' | 'out' }) => (
  <div style={{
    animation: `slideIn 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both`,
    width: '100%',
  }}>
    {children}
  </div>
);

/* ════════════════════════════════════════════════════════════════ */
export const AcessoQR = () => {
  const [params]     = useSearchParams();
  const portariaId   = parseInt(params.get('p') ?? '1') as 1 | 2;

  const [step, setStep]       = useState<Step>('nome');
  const [nome, setNome]       = useState('');
  const [cpf, setCpf]         = useState('');
  const [solId, setSolId]     = useState<string | null>(null);
  const [dots, setDots]       = useState('');
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const nomeRef               = useRef<HTMLInputElement>(null);
  const cpfRef                = useRef<HTMLInputElement>(null);

  useEffect(() => { nomeRef.current?.focus(); }, []);

  /* Animação de espera */
  useEffect(() => {
    if (step !== 'waiting' && step !== 'busy') return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
    return () => clearInterval(t);
  }, [step]);

  /* Polling quando aguardando */
  useEffect(() => {
    if (step !== 'waiting' || !solId) return;
    pollRef.current = setInterval(async () => {
      const sol = await fetchSolicitacaoById(solId);
      if (!sol || sol.status === 'pendente') return;
      clearInterval(pollRef.current!);
      setStep(sol.status === 'aprovado' ? 'approved' : 'denied');
    }, 3500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, solId]);

  /* Retry quando portaria ocupada */
  useEffect(() => {
    if (step !== 'busy') return;
    const t = setInterval(async () => {
      const busy = await isPortariaBusy(portariaId);
      if (!busy) { clearInterval(t); handleSubmit(); }
    }, 5000);
    return () => clearInterval(t);
  }, [step]);

  const handleNome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setStep('cpf');
    setTimeout(() => cpfRef.current?.focus(), 100);
  };

  const handleCpf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(maskCPF(raw));
  };

  const handleSubmit = useCallback(async () => {
    const cpfClean = cpf.replace(/\D/g, '');

    try {
      /* Verificar se portaria está ocupada */
      const busy = await isPortariaBusy(portariaId);
      if (busy) { setStep('busy'); return; }

      /* Buscar convite ou recorrente pelo CPF */
      const [convite, recorrente] = await Promise.all([
        fetchConviteByCpf(cpfClean),
        fetchRecorrenteByCpf(cpfClean),
      ]);

      /* Criar solicitação */
      const sol = await insertSolicitacao({
        chacara_numero:  convite?.chacara_numero ?? recorrente?.chacara_numero ?? '—',
        visitante_nome:  nome.trim(),
        visitante_cpf:   cpfClean || null,
        portaria_id:     portariaId,
        status:          'pendente',
        convite_id:      convite?.id ?? null,
        recorrente_id:   recorrente?.id ?? null,
        origem:          'qr',
      } as any);

      setSolId(sol.id);
      setStep('waiting');
    } catch {
      alert('Erro de conexão. Dirija-se à portaria.');
    }
  }, [cpf, nome, portariaId]);

  const handleConfirmCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) { cpfRef.current?.focus(); return; }
    await handleSubmit();
  };

  /* ── Render ── */
  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(160deg, #070f1c 0%, #0d1a30 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(24px,6vw,56px) clamp(20px,5vw,32px)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#fff',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: 'linear-gradient(135deg,#72e3ff,#669dff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 28px rgba(87,216,255,0.30)',
        }}>
          <TreePine size={22} color="#07101c" />
        </div>
        <div>
          <p style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>Itaúna</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
            Portaria {portariaId} · Ibiporã – PR
          </p>
        </div>
      </div>

      {/* Card central */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 24, padding: 'clamp(28px,6vw,40px)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
      }}>

        {/* ── PASSO 1: Nome ── */}
        {step === 'nome' && (
          <StepWrap>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 6, letterSpacing: '0.06em' }}>
              PASSO 1 DE 2
            </p>
            <h1 style={{ fontSize: 'clamp(24px,5vw,32px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
              Bem-vindo!
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.6 }}>
              Como você se chama?
            </p>
            <form onSubmit={handleNome}>
              <input
                ref={nomeRef}
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                placeholder="Seu nome completo"
                value={nome}
                onChange={e => setNome(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: 14, color: '#fff',
                  padding: '16px 18px', fontSize: 17, outline: 'none',
                  marginBottom: 16,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = CYAN}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
              <button type="submit" disabled={!nome.trim()} style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                background: nome.trim()
                  ? 'linear-gradient(135deg,#72e3ff,#669dff)'
                  : 'rgba(255,255,255,0.08)',
                color: nome.trim() ? '#07101c' : 'rgba(255,255,255,0.3)',
                fontWeight: 800, fontSize: 16, cursor: nome.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}>
                Continuar <ChevronRight size={18} />
              </button>
            </form>
          </StepWrap>
        )}

        {/* ── PASSO 2: CPF ── */}
        {step === 'cpf' && (
          <StepWrap>
            <button onClick={() => setStep('nome')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
              gap: 4, fontSize: 13, marginBottom: 20, padding: 0,
            }}>
              <ArrowLeft size={14} /> Voltar
            </button>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 6, letterSpacing: '0.06em' }}>
              PASSO 2 DE 2
            </p>
            <h1 style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 4 }}>
              {nome.split(' ')[0]}, qual seu CPF?
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.6 }}>
              Usado somente para confirmar sua identidade na portaria.
            </p>
            <form onSubmit={handleConfirmCpf}>
              <input
                ref={cpfRef}
                type="tel"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpf}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: 14, color: '#fff',
                  padding: '16px 18px', fontSize: 22,
                  letterSpacing: '0.12em', outline: 'none',
                  marginBottom: 16, textAlign: 'center',
                  transition: 'border-color 0.2s',
                  fontFamily: 'monospace',
                }}
                onFocus={e => e.target.style.borderColor = CYAN}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />

              {/* Indicador de progresso do CPF */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 24, justifyContent: 'center' }}>
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i < cpf.replace(/\D/g,'').length ? CYAN : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.15s',
                  }} />
                ))}
              </div>

              <button
                type="submit"
                disabled={cpf.replace(/\D/g,'').length !== 11}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  background: cpf.replace(/\D/g,'').length === 11
                    ? 'linear-gradient(135deg,#72e3ff,#669dff)'
                    : 'rgba(255,255,255,0.08)',
                  color: cpf.replace(/\D/g,'').length === 11 ? '#07101c' : 'rgba(255,255,255,0.3)',
                  fontWeight: 800, fontSize: 16,
                  cursor: cpf.replace(/\D/g,'').length === 11 ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}>
                🔔 Chamar portaria
              </button>
            </form>
          </StepWrap>
        )}

        {/* ── PORTARIA OCUPADA ── */}
        {step === 'busy' && (
          <StepWrap>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 2s ease infinite',
              }}>
                <Clock size={28} style={{ color: '#f59e0b' }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', marginBottom: 10 }}>
                Portaria ocupada
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                A portaria está atendendo outro visitante.<br />
                Você será chamado automaticamente<br />
                assim que ela ficar disponível{dots}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 20 }}>
                Portaria {portariaId} · aguardando liberação
              </p>
            </div>
          </StepWrap>
        )}

        {/* ── AGUARDANDO ── */}
        {step === 'waiting' && (
          <StepWrap>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                background: `${CYAN}14`, border: `2px solid ${CYAN}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 1.8s ease infinite',
              }}>
                <TreePine size={28} style={{ color: CYAN }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 10 }}>
                Aguardando{dots}
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                Sua solicitação foi enviada à portaria.<br />
                Em instantes você receberá a confirmação.
              </p>
              <div style={{
                marginTop: 24, padding: '12px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{nome}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  CPF: {maskCpf(cpf)} · Portaria {portariaId}
                </p>
              </div>
            </div>
          </StepWrap>
        )}

        {/* ── APROVADO ── */}
        {step === 'approved' && (
          <StepWrap>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                background: `${GREEN}14`, border: `2px solid ${GREEN}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both',
              }}>
                <CheckCircle2 size={36} style={{ color: GREEN }} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: GREEN, marginBottom: 10 }}>
                Entrada liberada!
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
                Seja muito bem-vindo(a),<br />
                <strong style={{ color: '#fff' }}>{nome}</strong>.
              </p>
              <div style={{
                marginTop: 24, padding: '14px 20px', borderRadius: 14,
                background: `${GREEN}0c`, border: `1px solid ${GREEN}28`,
                fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
              }}>
                Apresente esta tela ao porteiro se solicitado.
              </div>
            </div>
          </StepWrap>
        )}

        {/* ── NEGADO ── */}
        {step === 'denied' && (
          <StepWrap>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                background: `${RED}14`, border: `2px solid ${RED}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle size={36} style={{ color: RED }} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: RED, marginBottom: 10 }}>
                Acesso não autorizado
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                Dirija-se à portaria para mais informações.
              </p>
            </div>
          </StepWrap>
        )}

      </div>

      {/* Rodapé */}
      <p style={{ marginTop: 28, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Condomínio Chácaras Itaúna · Ibiporã – PR
      </p>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(87,216,255,0.3); }
          50%       { box-shadow: 0 0 0 14px rgba(87,216,255,0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
