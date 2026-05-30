/**
 * AcessoQR — Página pública acessada pelo visitante ao escanear o QR Code.
 * URL: /acesso          → visitante digita a chácara destino
 * URL: /acesso?c=045    → chácara pré-preenchida pelo QR da chácara
 *
 * Fluxo: formulário → insert na portaria_solicitacoes → tela de espera
 * (polling a cada 4s) → tela de aprovado / negado.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { TreePine, Shield, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { insertSolicitacao, fetchSolicitacaoById } from '../lib/supabase-queries';

const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const RED   = '#ef4444';

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12,
  color: '#fff', padding: '12px 14px', fontSize: 15, outline: 'none',
  boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: 6,
};

/* ── Tela de espera — polling a cada 4s ── */
const TelaEspera = ({
  solicitacaoId, nome, chacara,
}: { solicitacaoId: string; nome: string; chacara: string }) => {
  const [status, setStatus] = useState<'pendente' | 'aprovado' | 'negado' | 'cancelado'>('pendente');
  const [dots, setDots] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Animação de pontos
    const dt = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);

    // Polling de status a cada 4s
    pollRef.current = setInterval(async () => {
      const sol = await fetchSolicitacaoById(solicitacaoId);
      if (sol && sol.status !== 'pendente') {
        setStatus(sol.status as any);
        clearInterval(pollRef.current!);
      }
    }, 4000);

    return () => {
      clearInterval(dt);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [solicitacaoId]);

  if (status === 'aprovado') return (
    <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `${GREEN}18`, border: `2px solid ${GREEN}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 1.5s ease infinite',
      }}>
        <CheckCircle2 size={36} style={{ color: GREEN }} />
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 900, color: GREEN, marginBottom: 6 }}>Entrada Liberada!</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
          Seja bem-vindo(a), <strong style={{ color: '#fff' }}>{nome}</strong>.<br />
          Pode se dirigir à <strong style={{ color: '#fff' }}>Chácara {chacara}</strong>.
        </p>
      </div>
      <div style={{
        padding: '10px 20px', borderRadius: 12,
        background: `${GREEN}12`, border: `1px solid ${GREEN}28`,
        fontSize: 12, color: 'rgba(255,255,255,0.5)',
      }}>
        Apresente esta tela ao porteiro se solicitado.
      </div>
    </div>
  );

  if (status === 'negado' || status === 'cancelado') return (
    <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `${RED}18`, border: `2px solid ${RED}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <XCircle size={36} style={{ color: RED }} />
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 900, color: RED, marginBottom: 6 }}>Acesso não autorizado</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
          Dirija-se à portaria para mais informações.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(87,216,255,0.10)', border: `2px solid ${CYAN}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Clock size={32} style={{ color: CYAN }} />
      </div>
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Aguardando liberação{dots}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
          Sua solicitação foi enviada à portaria.<br />
          Em instantes você receberá a confirmação.
        </p>
      </div>
      <div style={{
        padding: '12px 18px', borderRadius: 12,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{nome}</strong><br />
        Chácara <strong style={{ color: CYAN }}>{chacara.padStart(3, '0')}</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
        <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
        verificando status automaticamente
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export const AcessoQR = () => {
  const [params] = useSearchParams();
  const chacaraParam = params.get('c') ?? '';

  const [chacara,  setChacara]  = useState(chacaraParam);
  const [nome,     setNome]     = useState('');
  const [tel,      setTel]      = useState('');
  const [veiculo,  setVeiculo]  = useState('');
  const [motivo,   setMotivo]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null);
  const [lastSubmit, setLastSubmit] = useState(0); // rate limiting client-side

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmit < 60_000) {
      alert('Aguarde 1 minuto antes de enviar outra solicitação.');
      return;
    }
    setSubmitting(true);
    try {
      const sol = await insertSolicitacao({
        chacara_numero:    chacara.padStart(3, '0'),
        visitante_nome:    nome.trim(),
        visitante_tel:     tel.trim() || null,
        visitante_veiculo: veiculo.trim() || null,
        motivo:            motivo.trim() || null,
      });
      setLastSubmit(now);
      setSolicitacaoId(sol.id);
    } catch {
      alert('Erro ao enviar solicitação. Tente novamente ou dirija-se à portaria.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(180deg, #07101c 0%, #0d1a2e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'clamp(24px,5vw,48px) clamp(16px,4vw,24px)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36, width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: 'linear-gradient(135deg,#72e3ff,#669dff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(87,216,255,0.35)',
          }}>
            <TreePine size={22} color="#07101c" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 900, fontSize: 16, color: '#fff', lineHeight: 1 }}>Itaúna</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Chácaras · Ibiporã – PR</p>
          </div>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 14px', borderRadius: 20,
          background: 'rgba(87,216,255,0.08)', border: '1px solid rgba(87,216,255,0.20)',
          marginBottom: 16,
        }}>
          <Shield size={13} style={{ color: CYAN }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: CYAN, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Solicitação de Acesso
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>
          Bem-vindo ao<br />
          <span style={{ background: 'linear-gradient(135deg,#72e3ff,#669dff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Condomínio Itaúna
          </span>
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Preencha seus dados. A portaria receberá sua solicitação e liberará sua entrada.
        </p>
      </div>

      {/* Card principal */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20,
        padding: 'clamp(20px,4vw,28px)',
      }}>
        {solicitacaoId ? (
          <TelaEspera
            solicitacaoId={solicitacaoId}
            nome={nome}
            chacara={chacara.padStart(3, '0')}
          />
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span style={lbl}>Seu nome completo *</span>
              <input
                style={inp} required
                placeholder="Ex: João da Silva"
                value={nome} onChange={e => setNome(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <span style={lbl}>Chácara destino *</span>
              <input
                style={{ ...inp, fontWeight: chacaraParam ? 700 : 400 }}
                required
                placeholder="Número · ex: 042"
                value={chacara}
                onChange={e => setChacara(e.target.value.replace(/\D/g, ''))}
                maxLength={3}
                readOnly={!!chacaraParam}
              />
              {chacaraParam && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  Chácara pré-definida pelo QR Code
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={lbl}>Telefone</span>
                <input
                  style={inp} type="tel"
                  placeholder="(43) 9 ..."
                  value={tel} onChange={e => setTel(e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div>
                <span style={lbl}>Veículo / Placa</span>
                <input
                  style={inp}
                  placeholder="Ex: Civic / ABC-1234"
                  value={veiculo} onChange={e => setVeiculo(e.target.value)}
                />
              </div>
            </div>

            <div>
              <span style={lbl}>Motivo da visita</span>
              <input
                style={inp}
                placeholder="Ex: visita pessoal, entrega, serviço..."
                value={motivo} onChange={e => setMotivo(e.target.value)}
              />
            </div>

            <button
              type="submit" disabled={submitting}
              style={{
                width: '100%', padding: '14px', borderRadius: 13,
                border: 'none', cursor: submitting ? 'wait' : 'pointer',
                background: submitting ? 'rgba(87,216,255,0.3)' : 'linear-gradient(135deg,#72e3ff,#669dff)',
                color: '#07101c', fontWeight: 800, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {submitting
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                : '🔔 Solicitar Entrada'
              }
            </button>
          </form>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
          Sua solicitação é registrada e auditada.<br />
          Em caso de emergência, dirija-se diretamente à portaria.
        </p>
        <Link to="/" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>
          Condomínio Itaúna · Ibiporã – PR
        </Link>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
        }
      `}</style>
    </div>
  );
};
