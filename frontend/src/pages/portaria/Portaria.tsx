import { gotoSlide } from '../../utils/format';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, Car, User, Clock, CheckCircle2, Plus, Loader2,
  Trash2, UserPlus, AlertTriangle, Package, Wrench,
  CalendarDays, QrCode, Download, Check, X, CalendarPlus,
  RefreshCw, BadgeCheck, Users,
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
  fetchPortariaHoje, fetchPortariaByDate, fetchPortariaByChacara,
  fetchPortariaAutorizados, fetchPortariaAutorizadosByChacara,
  insertPortariaEntrada, registerPortariaSaida,
  insertPortariaAutorizado, removePortariaAutorizado,
  fetchSolicitacoesPendentes, resolverSolicitacao,
  fetchMeusConvites, insertConvite, cancelarConvite, updateConvite,
  fetchMeusRecorrentes, insertRecorrente, deleteRecorrente,
  type DbPortariaRegistro, type DbPortariaAutorizado, type DbSolicitacao,
  type DbConvite, type DbRecorrente,
} from '@/lib/supabase-queries';

/* ── Apito (Web Audio API) — doorbell de duas notas ── */
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
  visitante: { icon: User,    color: CYAN,   label: 'Visitante',  bg: 'rgba(87,216,255,0.08)'  },
  entrega:   { icon: Package, color: YELLOW, label: 'Entrega',    bg: 'rgba(245,158,11,0.08)'  },
  servico:   { icon: Wrench,  color: BLUE,   label: 'Prestador',  bg: 'rgba(90,132,255,0.08)'  },
};

const VISITA_TIPO = {
  convidado: { emoji: '👤', label: 'Convidado'  },
  prestador: { emoji: '🔧', label: 'Prestador'  },
  entrega:   { emoji: '📦', label: 'Entrega'    },
};

const DIAS = [
  { k: 'dom', l: 'Dom' }, { k: 'seg', l: 'Seg' }, { k: 'ter', l: 'Ter' },
  { k: 'qua', l: 'Qua' }, { k: 'qui', l: 'Qui' }, { k: 'sex', l: 'Sex' },
  { k: 'sab', l: 'Sáb' },
];

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
  const { user, isGestor } = useAuth();
  const chacaraNum = user?.unit_number ? String(user.unit_number).padStart(3, '0') : null;

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

  // Solicitações QR (gestor)
  const [solicitacoes, setSolicitacoes] = useState<DbSolicitacao[]>([]);
  const [resolvendo, setResolvendo]     = useState<string | null>(null);
  const [portariaAtiva, setPortariaAtiva] = useState<1 | 2>(1);
  // estado por card: nº de pessoas confirmado + cpf conferido
  const [cardState, setCardState] = useState<Record<string, { pessoas: number; cpfOk: boolean }>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Gerador QR (gestor)
  const [qrUrls, setQrUrls] = useState<{ p1: string; p2: string } | null>(null);

  // Form entrada manual (gestor)
  const [nome, setNome]       = useState('');
  const [veiculo, setVeiculo] = useState('');
  const [tipo, setTipo]       = useState<DbPortariaRegistro['tipo']>('visitante');
  const [destino, setDestino] = useState('chacara');
  const [chacara, setChacara] = useState('');
  const [areaComum, setAreaComum] = useState('Portaria');
  const [submitting, setSubmitting] = useState(false);

  // Form autorizado (gestor — legado)
  const [autNome, setAutNome]     = useState('');
  const [autChacara, setAutChacara] = useState('');
  const [autDias, setAutDias]     = useState('');
  const [autValidade, setAutValidade] = useState('');
  const [submittingAut, setSubmittingAut] = useState(false);

  // ── MORADOR: convites e recorrentes ──
  const [convites, setConvites]       = useState<DbConvite[]>([]);
  const [recorrentes, setRecorrentes] = useState<DbRecorrente[]>([]);

  // Form agendar visita (morador)
  const [cvNome, setCvNome]       = useState('');
  const [cvCpf, setCvCpf]         = useState('');
  const [cvTel, setCvTel]         = useState('');
  const [cvTipo, setCvTipo]       = useState<'convidado'|'prestador'|'entrega'>('convidado');
  const [cvData, setCvData]       = useState(TODAY);
  const [cvPessoas, setCvPessoas] = useState(1);
  const [cvObs, setCvObs]         = useState('');
  const [cvSaving, setCvSaving]   = useState(false);

  // Form recorrente (morador)
  const [rcNome, setRcNome]       = useState('');
  const [rcCpf, setRcCpf]         = useState('');
  const [rcTel, setRcTel]         = useState('');
  const [rcTipo, setRcTipo]       = useState<'convidado'|'prestador'|'entrega'>('prestador');
  const [rcDias, setRcDias]       = useState<string[]>([]);
  const [rcFim, setRcFim]         = useState('');
  const [rcSaving, setRcSaving]   = useState(false);

  /* ── Carga inicial ── */
  useEffect(() => {
    if (!user) return;
    Promise.all([
      isGestor ? fetchPortariaHoje() : (chacaraNum ? fetchPortariaByChacara(chacaraNum) : Promise.resolve([])),
      isGestor ? fetchPortariaAutorizados() : (chacaraNum ? fetchPortariaAutorizadosByChacara(chacaraNum) : Promise.resolve([])),
      !isGestor ? fetchMeusConvites(user.id) : Promise.resolve([]),
      !isGestor ? fetchMeusRecorrentes(user.id) : Promise.resolve([]),
    ]).then(([vis, aut, cvs, rcs]) => {
      setVisitas(vis as DbPortariaRegistro[]);
      setHistVisitas(vis as DbPortariaRegistro[]);
      setAutorizados(aut as DbPortariaAutorizado[]);
      setConvites(cvs as DbConvite[]);
      setRecorrentes(rcs as DbRecorrente[]);
    }).catch(() => toast.error('Erro ao carregar dados da portaria.'))
      .finally(() => setLoading(false));
  }, [user, isGestor, chacaraNum]);

  /* ── Realtime: solicitações QR (gestor) ── */
  useEffect(() => {
    if (!isGestor) return;
    fetchSolicitacoesPendentes().then(setSolicitacoes).catch(() => {});

    channelRef.current = supabase
      .channel('portaria-qr-solicitacoes')
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
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [isGestor]);

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

  /* ── Gerar QR das duas portarias ── */
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

  const dentroCount   = visitas.filter(v => v.status === 'dentro').length;
  const vencidosCount = autorizados.filter(a => isVencido(a.validade)).length;
  const filteredVisitas = tipoFilter ? histVisitas.filter(v => v.tipo === tipoFilter) : histVisitas;
  const solPortaria = solicitacoes.filter(s => (s.portaria_id ?? 1) === portariaAtiva);

  /* ── Handlers entrada manual / autorizado ── */
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
      gotoSlide(1);
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

  /* ── MORADOR: criar convite ── */
  const handleCreateConvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chacaraNum) { toast.error('Sua chácara não está vinculada ao perfil.'); return; }
    if (!cvNome.trim()) { toast.error('Informe o nome do visitante.'); return; }
    if (cvTipo !== 'entrega' && cvCpf.replace(/\D/g,'').length !== 11) { toast.error('Informe o CPF do visitante (11 dígitos).'); return; }
    setCvSaving(true);
    try {
      const novo = await insertConvite({
        morador_id: user.id, chacara_numero: chacaraNum,
        visitante_nome: cvNome.trim(), visitante_cpf: cvCpf.replace(/\D/g,'') || null,
        visitante_tel: cvTel.trim() || null, tipo: cvTipo,
        data_visita: cvData, num_pessoas: cvPessoas,
        observacao: cvObs.trim() || null, status: 'ativo', portaria_id: null,
      } as any);
      setConvites(prev => [novo, ...prev]);
      setCvNome(''); setCvCpf(''); setCvTel(''); setCvObs(''); setCvPessoas(1);
      toast.success('Visita agendada! O visitante será reconhecido na portaria.');
      gotoSlide(1);
    } catch { toast.error('Erro ao agendar visita.'); }
    finally { setCvSaving(false); }
  };

  const handleCancelConvite = async (id: string) => {
    try {
      await cancelarConvite(id);
      setConvites(prev => prev.map(c => c.id === id ? { ...c, status: 'cancelado' } : c));
      toast.success('Convite cancelado.');
    } catch { toast.error('Erro ao cancelar.'); }
  };

  /* ── MORADOR: criar recorrente ── */
  const handleCreateRecorrente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chacaraNum) { toast.error('Sua chácara não está vinculada ao perfil.'); return; }
    if (!rcNome.trim()) { toast.error('Informe o nome.'); return; }
    if (rcDias.length === 0) { toast.error('Selecione ao menos um dia da semana.'); return; }
    setRcSaving(true);
    try {
      const novo = await insertRecorrente({
        morador_id: user.id, chacara_numero: chacaraNum,
        nome: rcNome.trim(), cpf: rcCpf.replace(/\D/g,'') || null,
        telefone: rcTel.trim() || null, tipo: rcTipo,
        dias_semana: rcDias, vigencia_inicio: TODAY,
        vigencia_fim: rcFim || null, ativo: true,
        observacao: null, created_by: user.id,
      } as any);
      setRecorrentes(prev => [...prev, novo].sort((a,b) => a.nome.localeCompare(b.nome)));
      setRcNome(''); setRcCpf(''); setRcTel(''); setRcDias([]); setRcFim('');
      toast.success('Acesso recorrente cadastrado!');
      gotoSlide(1);
    } catch { toast.error('Erro ao cadastrar recorrente.'); }
    finally { setRcSaving(false); }
  };

  const handleDeleteRecorrente = async (id: string) => {
    try {
      await deleteRecorrente(id);
      setRecorrentes(prev => prev.filter(r => r.id !== id));
      toast.success('Acesso recorrente removido.');
    } catch { toast.error('Erro ao remover.'); }
  };

  const fmtCpfInput = (v: string) => {
    const d = v.replace(/\D/g,'').slice(0,11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  };

  /* ════════════════════════════════════════════════════════════════
     SLIDES
  ════════════════════════════════════════════════════════════════ */
  const slides: SlideItem[] = [

    /* ── Slide 1: Controle ── */
    {
      key: 'portaria-controle',
      label: 'Controle',
      content: (
        <SlidePanel
          eyebrow={isGestor ? 'Central de Segurança' : 'Minha Chácara'}
          title={<>Controle de <span className="grad-text">Acesso</span></>}
          badges={[
            { icon: '🛡️', label: 'Monitoramento 24h' },
            { icon: dentroCount > 0 ? '🟡' : '🟢', label: `${dentroCount} dentro agora` },
            { icon: '⚡', label: 'Tempo Real' },
          ]}
          actions={
            <button onClick={() => gotoSlide(2)} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
              {isGestor ? <><Shield size={13} /> Solicitações</> : <><CalendarPlus size={13} /> Agendar</>}
            </button>
          }
        >
          <div className="flex flex-col h-full gap-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Dentro agora"  value={String(dentroCount)}       icon={User}         iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
              <StatCard label="Entradas hoje" value={String(visitas.length)}    icon={Car}          iconColor={CYAN}  iconBg="rgba(87,216,255,0.08)" />
              <StatCard label={isGestor ? 'Autorizados' : 'Meus convites'} value={String(isGestor ? autorizados.length : convites.filter(c => c.status==='ativo').length)} icon={CheckCircle2} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
              <StatCard label={isGestor ? 'Aut. Vencidos' : 'Recorrentes'} value={String(isGestor ? vencidosCount : recorrentes.length)} icon={Clock} iconColor={YELLOW} iconBg="rgba(245,158,11,0.08)" />
            </div>

            <div className="rounded-2xl bg-white/3 border border-white/5 p-3.5 flex-1 flex flex-col min-h-[120px]">
              <div className="mb-2">
                <h3 className="text-white text-xs font-bold">{isGestor ? 'Atualmente no Condomínio' : 'Visitantes na Minha Chácara'}</h3>
                <p className="text-[10px] text-white/30">Entradas com saída pendente</p>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-white/30 text-[10px]"><Loader2 size={13} className="animate-spin" /> Carregando...</div>
                ) : visitas.filter(v => v.status === 'dentro').length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'rgba(16,185,129,0.4)' }} />
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{isGestor ? 'Nenhum visitante ativo.' : 'Nenhuma visita hoje.'}</p>
                  </div>
                ) : visitas.filter(v => v.status === 'dentro').map(v => {
                  const tc = TIPO_CONFIG[v.tipo];
                  return (
                    <div key={v.id} className="flex items-center gap-2.5 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}><tc.icon size={13} style={{ color: tc.color }} /></div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{v.nome}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>{v.veiculo ?? 'Sem veículo'} · {v.destino} · desde {fmtTime(v.entrada_at)}</p>
                      </div>
                      {isGestor && (
                        <button onClick={() => handleRegisterExit(v.id)} className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>Saída</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SlidePanel>
      ),
    },

    /* ════════ GESTOR: Solicitações QR ════════ */
    ...(isGestor ? [{
      key: 'portaria-solicitacoes',
      label: 'QR · Solicitações',
      content: (
        <SlidePanel
          eyebrow="Acesso via QR Code"
          title={<>Solicitações <span className="grad-text">em Tempo Real</span></>}
          badges={[
            { icon: '📡', label: 'Tempo Real' },
            { icon: solPortaria.length > 0 ? '🔴' : '🟢', label: `${solPortaria.length} na Portaria ${portariaAtiva}` },
            { icon: '🔔', label: 'Apito Ativo' },
          ]}
        >
          <div className="flex flex-col h-full gap-3">
            {/* Seletor de portaria */}
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

            {solPortaria.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 py-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <CheckCircle2 size={28} style={{ color: GREEN }} />
                </div>
                <div className="text-center">
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem', marginBottom: 4 }}>Portaria {portariaAtiva} livre</p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Quando um visitante escanear o QR,<br />o apito soará e o card aparecerá aqui.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto flex-1">
                {solPortaria.map(sol => {
                  const isProc  = resolvendo === sol.id;
                  const tempo   = fmtTime(sol.created_at);
                  const cs      = cardState[sol.id] ?? { pessoas: sol.num_pessoas ?? 1, cpfOk: false };
                  const temConvite = !!sol.convite_id;
                  const temRecorrente = !!sol.recorrente_id;
                  return (
                    <div key={sol.id} className="rounded-2xl p-3.5 space-y-3" style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.22)' }}>
                      {/* Cabeçalho */}
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.25)' }}>
                          <User size={16} style={{ color: CYAN }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.85rem' }}>{sol.visitante_nome}</p>
                            {temConvite && <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5" style={{ background: 'rgba(16,185,129,0.15)', color: GREEN, border: '1px solid rgba(16,185,129,0.3)' }}><BadgeCheck size={9} /> CONVITE</span>}
                            {temRecorrente && <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5" style={{ background: 'rgba(90,132,255,0.15)', color: BLUE, border: '1px solid rgba(90,132,255,0.3)' }}><RefreshCw size={9} /> RECORRENTE</span>}
                            {!temConvite && !temRecorrente && <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: YELLOW, border: '1px solid rgba(245,158,11,0.3)' }}>SEM CADASTRO</span>}
                          </div>
                          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                            {sol.chacara_numero && sol.chacara_numero !== '—' ? <>Chácara <strong style={{ color: CYAN }}>{sol.chacara_numero}</strong></> : 'Sem chácara vinculada'}
                          </p>
                          {sol.visitante_cpf && (
                            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 1, fontFamily: 'monospace' }}>CPF: {fmtCpfMask(sol.visitante_cpf)}</p>
                          )}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}><Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{tempo}</span>
                      </div>

                      {/* Conferência: CPF + nº pessoas */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setCard(sol.id, { cpfOk: !cs.cpfOk })}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                          style={{ background: cs.cpfOk ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', color: cs.cpfOk ? GREEN : 'rgba(255,255,255,0.5)', border: `1px solid ${cs.cpfOk ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
                          {cs.cpfOk ? <Check size={11} /> : <BadgeCheck size={11} />} Documento conferido
                        </button>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <Users size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <span className="text-[10px] text-white/50 font-bold">Pessoas:</span>
                          <button onClick={() => setCard(sol.id, { pessoas: Math.max(1, cs.pessoas - 1) })} className="w-5 h-5 rounded-md flex items-center justify-center cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>−</button>
                          <span className="text-xs font-bold text-white w-4 text-center">{cs.pessoas}</span>
                          <button onClick={() => setCard(sol.id, { pessoas: cs.pessoas + 1 })} className="w-5 h-5 rounded-md flex items-center justify-center cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>+</button>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2">
                        <button disabled={isProc} onClick={() => handleResolver(sol, 'aprovado')}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.35)' }}>
                          {isProc ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />} Liberar entrada
                        </button>
                        <button disabled={isProc} onClick={() => handleResolver(sol, 'negado')}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                          style={{ background: 'rgba(239,68,68,0.10)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <X size={14} /> Negar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, textAlign: 'center' }}>
                🔔 Apito automático · Confira o documento, ajuste o nº de pessoas e libere.<br />
                Casos sem cadastro: confirme com o morador antes de liberar.
              </p>
            </div>
          </div>
        </SlidePanel>
      ),
    } as SlideItem] : []),

    /* ════════ MORADOR: Agendar Visita ════════ */
    ...(!isGestor ? [{
      key: 'portaria-agendar',
      label: 'Agendar Visita',
      content: (
        <SlidePanel
          eyebrow="Pré-cadastro de Visitante"
          title={<>Agendar <span className="grad-text">Visita</span></>}
          badges={[
            { icon: '⚡', label: 'Entrada sem atrito' },
            { icon: '🔒', label: 'CPF protegido' },
            { icon: '📅', label: 'Vale o dia todo' },
          ]}
        >
          <form onSubmit={handleCreateConvite} className="flex flex-col gap-3 py-1 text-xs">
            {!chacaraNum && (
              <div className="rounded-xl p-2.5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p style={{ fontSize: '0.7rem', color: YELLOW }}>⚠ Sua chácara não está vinculada ao perfil. Contate a administração.</p>
              </div>
            )}
            <div>
              <label className="input-label text-[11px]">Nome do visitante *</label>
              <input type="text" className="input" placeholder="Ex: Maria Oliveira" value={cvNome} onChange={e => setCvNome(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">CPF {cvTipo !== 'entrega' ? '*' : '(opcional)'}</label>
                <input type="tel" inputMode="numeric" className="input" placeholder="000.000.000-00" value={cvCpf} onChange={e => setCvCpf(fmtCpfInput(e.target.value))} />
              </div>
              <div>
                <label className="input-label text-[11px]">Telefone</label>
                <input type="tel" className="input" placeholder="(43) 9..." value={cvTel} onChange={e => setCvTel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="input-label text-[11px]">Tipo</label>
                <select className="input" value={cvTipo} onChange={e => setCvTipo(e.target.value as any)}>
                  <option value="convidado">👤 Convidado</option>
                  <option value="prestador">🔧 Prestador</option>
                  <option value="entrega">📦 Entrega</option>
                </select>
              </div>
              <div>
                <label className="input-label text-[11px]">Data *</label>
                <input type="date" className="input" min={TODAY} value={cvData} onChange={e => setCvData(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Nº pessoas</label>
                <input type="number" className="input" min={1} value={cvPessoas} onChange={e => setCvPessoas(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
            </div>
            <div>
              <label className="input-label text-[11px]">Observação</label>
              <input type="text" className="input" placeholder="Ex: aniversário, entrega de móveis..." value={cvObs} onChange={e => setCvObs(e.target.value)} />
            </div>
            <button type="submit" disabled={cvSaving || !chacaraNum} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
              {cvSaving ? <><Loader2 size={13} className="animate-spin" /> Agendando...</> : <><CalendarPlus size={13} /> Agendar Visita</>}
            </button>

            {/* Lista de convites do morador */}
            {convites.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Minhas visitas agendadas</p>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                  {convites.filter(c => c.status !== 'cancelado').map(c => {
                    const vt = VISITA_TIPO[c.tipo];
                    return (
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: c.status === 'usado' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${c.status === 'usado' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
                        <span style={{ fontSize: '1rem' }}>{vt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.72rem' }} className="truncate">{c.visitante_nome}</p>
                          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                            {new Date(c.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')} · {c.num_pessoas} pessoa{c.num_pessoas > 1 ? 's' : ''}
                          </p>
                        </div>
                        {c.status === 'usado' ? (
                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', color: GREEN }}>ENTROU</span>
                        ) : (
                          <button onClick={() => handleCancelConvite(c.id)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <X size={11} style={{ color: '#fca5a5' }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </SlidePanel>
      ),
    } as SlideItem] : []),

    /* ════════ MORADOR: Recorrentes ════════ */
    ...(!isGestor ? [{
      key: 'portaria-recorrentes',
      label: 'Acessos Recorrentes',
      content: (
        <SlidePanel
          eyebrow="Prestadores Habituais"
          title={<>Acessos <span className="grad-text">Recorrentes</span></>}
          badges={[
            { icon: '🔁', label: 'Sem recadastro' },
            { icon: '📅', label: 'Por dia da semana' },
            { icon: '🔒', label: 'CPF único' },
          ]}
        >
          <form onSubmit={handleCreateRecorrente} className="flex flex-col gap-3 py-1 text-xs">
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
              Cadastre quem vem com frequência (faxineira, jardineiro, cuidador). Na portaria, o CPF é reconhecido automaticamente — sem reverificação.
            </p>
            <div>
              <label className="input-label text-[11px]">Nome *</label>
              <input type="text" className="input" placeholder="Ex: Ana — Faxina" value={rcNome} onChange={e => setRcNome(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">CPF</label>
                <input type="tel" inputMode="numeric" className="input" placeholder="000.000.000-00" value={rcCpf} onChange={e => setRcCpf(fmtCpfInput(e.target.value))} />
              </div>
              <div>
                <label className="input-label text-[11px]">Telefone</label>
                <input type="tel" className="input" placeholder="(43) 9..." value={rcTel} onChange={e => setRcTel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Tipo</label>
                <select className="input" value={rcTipo} onChange={e => setRcTipo(e.target.value as any)}>
                  <option value="prestador">🔧 Prestador</option>
                  <option value="convidado">👤 Convidado</option>
                  <option value="entrega">📦 Entrega</option>
                </select>
              </div>
              <div>
                <label className="input-label text-[11px]">Vigência até (opcional)</label>
                <input type="date" className="input" min={TODAY} value={rcFim} onChange={e => setRcFim(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="input-label text-[11px]">Dias da semana *</label>
              <div className="flex gap-1 mt-1">
                {DIAS.map(d => {
                  const on = rcDias.includes(d.k);
                  return (
                    <button key={d.k} type="button"
                      onClick={() => setRcDias(prev => on ? prev.filter(x => x !== d.k) : [...prev, d.k])}
                      className="flex-1 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                      style={{ background: on ? CYAN : 'rgba(255,255,255,0.05)', color: on ? '#07101c' : 'rgba(255,255,255,0.45)', border: `1px solid ${on ? CYAN : 'rgba(255,255,255,0.1)'}` }}>
                      {d.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" disabled={rcSaving || !chacaraNum} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
              {rcSaving ? <><Loader2 size={13} className="animate-spin" /> Cadastrando...</> : <><RefreshCw size={13} /> Cadastrar Recorrente</>}
            </button>

            {recorrentes.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Meus acessos recorrentes</p>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                  {recorrentes.map(r => {
                    const vt = VISITA_TIPO[r.tipo];
                    return (
                      <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '1rem' }}>{vt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.72rem' }} className="truncate">{r.nome}</p>
                          <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>{r.dias_semana.map(d => DIAS.find(x => x.k === d)?.l).join(', ')}</p>
                        </div>
                        <button onClick={() => handleDeleteRecorrente(r.id)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <Trash2 size={10} style={{ color: '#fca5a5' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </SlidePanel>
      ),
    } as SlideItem] : []),

    /* ── Slide: Histórico + Autorizados ── */
    {
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
              {isGestor && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input type="date" className="input py-1 px-2 text-[10px]" style={{ width: 130 }} value={histDate} max={TODAY} onChange={e => loadHistDate(e.target.value)} />
                </div>
              )}
            </div>

            {isGestor && activeTab === 'movimento' && (
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
                      {isGestor && v.status === 'dentro' && (
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
                      {isGestor && (
                        <button onClick={() => { setRemoveId(a.id); setRemoveName(a.nome); }} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <Trash2 size={10} style={{ color: '#fca5a5' }} />
                        </button>
                      )}
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
    },

    /* ════════ GESTOR: Registrar entrada manual ════════ */
    ...(isGestor ? [{
      key: 'portaria-cadastro',
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Nome Completo *</label>
                <input type="text" className="input" placeholder="Ex: Lucas Santana" value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Veículo & Placa</label>
                <input type="text" className="input" placeholder="Ex: Corolla — ABC-1234" value={veiculo} onChange={e => setVeiculo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                  <option>Salão de Festas</option><option>Quadra Poliesportiva</option><option>Piscina</option><option>Quiosque</option><option>Campo de Futebol</option>
                </select>
              </div>
            )}
            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
              {submitting ? <><Loader2 size={13} className="animate-spin" /> Registrando...</> : '✓ Confirmar e Liberar Entrada'}
            </button>
          </form>
        </SlidePanel>
      ),
    } as SlideItem] : []),

    /* ════════ GESTOR: Gerar QR das portarias ════════ */
    ...(isGestor ? [{
      key: 'portaria-qr',
      label: 'Gerar QR',
      content: (
        <SlidePanel
          eyebrow="QR das Entradas"
          title={<>QR Code <span className="grad-text">das Portarias</span></>}
          badges={[
            { icon: '📱', label: 'Para visitantes' },
            { icon: '🖨️', label: 'Imprimível' },
            { icon: '🛡️', label: '2 portarias' },
          ]}
        >
          <div className="flex flex-col gap-4 py-1">
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
              Gere e imprima o QR Code de cada portaria para fixar nas entradas principais.
              O visitante escaneia, informa nome e CPF, e o apito soa neste painel.
            </p>
            <button onClick={gerarQRs} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5">
              <QrCode size={13} /> Gerar QR das duas portarias
            </button>

            {qrUrls && (
              <div className="grid grid-cols-2 gap-3">
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

            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, textAlign: 'center' }}>
                💡 Imprima em tamanho A5 ou maior e fixe em local visível e protegido da chuva em cada portaria.
              </p>
            </div>
          </div>
        </SlidePanel>
      ),
    } as SlideItem] : []),

    /* ════════ GESTOR: Novo Autorizado (legado) ════════ */
    ...(isGestor ? [{
      key: 'portaria-autorizado',
      label: 'Autorizado Fixo',
      content: (
        <SlidePanel
          eyebrow="Acesso Fixo (Administração)"
          title={<>Cadastrar <span className="grad-text">Autorizado Fixo</span></>}
          badges={[
            { icon: '✦', label: 'Prestador do condomínio' },
            { icon: '🔒', label: 'Acesso Controlado' },
            { icon: '📅', label: 'Validade Definida' },
          ]}
        >
          <form onSubmit={handleCreateAutorizado} className="flex flex-col gap-3.5 py-1 text-xs">
            <div>
              <label className="input-label text-[11px]">Nome do Prestador / Empresa *</label>
              <input type="text" className="input" placeholder="Ex: Empresa de Jardinagem" value={autNome} onChange={e => setAutNome(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <button type="submit" disabled={submittingAut} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
              {submittingAut ? <><Loader2 size={13} className="animate-spin" /> Cadastrando...</> : <><UserPlus size={13} /> Cadastrar Autorizado</>}
            </button>
          </form>
        </SlidePanel>
      ),
    } as SlideItem] : []),
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />
    </div>
  );
};
