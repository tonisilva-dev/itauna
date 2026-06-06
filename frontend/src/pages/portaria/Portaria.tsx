import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, Car, User, Clock, CheckCircle2, Plus, Loader2,
  Trash2, UserPlus, AlertTriangle, Package, Wrench,
  CalendarDays, QrCode, Download, Check, X, CalendarPlus,
  RefreshCw, BadgeCheck, Users, ListChecks,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import {
  fetchPortariaHoje, fetchPortariaByDate,
  fetchPortariaAutorizados,
  insertPortariaEntrada, registerPortariaSaida,
  insertPortariaAutorizado, removePortariaAutorizado,
  fetchSolicitacoesPendentes, resolverSolicitacao,
  updateConvite,
  fetchConvitesProgramados,
  fetchEncomendasPendentes, insertEncomenda, marcarEncomendaRetirada,
  type DbPortariaRegistro, type DbPortariaAutorizado, type DbSolicitacao,
  type DbConvite, type DbEncomenda,
} from '@/lib/supabase-queries';
import { gotoSlide } from '../../utils/format';

/* ── Apito (Web Audio API) ── */
function tocarApito() {
  try {
    const ctx  = new AudioContext();
    const play = (freq: number, start: number, dur: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    play(880, 0, 0.28);
    play(1320, 0.30, 0.45);
  } catch {}
}

const GREEN  = '#10b981';
const CYAN   = '#57d8ff';
const BLUE   = '#5a84ff';
const YELLOW = '#f59e0b';
const RED    = '#ef4444';
const TODAY  = new Date().toISOString().slice(0, 10);

const TIPO_CONFIG = {
  visitante: { icon: User,    color: CYAN,   label: 'Visitante', bg: 'rgba(87,216,255,0.08)'  },
  entrega:   { icon: Package, color: YELLOW, label: 'Entrega',   bg: 'rgba(245,158,11,0.08)'  },
  servico:   { icon: Wrench,  color: BLUE,   label: 'Prestador', bg: 'rgba(90,132,255,0.08)'  },
};

const VISITA_TIPO = {
  convidado: { emoji: '👤', label: 'Convidado' },
  prestador: { emoji: '🔧', label: 'Prestador' },
  entrega:   { emoji: '📦', label: 'Entrega'   },
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const fmtCpfMask = (cpf: string | null) => {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

const isVencido = (validade: string | null) => {
  if (!validade) return false;
  return validade < new Date().toISOString().slice(0, 10);
};

export const Portaria = () => {
  const { user } = useAuth();

  /* ── Estado ── */
  const [visitas, setVisitas]         = useState<DbPortariaRegistro[]>([]);
  const [histVisitas, setHistVisitas] = useState<DbPortariaRegistro[]>([]);
  const [autorizados, setAutorizados] = useState<DbPortariaAutorizado[]>([]);
  const [loading, setLoading]         = useState(true);
  const [histDate, setHistDate]       = useState(TODAY);
  const [histLoading, setHistLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState<'movimento' | 'autorizados'>('movimento');
  const [tipoFilter, setTipoFilter]   = useState('');
  const [removeId, setRemoveId]     = useState<string | null>(null);
  const [removeName, setRemoveName] = useState('');

  // Solicitações QR
  const [solicitacoes, setSolicitacoes]   = useState<DbSolicitacao[]>([]);
  const [resolvendo, setResolvendo]       = useState<string | null>(null);
  const [portariaAtiva, setPortariaAtiva] = useState<1 | 2>(1);
  const [cardState, setCardState]         = useState<Record<string, { pessoas: number; cpfOk: boolean }>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Gerador QR
  const [qrUrls, setQrUrls] = useState<{ p1: string; p2: string } | null>(null);

  // Form entrada manual
  const [nome, setNome]           = useState('');
  const [veiculo, setVeiculo]     = useState('');
  const [tipo, setTipo]           = useState<DbPortariaRegistro['tipo']>('visitante');
  const [destino, setDestino]     = useState('chacara');
  const [chacara, setChacara]     = useState('');
  const [areaComum, setAreaComum] = useState('Portaria');
  const [submitting, setSubmitting] = useState(false);

  // Form autorizado
  const [autNome, setAutNome]         = useState('');
  const [autChacara, setAutChacara]   = useState('');
  const [autDias, setAutDias]         = useState('');
  const [autValidade, setAutValidade] = useState('');
  const [submittingAut, setSubmittingAut] = useState(false);

  // Visitas programadas
  const [visitasProg, setVisitasProg]                     = useState<DbConvite[]>([]);
  const [visitasProgLoading, setVisitasProgLoading]       = useState(false);
  const [visitasProgFilter, setVisitasProgFilter]         = useState<'hoje' | 'semana'>('hoje');

  // Encomendas
  const [encomendas, setEncomendas]     = useState<DbEncomenda[]>([]);
  const [encFilter, setEncFilter]       = useState<'aguardando' | 'todas'>('aguardando');
  const [encChacara, setEncChacara]     = useState('');
  const [encDesc, setEncDesc]           = useState('');
  const [encTipo, setEncTipo]           = useState<DbEncomenda['tipo']>('outro');
  const [encRemetente, setEncRemetente] = useState('');
  const [encSaving, setEncSaving]       = useState(false);

  /* ── Carga inicial ── */
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchPortariaHoje(),
      fetchPortariaAutorizados(),
      fetchEncomendasPendentes(),
    ]).then(([vis, aut, encs]) => {
      setVisitas(vis as DbPortariaRegistro[]);
      setHistVisitas(vis as DbPortariaRegistro[]);
      setAutorizados(aut as DbPortariaAutorizado[]);
      setEncomendas(encs as DbEncomenda[]);
    }).catch(() => toast.error('Erro ao carregar dados da portaria.'))
      .finally(() => setLoading(false));
  }, [user]);

  /* ── Realtime: solicitações QR ── */
  useEffect(() => {
    if (!user) return;
    fetchSolicitacoesPendentes().then(setSolicitacoes).catch(() => {});
    loadVisitasProg();

    const todayStr = new Date().toISOString().slice(0, 10);

    channelRef.current = supabase
      .channel('portaria-ops')

      /* ── Solicitações QR ── */
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portaria_solicitacoes' }, payload => {
        const nova = payload.new as DbSolicitacao;
        if (nova.status === 'pendente') {
          tocarApito();
          setSolicitacoes(prev => [nova, ...prev]);
          toast(`🔔 Solicitação na Portaria ${nova.portaria_id}!`, {
            duration: 6000,
            style: { background: 'rgba(87,216,255,0.15)', border: '1px solid rgba(87,216,255,0.4)', color: '#fff' },
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'portaria_solicitacoes' }, payload => {
        const upd = payload.new as DbSolicitacao;
        if (upd.status !== 'pendente') setSolicitacoes(prev => prev.filter(s => s.id !== upd.id));
      })

      /* ── Convites: novo agendamento pelo morador → atualiza Agenda ── */
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portaria_convites' }, payload => {
        const novo = payload.new as DbConvite;
        if (novo.data_visita >= todayStr && novo.status === 'ativo') {
          setVisitasProg(prev => {
            if (prev.some(v => v.id === novo.id)) return prev;
            return [novo, ...prev].sort((a, b) => a.data_visita.localeCompare(b.data_visita));
          });
          toast(`📅 Nova visita: ${novo.visitante_nome} → Chácara ${novo.chacara_numero}`, {
            duration: 5000,
            style: { background: 'rgba(87,216,255,0.10)', border: '1px solid rgba(87,216,255,0.3)', color: '#fff' },
          });
        }
      })

      /* ── Encomendas: nova registrada por outro operador ── */
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portaria_encomendas' }, payload => {
        const enc = payload.new as DbEncomenda;
        setEncomendas(prev => {
          if (prev.some(e => e.id === enc.id)) return prev;
          return [enc, ...prev];
        });
      })

      /* ── Registros: multi-operador — entrada registrada por outro porteiro ── */
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portaria_registros' }, payload => {
        const nova = payload.new as DbPortariaRegistro;
        setVisitas(prev => {
          if (prev.some(v => v.id === nova.id)) return prev;
          return [nova, ...prev];
        });
        setHistVisitas(prev => {
          if (prev.some(v => v.id === nova.id)) return prev;
          return [nova, ...prev];
        });
      })

      /* ── Registros: saída registrada por outro porteiro ── */
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'portaria_registros' }, payload => {
        const upd = payload.new as DbPortariaRegistro;
        const patch = (v: DbPortariaRegistro) => v.id === upd.id ? { ...v, ...upd } : v;
        setVisitas(prev => prev.map(patch));
        setHistVisitas(prev => prev.map(patch));
      })

      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [user]);

  const setCard = (id: string, patch: Partial<{ pessoas: number; cpfOk: boolean }>) =>
    setCardState(prev => ({ ...prev, [id]: { pessoas: prev[id]?.pessoas ?? 1, cpfOk: prev[id]?.cpfOk ?? false, ...patch } }));

  /* ── Resolver solicitação QR ── */
  const handleResolver = useCallback(async (sol: DbSolicitacao, acao: 'aprovado' | 'negado') => {
    if (!user) return;
    setResolvendo(sol.id);
    try {
      let registroId: string | undefined;
      if (acao === 'aprovado') {
        const pessoas = cardState[sol.id]?.pessoas ?? sol.num_pessoas ?? 1;
        const entrada = await insertPortariaEntrada({
          nome:           sol.visitante_nome + (pessoas > 1 ? ` (+${pessoas - 1})` : ''),
          veiculo:        sol.visitante_veiculo ?? null,
          tipo:           'visitante',
          destino:        sol.chacara_numero && sol.chacara_numero !== '—' ? `Chácara ${sol.chacara_numero}` : 'Portaria',
          registrado_por: user.id,
        });
        registroId = entrada.id;
        setVisitas(prev => [entrada, ...prev]);
        if (histDate === TODAY) setHistVisitas(prev => [entrada, ...prev]);
        if (sol.convite_id) { try { await updateConvite(sol.convite_id, { status: 'usado', portaria_id: sol.portaria_id }); } catch {} }
        toast.success(`Entrada de ${sol.visitante_nome} liberada.`);
      } else {
        toast(`Acesso de ${sol.visitante_nome} negado.`, { icon: '🚫' });
      }
      await resolverSolicitacao(sol.id, acao, user.id, undefined, registroId);
      setSolicitacoes(prev => prev.filter(s => s.id !== sol.id));
    } catch {
      toast.error('Erro ao processar solicitação.');
    } finally {
      setResolvendo(null);
    }
  }, [user, histDate, cardState]);

  /* ── Gerar QR das portarias ── */
  const gerarQRs = useCallback(async () => {
    try {
      const opt = { width: 320, margin: 2, color: { dark: '#ffffff', light: '#07101c' } };
      const [p1, p2] = await Promise.all([
        QRCode.toDataURL(`${window.location.origin}/acesso?p=1`, opt),
        QRCode.toDataURL(`${window.location.origin}/acesso?p=2`, opt),
      ]);
      setQrUrls({ p1, p2 });
    } catch { toast.error('Erro ao gerar QR Codes.'); }
  }, []);

  const baixarQR = (dataUrl: string, p: number) => {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = `qr-portaria-${p}.png`; a.click();
  };

  /* ── Histórico por data ── */
  const loadHistDate = async (date: string) => {
    setHistDate(date); setHistLoading(true);
    try {
      const data = date === TODAY ? visitas : await fetchPortariaByDate(date);
      setHistVisitas(data);
    } catch { toast.error('Erro ao carregar histórico.'); }
    finally { setHistLoading(false); }
  };

  /* ── Handlers ── */
  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    if (destino === 'chacara' && !chacara.trim()) { toast.error('Informe a chácara.'); return; }
    const destinoStr = destino === 'chacara' ? `Chácara ${chacara.padStart(3, '0')}` : destino === 'portaria' ? 'Portaria' : areaComum;
    setSubmitting(true);
    try {
      const entry = await insertPortariaEntrada({
        nome: nome.trim(), veiculo: veiculo.trim() || null,
        tipo, destino: destinoStr, registrado_por: user!.id,
      });
      setVisitas(prev => [entry, ...prev]);
      if (histDate === TODAY) setHistVisitas(prev => [entry, ...prev]);
      setNome(''); setVeiculo(''); setChacara('');
      toast.success('Entrada registrada!');
    } catch { toast.error('Erro ao registrar entrada.'); }
    finally { setSubmitting(false); }
  };

  const handleRegisterExit = async (id: string) => {
    try {
      await registerPortariaSaida(id);
      const patch = (v: DbPortariaRegistro) => v.id === id ? { ...v, status: 'saiu' as const, saida_at: new Date().toISOString() } : v;
      setVisitas(prev => prev.map(patch));
      setHistVisitas(prev => prev.map(patch));
      toast.success('Saída registrada.');
    } catch { toast.error('Erro ao registrar saída.'); }
  };

  const handleCreateAutorizado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autNome.trim()) { toast.error('Informe o nome.'); return; }
    setSubmittingAut(true);
    try {
      const novo = await insertPortariaAutorizado({
        nome: autNome.trim(), chacara: autChacara.trim() || null,
        dias: autDias.trim() || null, validade: autValidade || null, created_by: user!.id,
      });
      setAutorizados(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setAutNome(''); setAutChacara(''); setAutDias(''); setAutValidade('');
      toast.success('Autorizado cadastrado!');
      gotoSlide(5);
    } catch { toast.error('Erro ao cadastrar.'); }
    finally { setSubmittingAut(false); }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    try {
      await removePortariaAutorizado(removeId);
      setAutorizados(prev => prev.filter(a => a.id !== removeId));
      toast.success('Autorização revogada.');
    } catch { toast.error('Erro ao revogar.'); }
    finally { setRemoveId(null); setRemoveName(''); }
  };

  const loadVisitasProg = useCallback(async () => {
    setVisitasProgLoading(true);
    try {
      const data = await fetchConvitesProgramados();
      setVisitasProg(data);
    } catch { toast.error('Erro ao carregar visitas programadas.'); }
    finally { setVisitasProgLoading(false); }
  }, []);

  const handleRegistrarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!encChacara.trim()) { toast.error('Informe o número da chácara.'); return; }
    if (!encDesc.trim()) { toast.error('Informe a descrição da encomenda.'); return; }
    setEncSaving(true);
    try {
      const chNum = encChacara.trim().padStart(3, '0');
      const nova = await insertEncomenda({
        chacara_numero: chNum,
        descricao: encDesc.trim(),
        tipo: encTipo,
        remetente: encRemetente.trim() || null,
        registrado_por: user.id,
      });
      setEncomendas(prev => [nova, ...prev]);
      setEncChacara(''); setEncDesc(''); setEncRemetente(''); setEncTipo('outro');
      toast.success(`Encomenda registrada para Chácara ${chNum}. Morador notificado!`);
    } catch { toast.error('Erro ao registrar encomenda.'); }
    finally { setEncSaving(false); }
  };

  const handleMarcarRetirada = async (id: string, descricao: string) => {
    try {
      await marcarEncomendaRetirada(id);
      setEncomendas(prev => prev.map(e => e.id === id
        ? { ...e, status: 'retirada' as const, retirada_at: new Date().toISOString() }
        : e
      ));
      toast.success(`Retirada de "${descricao}" confirmada.`);
    } catch { toast.error('Erro ao confirmar retirada.'); }
  };

  /* ── Derivados ── */
  const dentroCount   = visitas.filter(v => v.status === 'dentro').length;
  const vencidosCount = autorizados.filter(a => isVencido(a.validade)).length;
  const filteredVisitas = tipoFilter ? histVisitas.filter(v => v.tipo === tipoFilter) : histVisitas;
  const solPortaria = solicitacoes.filter(s => (s.portaria_id ?? 1) === portariaAtiva);
  const TODAY_STR    = new Date().toISOString().slice(0, 10);
  const visitasHoje    = visitasProg.filter(v => v.data_visita === TODAY_STR);
  const visitasFuturas = visitasProg.filter(v => v.data_visita > TODAY_STR);
  const visitasFiltradas = visitasProgFilter === 'hoje' ? visitasHoje : visitasProg;

  /* ════════════════════════════════════════════════════════════════
     SLIDES
  ════════════════════════════════════════════════════════════════ */

  /* ── Slide 0 — Ao Vivo ── */
  const slideAoVivo: SlideItem = {
    key: 'portaria-ao-vivo',
    label: 'Ao Vivo',
    content: (
      <SlidePanel
        eyebrow="Central de Segurança"
        title={<>Ao <span className="grad-text">Vivo</span></>}
        badges={[
          { icon: '🛡️', label: 'Monitoramento 24h' },
          { icon: dentroCount > 0 ? '🟡' : '🟢', label: `${dentroCount} dentro agora` },
          { icon: '⚡', label: 'Tempo Real' },
        ]}
        actions={
          <button onClick={() => gotoSlide(1)} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
            <Shield size={13} /> Solicitações
          </button>
        }
      >
        <div className="flex flex-col h-full gap-3">
          {/* Seletor Portaria */}
          <div className="flex gap-1 p-0.5 rounded-xl bg-white/5">
            {([1, 2] as const).map(p => {
              const count = solicitacoes.filter(s => (s.portaria_id ?? 1) === p).length;
              return (
                <button key={p} onClick={() => setPortariaAtiva(p)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: portariaAtiva === p ? 'rgba(87,216,255,0.15)' : 'transparent',
                    color: portariaAtiva === p ? CYAN : 'rgba(255,255,255,0.45)',
                    border: portariaAtiva === p ? '1px solid rgba(87,216,255,0.25)' : '1px solid transparent',
                  }}>
                  <Shield size={12} /> Portaria {p}
                  {count > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full animate-pulse" style={{ background: RED, color: '#fff' }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Solicitações pendentes */}
          {solPortaria.length > 0 && (
            <div className="space-y-2.5">
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: CYAN, letterSpacing: '0.05em' }}>SOLICITAÇÕES PENDENTES</p>
              {solPortaria.slice(0, 2).map(sol => {
                const isProc  = resolvendo === sol.id;
                const cs      = cardState[sol.id] ?? { pessoas: sol.num_pessoas ?? 1, cpfOk: false };
                const temConvite = !!sol.convite_id;
                const temRecorrente = !!sol.recorrente_id;
                return (
                  <div key={sol.id} className="rounded-2xl p-3" style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.22)' }}>
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.25)' }}>
                        <User size={14} style={{ color: CYAN }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.82rem' }}>{sol.visitante_nome}</p>
                          {temConvite && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.15)', color: GREEN, border: '1px solid rgba(16,185,129,0.3)' }}>CONVITE</span>}
                          {temRecorrente && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(90,132,255,0.15)', color: BLUE, border: '1px solid rgba(90,132,255,0.3)' }}>RECORRENTE</span>}
                          {!temConvite && !temRecorrente && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: YELLOW, border: '1px solid rgba(245,158,11,0.3)' }}>SEM CADASTRO</span>}
                        </div>
                        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
                          {sol.chacara_numero && sol.chacara_numero !== '—' ? `Chácara ${sol.chacara_numero}` : 'Sem chácara'} · {fmtTime(sol.created_at)}
                        </p>
                        {sol.visitante_cpf && <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>CPF: {fmtCpfMask(sol.visitante_cpf)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <button onClick={() => setCard(sol.id, { cpfOk: !cs.cpfOk })}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                        style={{ background: cs.cpfOk ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', color: cs.cpfOk ? GREEN : 'rgba(255,255,255,0.5)', border: `1px solid ${cs.cpfOk ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                        {cs.cpfOk ? <Check size={10} /> : <BadgeCheck size={10} />} Doc. conferido
                      </button>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Users size={10} style={{ color: 'rgba(255,255,255,0.4)' }} />
                        <span className="text-[10px] text-white/50 font-bold">Pessoas:</span>
                        <button onClick={() => setCard(sol.id, { pessoas: Math.max(1, cs.pessoas - 1) })} className="w-4 h-4 rounded flex items-center justify-center cursor-pointer text-[10px]" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>−</button>
                        <span className="text-xs font-bold text-white w-4 text-center">{cs.pessoas}</span>
                        <button onClick={() => setCard(sol.id, { pessoas: cs.pessoas + 1 })} className="w-4 h-4 rounded flex items-center justify-center cursor-pointer text-[10px]" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>+</button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={isProc} onClick={() => handleResolver(sol, 'aprovado')}
                        className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.35)' }}>
                        {isProc ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} />} Liberar
                      </button>
                      <button disabled={isProc} onClick={() => handleResolver(sol, 'negado')}
                        className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                        style={{ background: 'rgba(239,68,68,0.10)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <X size={12} /> Negar
                      </button>
                    </div>
                  </div>
                );
              })}
              {solPortaria.length > 2 && (
                <button onClick={() => gotoSlide(1)} className="w-full py-1.5 rounded-xl text-[10px] font-bold cursor-pointer" style={{ background: 'rgba(87,216,255,0.07)', color: CYAN, border: '1px solid rgba(87,216,255,0.18)' }}>
                  + {solPortaria.length - 2} mais na fila → ver tudo
                </button>
              )}
            </div>
          )}

          {/* Dentro agora */}
          <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-3 flex-1 flex flex-col min-h-[100px]">
            <div className="mb-2">
              <h3 className="text-white text-xs font-bold">Atualmente no Condomínio</h3>
              <p className="text-[10px] text-white/30">Entradas com saída pendente</p>
            </div>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-4 text-white/30 text-[10px]"><Loader2 size={13} className="animate-spin" /> Carregando...</div>
              ) : visitas.filter(v => v.status === 'dentro').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                  <CheckCircle2 className="w-6 h-6" style={{ color: 'rgba(16,185,129,0.4)' }} />
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Condomínio livre.</p>
                </div>
              ) : visitas.filter(v => v.status === 'dentro').map(v => {
                const tc = TIPO_CONFIG[v.tipo];
                return (
                  <div key={v.id} className="flex items-center gap-2.5 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}><tc.icon size={13} style={{ color: tc.color }} /></div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{v.nome}</p>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>{v.veiculo ?? 'Sem veículo'} · {v.destino} · {fmtTime(v.entrada_at)}</p>
                    </div>
                    <button onClick={() => handleRegisterExit(v.id)} className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>Saída</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Entradas hoje" value={String(visitas.length)}    icon={Car}          iconColor={CYAN}  iconBg="rgba(87,216,255,0.08)" />
            <StatCard label="Aut. Vencidos" value={String(vencidosCount)}     icon={Clock}        iconColor={YELLOW} iconBg="rgba(245,158,11,0.08)" />
          </div>
        </div>
      </SlidePanel>
    ),
  };

  /* ── Slide 1 — Agenda ── */
  const slideAgenda: SlideItem = {
    key: 'portaria-agenda',
    label: 'Agenda',
    content: (
      <SlidePanel
        eyebrow="Agenda da Portaria"
        title={<>Visitas <span className="grad-text">Programadas</span></>}
        badges={[
          { icon: '📅', label: `${visitasHoje.length} hoje` },
          { icon: '🔮', label: `${visitasFuturas.length} futuras` },
          { icon: '✅', label: 'Pré-cadastradas' },
        ]}
        actions={
          <button onClick={loadVisitasProg} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
            <RefreshCw size={12} /> Atualizar
          </button>
        }
      >
        <div className="flex flex-col h-full gap-3">
          <div className="flex gap-1 p-0.5 rounded-xl bg-white/5">
            {([
              { v: 'hoje',   l: `📅 Hoje (${visitasHoje.length})` },
              { v: 'semana', l: `🗓️ Próximas (${visitasProg.length})` },
            ] as const).map(f => (
              <button key={f.v} onClick={() => setVisitasProgFilter(f.v)}
                className="flex-1 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                style={{
                  background: visitasProgFilter === f.v ? 'rgba(87,216,255,0.15)' : 'transparent',
                  color: visitasProgFilter === f.v ? CYAN : 'rgba(255,255,255,0.45)',
                  border: visitasProgFilter === f.v ? '1px solid rgba(87,216,255,0.25)' : '1px solid transparent',
                }}>
                {f.l}
              </button>
            ))}
          </div>

          {visitasProgLoading ? (
            <div className="flex items-center justify-center gap-2 flex-1 text-white/30 text-xs">
              <Loader2 size={14} className="animate-spin" /> Carregando...
            </div>
          ) : visitasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(87,216,255,0.06)', border: '1px solid rgba(87,216,255,0.14)' }}>
                <CalendarDays size={24} style={{ color: 'rgba(87,216,255,0.5)' }} />
              </div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                {visitasProgFilter === 'hoje' ? 'Nenhuma visita agendada para hoje.' : 'Nenhuma visita programada.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
              {visitasFiltradas.map(v => {
                const vt = VISITA_TIPO[v.tipo];
                const isToday = v.data_visita === TODAY_STR;
                const usado = v.status === 'usado';
                return (
                  <div key={v.id} className="rounded-2xl p-3" style={{
                    background: usado ? 'rgba(16,185,129,0.05)' : isToday ? 'rgba(87,216,255,0.06)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${usado ? 'rgba(16,185,129,0.22)' : isToday ? 'rgba(87,216,255,0.22)' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {vt.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.82rem' }}>{v.visitante_nome}</p>
                          {usado && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.15)', color: GREEN, border: '1px solid rgba(16,185,129,0.3)' }}>ENTROU</span>}
                          {isToday && !usado && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md animate-pulse" style={{ background: 'rgba(245,158,11,0.15)', color: YELLOW, border: '1px solid rgba(245,158,11,0.3)' }}>HOJE</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>🏡 Chácara {v.chacara_numero}</span>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>·</span>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
                            📅 {new Date(v.data_visita + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>·</span>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>👥 {v.num_pessoas}p</span>
                        </div>
                        {v.morador && (
                          <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                            Morador: {v.morador.full_name}
                          </p>
                        )}
                        {v.visitante_cpf && (
                          <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', marginTop: 1 }}>
                            CPF: {fmtCpfMask(v.visitante_cpf)}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700,
                        padding: '2px 6px', borderRadius: 6, flexShrink: 0,
                        background: vt.emoji === '👤' ? 'rgba(87,216,255,0.1)' : vt.emoji === '🔧' ? 'rgba(90,132,255,0.1)' : 'rgba(245,158,11,0.1)',
                        color: vt.emoji === '👤' ? CYAN : vt.emoji === '🔧' ? BLUE : YELLOW,
                      }}>{vt.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, textAlign: 'center' }}>
              📋 Convites pré-cadastrados pelos moradores · QR Code enviado ao convidado
            </p>
          </div>
        </div>
      </SlidePanel>
    ),
  };

  /* ── Slide 2 — Encomendas ── */
  const slideEncomendas: SlideItem = {
    key: 'portaria-encomendas',
    label: 'Encomendas',
    content: (
      <SlidePanel
        eyebrow="Correspondências & Entregas"
        title={<>Controle de <span className="grad-text">Encomendas</span></>}
        badges={[
          { icon: '📦', label: `${encomendas.filter(e => e.status === 'aguardando').length} aguardando` },
          { icon: '🔔', label: 'Morador notificado' },
          { icon: '✅', label: 'Retirada confirmada' },
        ]}
      >
        <div className="flex flex-col h-full gap-3">
          <form onSubmit={handleRegistrarEncomenda} className="rounded-2xl p-3 space-y-2.5" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: YELLOW, letterSpacing: '0.05em' }}>REGISTRAR NOVA ENCOMENDA</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="input-label text-[11px]">Nº da Chácara *</label>
                <input type="text" className="input" inputMode="numeric" placeholder="Ex: 042" maxLength={3}
                  value={encChacara} onChange={e => setEncChacara(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="input-label text-[11px]">Tipo</label>
                <select className="input" value={encTipo} onChange={e => setEncTipo(e.target.value as DbEncomenda['tipo'])}>
                  <option value="correios">📮 Correios / Sedex</option>
                  <option value="motoboy">🛵 Motoboy</option>
                  <option value="app_delivery">📱 App (iFood, etc.)</option>
                  <option value="outro">📦 Outro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="input-label text-[11px]">Descrição *</label>
              <input type="text" className="input" placeholder="Ex: Fatura COPEL, Controle eletrônico..."
                value={encDesc} onChange={e => setEncDesc(e.target.value)} />
            </div>
            <div>
              <label className="input-label text-[11px]">Remetente (opcional)</label>
              <input type="text" className="input" placeholder="Ex: COPEL, Prefeitura..."
                value={encRemetente} onChange={e => setEncRemetente(e.target.value)} />
            </div>
            <button type="submit" disabled={encSaving} className="btn-primary w-full justify-center py-2 text-xs font-bold gap-1.5">
              {encSaving ? <><Loader2 size={12} className="animate-spin" /> Registrando...</> : <><Package size={12} /> Registrar e Notificar Morador</>}
            </button>
          </form>

          <div className="flex gap-1 p-0.5 rounded-xl bg-white/5">
            {([
              { v: 'aguardando', l: `📦 Aguardando (${encomendas.filter(e => e.status === 'aguardando').length})` },
              { v: 'todas',      l: `📋 Todas (${encomendas.length})` },
            ] as const).map(f => (
              <button key={f.v} onClick={() => setEncFilter(f.v)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                style={{
                  background: encFilter === f.v ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: encFilter === f.v ? YELLOW : 'rgba(255,255,255,0.4)',
                  border: encFilter === f.v ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                }}>{f.l}</button>
            ))}
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-white/30 text-xs"><Loader2 size={13} className="animate-spin" /></div>
            ) : encomendas.filter(e => encFilter === 'todas' || e.status === 'aguardando').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={24} style={{ color: 'rgba(16,185,129,0.4)' }} />
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Nenhuma encomenda pendente.</p>
              </div>
            ) : encomendas.filter(e => encFilter === 'todas' || e.status === 'aguardando').map(enc => {
              const tipoLabel: Record<DbEncomenda['tipo'], string> = {
                correios: '📮 Correios', motoboy: '🛵 Motoboy', app_delivery: '📱 App', outro: '📦 Outro',
              };
              const retirada = enc.status === 'retirada';
              return (
                <div key={enc.id} className="rounded-2xl p-3" style={{
                  background: retirada ? 'rgba(16,185,129,0.04)' : 'rgba(245,158,11,0.05)',
                  border: `1px solid ${retirada ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: retirada ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)' }}>
                      {retirada ? '✅' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.78rem' }} className="truncate">{enc.descricao}</p>
                        {retirada && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', color: GREEN }}>RETIRADA</span>}
                        {!retirada && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md animate-pulse" style={{ background: 'rgba(245,158,11,0.12)', color: YELLOW }}>AGUARDANDO</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>🏡 Chácara {enc.chacara_numero}</span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>·</span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{tipoLabel[enc.tipo]}</span>
                        {enc.remetente && <><span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>·</span><span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{enc.remetente}</span></>}
                      </div>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                        {retirada && enc.retirada_at ? `Retirada em ${new Date(enc.retirada_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}` : `Chegou em ${new Date(enc.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}`}
                      </p>
                    </div>
                    {!retirada && (
                      <button onClick={() => handleMarcarRetirada(enc.id, enc.descricao)}
                        className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer flex-shrink-0"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                        Retirada
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SlidePanel>
    ),
  };

  /* ── Slide 3 — Registrar entrada manual ── */
  const slideRegistrar: SlideItem = {
    key: 'portaria-registrar',
    label: 'Registrar',
    content: (
      <SlidePanel
        eyebrow="Registro Manual"
        title={<>Autorizar <span className="grad-text">Nova Entrada</span></>}
        badges={[
          { icon: '✦', label: 'Casos excepcionais' },
          { icon: '🔒', label: 'Log Auditável' },
          { icon: '⌘', label: 'Verificar Documento' },
        ]}
      >
        <form onSubmit={handleRegisterEntry} className="flex flex-col gap-3 py-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Nome Completo *</label>
              <input type="text" className="input" placeholder="Ex: Lucas Santana" value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Veículo & Placa</label>
              <input type="text" className="input" placeholder="Ex: Corolla — ABC-1234" value={veiculo} onChange={e => setVeiculo(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Tipo</label>
              <select className="input" value={tipo} onChange={e => setTipo(e.target.value as DbPortariaRegistro['tipo'])}>
                <option value="visitante">👤 Visitante</option>
                <option value="entrega">📦 Entrega</option>
                <option value="servico">🔧 Prestador</option>
              </select>
            </div>
            <div>
              <label className="input-label text-[11px]">Destino</label>
              <select className="input" value={destino} onChange={e => setDestino(e.target.value)}>
                <option value="chacara">🏡 Chácara</option>
                <option value="portaria">🛡️ Portaria</option>
                <option value="comum">🌿 Área Comum</option>
              </select>
            </div>
          </div>
          {destino === 'chacara' && (
            <div>
              <label className="input-label text-[11px]">Número da Chácara *</label>
              <input type="text" className="input" placeholder="Ex: 042" value={chacara} onChange={e => setChacara(e.target.value.replace(/\D/g, ''))} maxLength={3} required />
            </div>
          )}
          {destino === 'comum' && (
            <div>
              <label className="input-label text-[11px]">Área de Destino</label>
              <select className="input" value={areaComum} onChange={e => setAreaComum(e.target.value)}>
                <option>Salão de Festas</option>
                <option>Quadra Poliesportiva</option>
                <option>Piscina</option>
                <option>Quiosque</option>
                <option>Campo de Futebol</option>
              </select>
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
            {submitting ? <><Loader2 size={13} className="animate-spin" /> Registrando...</> : '✓ Confirmar e Liberar Entrada'}
          </button>
        </form>
      </SlidePanel>
    ),
  };

  /* ── Slide 4 — Histórico ── */
  const slideHistorico: SlideItem = {
    key: 'portaria-historico',
    label: 'Histórico',
    content: (
      <SlidePanel
        eyebrow="Logs & Autorizados"
        title={<>Registros de <span className="grad-text">Acesso</span></>}
        badges={[
          { icon: '📋', label: 'Auditável' },
          { icon: '◈', label: 'Por data' },
          { icon: '✅', label: 'Autorizados' },
        ]}
      >
        <div className="flex flex-col h-full gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-0.5 p-0.5 rounded-xl bg-white/5 w-fit">
              {([
                { v: 'movimento',   l: '🚗 Movimentação' },
                { v: 'autorizados', l: '✅ Autorizados'  },
              ] as const).map(t => (
                <button key={t.v} onClick={() => { setActiveTab(t.v); setTipoFilter(''); }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                  style={{ background: activeTab === t.v ? 'rgba(87,216,255,0.15)' : 'transparent', color: activeTab === t.v ? '#57d8ff' : 'rgba(255,255,255,0.45)', border: activeTab === t.v ? '1px solid rgba(87,216,255,0.25)' : '1px solid transparent' }}>
                  {t.l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input type="date" className="input py-1 px-2 text-[10px]" style={{ width: 130 }} value={histDate} max={TODAY} onChange={e => loadHistDate(e.target.value)} />
            </div>
          </div>

          {activeTab === 'movimento' && (
            <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 w-fit">
              {[{ v: '', l: 'Todos' }, { v: 'visitante', l: '👤 Visitante' }, { v: 'entrega', l: '📦 Entrega' }, { v: 'servico', l: '🔧 Serviço' }].map(f => (
                <button key={f.v} onClick={() => setTipoFilter(f.v)} className={`px-2 py-1 rounded text-[9.5px] cursor-pointer font-bold whitespace-nowrap transition-all ${tipoFilter === f.v ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'}`}>{f.l}</button>
              ))}
            </div>
          )}

          {activeTab === 'movimento' && (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {(loading || histLoading) ? (
                <div className="flex items-center justify-center gap-2 py-8 text-white/30 text-xs"><Loader2 size={14} className="animate-spin" /></div>
              ) : filteredVisitas.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8">{histDate !== TODAY ? `Sem registros em ${format(parseISO(histDate), 'dd/MM/yyyy')}` : 'Nenhum registro hoje.'}</p>
              ) : filteredVisitas.map(v => {
                const tc = TIPO_CONFIG[v.tipo];
                return (
                  <div key={v.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ background: v.status === 'dentro' ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)', borderColor: v.status === 'dentro' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}><tc.icon size={12} style={{ color: tc.color }} /></div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{v.nome}</p>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>{v.veiculo ?? 'Sem veículo'} · {v.destino}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end mb-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.status === 'dentro' ? GREEN : 'rgba(255,255,255,0.25)' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: v.status === 'dentro' ? GREEN : 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{v.status === 'dentro' ? 'Dentro' : 'Saiu'}</span>
                      </div>
                      <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)' }}>{fmtTime(v.entrada_at)}{v.saida_at ? ` → ${fmtTime(v.saida_at)}` : ''}</p>
                    </div>
                    {v.status === 'dentro' && (
                      <button onClick={() => handleRegisterExit(v.id)} className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer flex-shrink-0 ml-1" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>Saída</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'autorizados' && (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {autorizados.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8">Nenhum autorizado fixo cadastrado.</p>
              ) : autorizados.map(a => {
                const vencido = isVencido(a.validade);
                return (
                  <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: vencido ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${vencido ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{a.nome}</p>
                      <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {a.chacara && <span>{a.chacara}</span>}
                        {a.dias && <><span>·</span><span>{a.dias}</span></>}
                        {a.validade && <span style={{ color: vencido ? YELLOW : 'rgba(255,255,255,0.35)' }}>· {vencido ? '⚠ Vencido ' : 'até '}{new Date(a.validade + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                    <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: vencido ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: vencido ? YELLOW : GREEN, border: `1px solid ${vencido ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}` }}>{vencido ? 'Vencido' : 'Ativo'}</span>
                    <button onClick={() => { setRemoveId(a.id); setRemoveName(a.nome); }} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <Trash2 size={10} style={{ color: '#fca5a5' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {removeId && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
            <div className="rounded-2xl p-5 max-w-xs w-full mx-4 space-y-4" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}><AlertTriangle className="w-5 h-5" style={{ color: YELLOW }} /></div>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Revogar Autorização?</h4>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}><strong style={{ color: 'rgba(255,255,255,0.7)' }}>{removeName}</strong> perderá o acesso fixo.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setRemoveId(null); setRemoveName(''); }} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                <button onClick={handleRemove} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>Revogar</button>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    ),
  };

  /* ── Slide 5 — Ferramentas (QR + Autorizado Fixo) ── */
  const slideFerramentas: SlideItem = {
    key: 'portaria-ferramentas',
    label: 'Ferramentas',
    content: (
      <SlidePanel
        eyebrow="Administração da Portaria"
        title={<>Ferramentas de <span className="grad-text">Gestão</span></>}
        badges={[
          { icon: '📱', label: 'QR das entradas' },
          { icon: '🖨️', label: 'Imprimível' },
          { icon: '✦', label: 'Autorizado fixo' },
        ]}
      >
        <div className="flex flex-col gap-5 py-1">
          {/* Gerador QR */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.15)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: CYAN, letterSpacing: '0.05em' }}>QR CODE DAS PORTARIAS</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              Gere e imprima o QR de cada portaria. O visitante escaneia, informa nome e CPF, e o apito soa no painel ao vivo.
            </p>
            <button onClick={gerarQRs} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5">
              <QrCode size={13} /> Gerar QR das duas portarias
            </button>

            {qrUrls && (
              <div className="grid grid-cols-2 gap-3 mt-1">
                {([{ p: 1, url: qrUrls.p1 }, { p: 2, url: qrUrls.p2 }] as const).map(({ p, url }) => (
                  <div key={p} className="flex flex-col items-center gap-2">
                    <div className="rounded-2xl p-3" style={{ background: '#07101c', border: '1px solid rgba(87,216,255,0.18)' }}>
                      <img src={url} alt={`QR Portaria ${p}`} style={{ width: 130, height: 130, display: 'block' }} />
                    </div>
                    <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.78rem' }}>Portaria {p}</p>
                    <button onClick={() => baixarQR(url, p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer" style={{ background: 'rgba(87,216,255,0.10)', color: CYAN, border: '1px solid rgba(87,216,255,0.25)' }}>
                      <Download size={11} /> Baixar PNG
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, textAlign: 'center' }}>
              💡 Imprima em A5 ou maior e fixe em local visível e protegido.
            </p>
          </div>

          {/* Cadastrar Autorizado Fixo */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>CADASTRAR AUTORIZADO FIXO</p>
            <form onSubmit={handleCreateAutorizado} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="input-label text-[11px]">Nome do Prestador / Empresa *</label>
                <input type="text" className="input" placeholder="Ex: Empresa de Jardinagem" value={autNome} onChange={e => setAutNome(e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="input-label text-[11px]">Chácara / Área</label>
                  <input type="text" className="input" placeholder="Ex: Áreas comuns" value={autChacara} onChange={e => setAutChacara(e.target.value)} />
                </div>
                <div>
                  <label className="input-label text-[11px]">Dias de Acesso</label>
                  <input type="text" className="input" placeholder="Ex: Seg, Qua, Sex" value={autDias} onChange={e => setAutDias(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="input-label text-[11px]">Validade</label>
                <input type="date" className="input" min={TODAY} value={autValidade} onChange={e => setAutValidade(e.target.value)} />
              </div>
              <button type="submit" disabled={submittingAut} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5">
                {submittingAut ? <><Loader2 size={13} className="animate-spin" /> Cadastrando...</> : <><UserPlus size={13} /> Cadastrar Autorizado</>}
              </button>
            </form>
          </div>
        </div>
      </SlidePanel>
    ),
  };

  const slides: SlideItem[] = [
    slideAoVivo,
    slideAgenda,
    slideEncomendas,
    slideRegistrar,
    slideHistorico,
    slideFerramentas,
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />
    </div>
  );
};
