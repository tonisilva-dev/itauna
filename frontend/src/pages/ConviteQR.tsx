/**
 * ConviteQR — Página pública do convite gerado pelo morador.
 * URL: /convite/:id
 *
 * Dois modos:
 *  A) Visitante (não autenticado): wizard CPF → aguarda aprovação porteiro
 *  B) Porteiro (autenticado gestor/assistente): vê detalhes + libera entrada diretamente
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { TreePine, CheckCircle2, XCircle, Clock, CalendarDays, Home, Users, ChevronRight, Car, MapPin, Loader2 } from 'lucide-react';
import {
  fetchConviteById, insertSolicitacao, fetchSolicitacaoById, isPortariaBusy,
  porteiroConcluirEntrada,
  type DbConvite,
} from '../lib/supabase-queries';
import { formatUnidade, maskCPF } from '../utils/format';
import { useAuth } from '@/contexts/AuthContext';

const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const RED   = '#ef4444';

const TIPO_LABEL: Record<string, { emoji: string; label: string }> = {
  convidado: { emoji: '👤', label: 'Convidado'           },
  prestador: { emoji: '🔧', label: 'Prestador de Serviço'},
  entrega:   { emoji: '📦', label: 'Entrega'             },
};

const PERIODO_LABEL: Record<string, string> = {
  manha: '🌅 Manhã', tarde: '🌤 Tarde', noite: '🌙 Noite', dia_todo: '☀ Dia todo',
};

type Step = 'loading' | 'cpfs' | 'busy' | 'waiting' | 'approved' | 'denied' | 'not_found' | 'expired';
type PorteiroStep = 'detalhe' | 'liberando' | 'liberado' | 'erro';

export const ConviteQR = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isPorteiro = user?.role === 'admin' || user?.role === 'sindico' || user?.role === 'assistente';

  const [step, setStep]       = useState<Step>('loading');
  const [convite, setConvite] = useState<DbConvite | null>(null);
  const [solId, setSolId]     = useState<string | null>(null);
  const [dots, setDots]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Porteiro mode state
  const [pStep, setPStep]             = useState<PorteiroStep>('detalhe');
  const [pPlaca, setPPlaca]           = useState('');
  const [pOcupantes, setPOcupantes]   = useState(1);
  const [pDocOk, setPDocOk]           = useState(false);
  const [pObs, setPObs]               = useState('');

  // CPFs: sempre inclui o principal (do convite), mais campos p/ acompanhantes
  const [cpfs, setCpfs] = useState<string[]>(['']);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) { setStep('not_found'); return; }
    fetchConviteById(id).then(c => {
      if (!c) { setStep('not_found'); return; }
      setConvite(c);
      if (isPorteiro) {
        // Porteiro vê detalhes do convite diretamente
        setPPlaca(c.veiculo_placa ?? '');
        setPOcupantes(c.ocupantes_declarados ?? c.num_pessoas);
        return; // pStep = 'detalhe' — handled separately
      }
      if (c.status === 'cancelado' || c.status === 'expirado') { setStep('expired'); return; }
      const today = new Date().toISOString().slice(0, 10);
      if (c.data_visita < today) { setStep('expired'); return; }
      // Pré-preenche CPF principal se disponível no convite
      const initial = Array.from({ length: c.num_pessoas }, (_, i) =>
        i === 0 && c.visitante_cpf ? maskCPF(c.visitante_cpf) : ''
      );
      setCpfs(initial);
      setStep('cpfs');
    }).catch(() => setStep('not_found'));
  }, [id, isPorteiro]);

  useEffect(() => {
    if (step !== 'waiting' && step !== 'busy') return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
    return () => clearInterval(t);
  }, [step]);

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

  useEffect(() => {
    if (step !== 'busy') return;
    const t = setInterval(async () => {
      const busy = await isPortariaBusy(1);
      if (!busy) { clearInterval(t); submitSolicitacao(); }
    }, 5000);
    return () => clearInterval(t);
  }, [step]);

  const submitSolicitacao = async () => {
    if (!convite) return;
    const cpfsClean = cpfs.map(c => c.replace(/\D/g, '')).filter(Boolean);
    const cpfPrincipal = cpfsClean[0] ?? convite.visitante_cpf ?? null;
    const obsExtra = cpfsClean.length > 1
      ? `CPFs informados: ${cpfsClean.join(', ')}`
      : null;

    try {
      const busy = await isPortariaBusy(1);
      if (busy) { setStep('busy'); return; }

      const sol = await insertSolicitacao({
        chacara_numero: convite.chacara_numero,
        visitante_nome: convite.visitante_nome,
        visitante_cpf:  cpfPrincipal,
        portaria_id:    1,
        status:         'pendente',
        convite_id:     convite.id,
        recorrente_id:  null,
        origem:         'qr',
        num_pessoas:    convite.num_pessoas,
        observacao:     [convite.observacao, obsExtra].filter(Boolean).join(' | ') || null,
      } as any);

      setSolId(sol.id);
      setStep('waiting');
    } catch {
      alert('Erro de conexão. Dirija-se à portaria.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCpfs = async (e: React.FormEvent) => {
    e.preventDefault();
    // Valida que todos os CPFs têm 11 dígitos
    const invalid = cpfs.some(c => c.replace(/\D/g,'').length !== 11);
    if (invalid) return;
    setSubmitting(true);
    await submitSolicitacao();
  };

  const setCpf = (idx: number, val: string) =>
    setCpfs(prev => prev.map((c, i) => i === idx ? maskCPF(val) : c));

  const handlePorteiroLiberar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convite || !user) return;
    setPStep('liberando');
    try {
      await porteiroConcluirEntrada({
        convite,
        placa_verificada: pPlaca.trim().toUpperCase() || null,
        ocupantes_verificados: pOcupantes,
        documento_conferido: pDocOk,
        obs: pObs.trim() || null,
        registrado_por: user.id,
      });
      setPStep('liberado');
    } catch {
      setPStep('erro');
    }
  };

  const fmtData = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  const tipoInfo = convite ? TIPO_LABEL[convite.tipo] : null;
  const allCpfsValid = cpfs.every(c => c.replace(/\D/g,'').length === 11);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: 'linear-gradient(135deg,#72e3ff,#669dff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 28px rgba(87,216,255,0.30)',
        }}>
          <TreePine size={22} color="#07101c" />
        </div>
        <div>
          <p style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>Chácaras Itaúna</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>Portaria Digital · Ibiporã – PR</p>
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 24, padding: 'clamp(28px,6vw,40px)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
      }}>

        {/* ── MODO PORTEIRO ── */}
        {isPorteiro && convite && pStep === 'detalhe' && (
          <div style={{ animation: 'slideIn 0.3s ease both' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: CYAN, letterSpacing: '0.06em', marginBottom: 6 }}>MODO PORTEIRO · LIBERAÇÃO DIRETA</p>
            {/* Convite info */}
            <div style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 18, background: 'rgba(87,216,255,0.07)', border: '1px solid rgba(87,216,255,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{TIPO_LABEL[convite.tipo]?.emoji}</span>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 16, color: '#fff', lineHeight: 1 }}>{convite.visitante_nome}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{TIPO_LABEL[convite.tipo]?.label}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Home size={12} style={{ color: CYAN }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Unidade <strong style={{ color: '#fff' }}>{formatUnidade(convite.chacara_bloco, Number(convite.chacara_numero))}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CalendarDays size={12} style={{ color: CYAN }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>
                    {new Date(convite.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')} · {PERIODO_LABEL[convite.periodo ?? 'dia_todo']}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={12} style={{ color: CYAN }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{convite.ocupantes_declarados ?? convite.num_pessoas} pessoa{(convite.ocupantes_declarados ?? convite.num_pessoas) > 1 ? 's' : ''} declarada{(convite.ocupantes_declarados ?? convite.num_pessoas) > 1 ? 's' : ''}</span>
                </div>
                {convite.veiculo_placa && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Car size={12} style={{ color: CYAN }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{convite.veiculo_placa} · {convite.veiculo_tipo ?? '—'}</span>
                  </div>
                )}
                {convite.lote_lat && convite.lote_lng && (
                  <a href={`https://maps.google.com/?q=${convite.lote_lat},${convite.lote_lng}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <MapPin size={12} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: 12, color: '#f59e0b' }}>{convite.lote_referencia ?? 'Ver no mapa'}</span>
                  </a>
                )}
              </div>
            </div>
            {/* Verificação porteiro */}
            <form onSubmit={handlePorteiroLiberar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Placa verificada</label>
                  <input type="text" placeholder={convite.veiculo_placa ?? 'Sem veículo'} value={pPlaca}
                    onChange={e => setPPlaca(e.target.value.toUpperCase())} maxLength={8}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', padding: '10px 12px', fontSize: 14, outline: 'none', letterSpacing: '0.1em' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Ocupantes verificados</label>
                  <input type="number" min={1} max={20} value={pOcupantes} onChange={e => setPOcupantes(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', padding: '10px 12px', fontSize: 14, outline: 'none' }} />
                </div>
              </div>
              <button type="button" onClick={() => setPDocOk(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${pDocOk ? GREEN : 'rgba(255,255,255,0.15)'}`,
                background: pDocOk ? `${GREEN}14` : 'rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${pDocOk ? GREEN : 'rgba(255,255,255,0.3)'}`, background: pDocOk ? GREEN : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {pDocOk && <CheckCircle2 size={12} color="#07101c" />}
                </div>
                <span style={{ fontSize: 13, color: pDocOk ? '#fff' : 'rgba(255,255,255,0.55)' }}>Documento conferido</span>
              </button>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Observação (opcional)</label>
                <input type="text" placeholder="Ex: 2 caixas no porta-malas..." value={pObs} onChange={e => setPObs(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', padding: '10px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <button type="submit" style={{
                width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg,#72e3ff,#669dff)', color: '#07101c',
                fontWeight: 900, fontSize: 15, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <CheckCircle2 size={18} /> Registrar Entrada
              </button>
            </form>
          </div>
        )}

        {isPorteiro && pStep === 'liberando' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px', border: `3px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Registrando entrada...</p>
          </div>
        )}

        {isPorteiro && pStep === 'liberado' && convite && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: `${GREEN}14`, border: `2px solid ${GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
              <CheckCircle2 size={36} style={{ color: GREEN }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: GREEN, marginBottom: 10 }}>Entrada registrada!</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              <strong style={{ color: '#fff' }}>{convite.visitante_nome}</strong><br />
              Chácara {convite.chacara_numero} · {pOcupantes} pessoa{pOcupantes > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {isPorteiro && pStep === 'erro' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <XCircle size={48} style={{ color: RED, margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontSize: 20, fontWeight: 900, color: RED, marginBottom: 8 }}>Erro ao registrar</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Tente novamente ou registre manualmente na portaria.</p>
            <button onClick={() => setPStep('detalhe')} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, border: `1px solid ${RED}`, background: `${RED}14`, color: RED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Tentar novamente</button>
          </div>
        )}

        {/* ── Carregando (modo visitante) ── */}
        {!isPorteiro && step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
              border: `3px solid ${CYAN}`, borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Carregando convite...</p>
          </div>
        )}

        {/* ── Não encontrado ── */}
        {!isPorteiro && step === 'not_found' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <XCircle size={48} style={{ color: RED, margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Convite não encontrado</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Este link pode ser inválido ou já foi removido.<br />Solicite um novo convite ao morador.
            </p>
          </div>
        )}

        {/* ── Expirado ── */}
        {!isPorteiro && step === 'expired' && convite && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Clock size={48} style={{ color: '#f59e0b', margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Convite expirado</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Este convite era válido para<br /><strong style={{ color: '#fff' }}>{fmtData(convite.data_visita)}</strong>.<br />
              Solicite um novo convite ao morador.
            </p>
          </div>
        )}

        {/* ── Formulário de CPFs ── */}
        {!isPorteiro && step === 'cpfs' && convite && tipoInfo && (
          <div style={{ animation: 'slideIn 0.3s ease both' }}>
            {/* Header convite */}
            <div style={{
              borderRadius: 14, padding: '14px 16px', marginBottom: 24,
              background: 'rgba(87,216,255,0.07)',
              border: '1px solid rgba(87,216,255,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{tipoInfo.emoji}</span>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 15, color: '#fff', lineHeight: 1 }}>{convite.visitante_nome}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{tipoInfo.label}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Home size={12} style={{ color: CYAN }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Unidade <strong style={{ color: '#fff' }}>{formatUnidade(convite.chacara_bloco, Number(convite.chacara_numero))}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CalendarDays size={12} style={{ color: CYAN }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>{fmtData(convite.data_visita)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={12} style={{ color: CYAN }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{convite.num_pessoas} pessoa{convite.num_pessoas > 1 ? 's' : ''}</span>
                </div>
                {convite.veiculo_placa && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Car size={12} style={{ color: CYAN }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Veículo: {convite.veiculo_placa}</span>
                  </div>
                )}
                {convite.lote_lat && convite.lote_lng && (
                  <a href={`https://maps.google.com/?q=${convite.lote_lat},${convite.lote_lng}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <MapPin size={12} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: 12, color: '#f59e0b' }}>{convite.lote_referencia ?? 'Ver localização no mapa'}</span>
                  </a>
                )}
              </div>
            </div>

            {/* CPFs */}
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              Informe o CPF de cada pessoa que está entrando
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 18, lineHeight: 1.55 }}>
              Obrigatório para registro de acesso e segurança do condomínio.
            </p>

            <form onSubmit={handleSubmitCpfs}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {cpfs.map((cpf, idx) => {
                  const digits = cpf.replace(/\D/g,'').length;
                  const valid = digits === 11;
                  return (
                    <div key={idx}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 5 }}>
                        {idx === 0 ? 'CPF do titular' : `CPF — pessoa ${idx + 1}`}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="tel"
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={e => setCpf(idx, e.target.value)}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.07)',
                            border: `1.5px solid ${valid ? GREEN : digits > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}`,
                            borderRadius: 12, color: '#fff',
                            padding: '14px 44px 14px 16px', fontSize: 18,
                            letterSpacing: '0.1em', outline: 'none',
                            fontFamily: 'monospace',
                            transition: 'border-color 0.2s',
                          }}
                          onFocus={e => { if (!valid) e.target.style.borderColor = CYAN; }}
                          onBlur={e => { if (!valid) e.target.style.borderColor = digits > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'; }}
                        />
                        {valid && (
                          <CheckCircle2 size={16} style={{
                            position: 'absolute', right: 14, top: '50%',
                            transform: 'translateY(-50%)', color: GREEN,
                          }} />
                        )}
                      </div>
                      {/* Indicador de progresso */}
                      <div style={{ display: 'flex', gap: 3, marginTop: 5, paddingLeft: 2 }}>
                        {Array.from({ length: 11 }).map((_, i) => (
                          <div key={i} style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: i < digits ? CYAN : 'rgba(255,255,255,0.12)',
                            transition: 'background 0.12s',
                          }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={!allCpfsValid || submitting}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  background: allCpfsValid && !submitting
                    ? 'linear-gradient(135deg,#72e3ff,#669dff)'
                    : 'rgba(255,255,255,0.08)',
                  color: allCpfsValid && !submitting ? '#07101c' : 'rgba(255,255,255,0.3)',
                  fontWeight: 800, fontSize: 16,
                  cursor: allCpfsValid && !submitting ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                {submitting ? 'Enviando...' : <><ChevronRight size={18} /> Chamar portaria</>}
              </button>
            </form>
          </div>
        )}

        {/* ── Portaria ocupada ── */}
        {!isPorteiro && step === 'busy' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 2s ease infinite',
            }}>
              <Clock size={28} style={{ color: '#f59e0b' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', marginBottom: 10 }}>Portaria ocupada</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              A portaria está atendendo outro visitante.<br />
              Você será chamado automaticamente em instantes{dots}
            </p>
          </div>
        )}

        {/* ── Aguardando ── */}
        {!isPorteiro && step === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: `${CYAN}14`, border: `2px solid ${CYAN}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 1.8s ease infinite',
            }}>
              <TreePine size={28} style={{ color: CYAN }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 10 }}>Aguardando{dots}</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              Solicitação enviada à portaria.<br />Em instantes você receberá a confirmação.
            </p>
            {convite && (
              <div style={{
                marginTop: 20, padding: '14px 20px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>{convite.visitante_nome}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  Unidade {formatUnidade(convite.chacara_bloco, Number(convite.chacara_numero))} · {convite.num_pessoas} pessoa{convite.num_pessoas > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Aprovado ── */}
        {!isPorteiro && step === 'approved' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: `${GREEN}14`, border: `2px solid ${GREEN}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both',
            }}>
              <CheckCircle2 size={36} style={{ color: GREEN }} />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: GREEN, marginBottom: 10 }}>Entrada liberada!</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
              Seja muito bem-vindo(a),<br /><strong style={{ color: '#fff' }}>{convite?.visitante_nome}</strong>.
            </p>
            <div style={{
              marginTop: 24, padding: '14px 20px', borderRadius: 14,
              background: `${GREEN}0c`, border: `1px solid ${GREEN}28`,
              fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
            }}>
              Apresente esta tela ao porteiro se solicitado.
            </div>
          </div>
        )}

        {/* ── Negado ── */}
        {!isPorteiro && step === 'denied' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: `${RED}14`, border: `2px solid ${RED}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <XCircle size={36} style={{ color: RED }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: RED, marginBottom: 10 }}>Acesso não autorizado</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              Dirija-se à portaria para mais informações.
            </p>
          </div>
        )}

      </div>

      <p style={{ marginTop: 28, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Condomínio Chácaras Itaúna · Ibiporã – PR
      </p>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse   { 0%,100% { box-shadow:0 0 0 0 rgba(87,216,255,0.3); } 50% { box-shadow:0 0 0 14px rgba(87,216,255,0); } }
        @keyframes popIn   { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
};
