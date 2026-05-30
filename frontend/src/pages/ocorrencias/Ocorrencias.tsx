import { useState, useEffect } from 'react';
import {
  AlertCircle, Plus, Search, Clock, CheckCircle2, Loader2,
  PlayCircle, ArrowRight, Zap, ChevronRight, MapPin, User, Calendar,
  ShieldAlert, Wrench, Zap as ZapIcon, Trash2, TreePine, MoreHorizontal,
} from 'lucide-react';
import { formatDate, gotoSlide } from '../../utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { fetchIncidents, createIncident, updateIncidentStatus, type DbIncident } from '@/lib/supabase-queries';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';
const BLUE   = '#5a84ff';

const PRIORITY_CONFIG = {
  urgente: { label: 'Urgente', color: RED,    bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  cls: 'badge-red'    },
  alta:    { label: 'Alta',    color: YELLOW, bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', cls: 'badge-yellow' },
  media:   { label: 'Média',   color: BLUE,   bg: 'rgba(90,132,255,0.10)', border: 'rgba(90,132,255,0.25)', cls: 'badge-blue'   },
  baixa:   { label: 'Baixa',   color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', cls: 'badge-gray' },
};

const STATUS_CONFIG = {
  aberto:       { label: 'Aberto',       color: RED,    step: 0 },
  em_andamento: { label: 'Em andamento', color: CYAN,   step: 1 },
  resolvido:    { label: 'Resolvido',    color: GREEN,  step: 2 },
  fechado:      { label: 'Fechado',      color: 'rgba(255,255,255,0.3)', step: 2 },
};

const CATEGORIES = [
  'Manutenção Geral', 'Elétrica / Iluminação', 'Limpeza / Vias',
  'Infraestrutura', 'Segurança', 'Vizinhança', 'Outros',
];

/* ── Timeline de status ────────────────────────────────────────── */
const StatusTimeline = ({ status }: { status: string }) => {
  const step = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.step ?? 0;
  const steps = [
    { label: 'Aberto',       icon: AlertCircle, activeColor: RED   },
    { label: 'Em andamento', icon: PlayCircle,  activeColor: CYAN  },
    { label: 'Resolvido',    icon: CheckCircle2, activeColor: GREEN },
  ];
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((s, i) => {
        const done    = i < step;
        const current = i === step;
        const color   = done || current ? s.activeColor : 'rgba(255,255,255,0.15)';
        return (
          <div key={s.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: current ? `${s.activeColor}20` : done ? `${s.activeColor}12` : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${color}`,
                  boxShadow: current ? `0 0 10px ${s.activeColor}40` : 'none',
                }}
              >
                <s.icon size={11} style={{ color }} />
              </div>
              <span style={{ fontSize: '0.58rem', color: current ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: current ? 700 : 400, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-1 mb-3.5"
                style={{ background: i < step ? `linear-gradient(90deg, ${steps[i].activeColor}60, ${steps[i+1].activeColor}40)` : 'rgba(255,255,255,0.06)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Ocorrencias = () => {
  const { user, isGestor } = useAuth();
  const [incidents, setIncidents]       = useState<DbIncident[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('aberto');
  const [selected, setSelected]         = useState<DbIncident | null>(null);
  const [updating, setUpdating]         = useState<string | null>(null);

  // Form
  const [formTitle, setFormTitle]           = useState('');
  const [formCategory, setFormCategory]     = useState(CATEGORIES[0]);
  const [formPriority, setFormPriority]     = useState<DbIncident['priority']>('media');
  const [formLocation, setFormLocation]     = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting]         = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchIncidents(isGestor ? undefined : user.id)
      .then(setIncidents)
      .catch(() => toast.error('Erro ao carregar ocorrências.'))
      .finally(() => setLoading(false));
  }, [user, isGestor]);

  const abertos    = incidents.filter(i => i.status === 'aberto').length;
  const andamento  = incidents.filter(i => i.status === 'em_andamento').length;
  const resolvidos = incidents.filter(i => i.status === 'resolvido' || i.status === 'fechado').length;
  const urgentesAbertos = incidents.filter(i =>
    (i.priority === 'urgente' || i.priority === 'alta') &&
    i.status !== 'resolvido' && i.status !== 'fechado'
  );

  const filtered = incidents.filter(i => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
        !(i.location ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formLocation.trim() || !formDescription.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSubmitting(true);
    try {
      const novo = await createIncident({
        title: formTitle.trim(), category: formCategory,
        priority: formPriority, location: formLocation.trim(),
        description: formDescription.trim(), user_id: user!.id,
      });
      setIncidents(prev => [novo, ...prev]);
      setFormTitle(''); setFormLocation(''); setFormDescription('');
      setFormPriority('media'); setFormCategory(CATEGORIES[0]);
      toast.success('Ocorrência registrada! A administração foi notificada.');
      gotoSlide(1);
    } catch {
      toast.error('Erro ao registrar ocorrência.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: DbIncident['status']) => {
    setUpdating(id);
    try {
      await updateIncidentStatus(id, status);
      setIncidents(prev => prev.map(i => i.id === id
        ? { ...i, status, resolved_at: status === 'resolvido' ? new Date().toISOString() : i.resolved_at }
        : i
      ));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
      const labels: Record<string, string> = {
        em_andamento: 'Atendimento iniciado!',
        resolvido:    'Ocorrência resolvida!',
        fechado:      'Chamado fechado.',
      };
      toast.success(labels[status] ?? 'Status atualizado.');
    } catch {
      toast.error('Erro ao atualizar status.');
    } finally {
      setUpdating(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  const slides3D: SlideItem[] = [

    /* ── Slide 1: Panorama ── */
    {
      key: 'ocorrencias-panorama',
      label: 'Panorama',
      content: (
        <SlidePanel
          eyebrow="Central de Chamados"
          title={<>Chamados & <span className="grad-text">Ocorrências</span></>}
          badges={[
            { icon: '🛡️', label: 'Monitoramento' },
            { icon: urgentesAbertos.length > 0 ? '🚨' : '✅', label: urgentesAbertos.length > 0 ? `${urgentesAbertos.length} urgentes` : 'Sem urgências' },
            { icon: '⚡', label: 'Tempo Real' },
          ]}
          actions={
            <button
              onClick={() => gotoSlide(2)}
              className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
            >
              <Plus size={13} /> Novo Chamado
            </button>
          }
        >
          <div className="flex flex-col h-full gap-3">

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Abertos" value={loading ? '...' : String(abertos)} icon={AlertCircle} iconColor={RED} iconBg="rgba(239,68,68,0.08)" />
              <StatCard label="Em Andamento" value={loading ? '...' : String(andamento)} icon={Clock} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Resolvidos" value={loading ? '...' : String(resolvidos)} icon={CheckCircle2} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
            </div>

            {/* Barra de progresso geral */}
            {!loading && incidents.length > 0 && (
              <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Taxa de Resolução</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: GREEN }}>
                      {Math.round((resolvidos / incidents.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(resolvidos / incidents.length) * 100}%`, background: `linear-gradient(90deg, ${CYAN}, ${GREEN})` }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{resolvidos}/{incidents.length}</span>
              </div>
            )}

            {/* Urgentes em aberto — o que precisa de ação agora */}
            <div className="rounded-2xl bg-white/3 border border-white/5 p-3.5 flex-1 flex flex-col min-h-[100px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-white text-xs font-bold">Exige Atenção Imediata</h3>
                  <p className="text-[10px] text-white/30">Prioridade urgente ou alta, sem resolução</p>
                </div>
                {urgentesAbertos.length > 0 && (
                  <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)', color: RED, border: '1px solid rgba(239,68,68,0.25)' }}>
                    {urgentesAbertos.length} pendentes
                  </span>
                )}
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                {loading ? (
                  <div className="flex items-center gap-2 text-white/30 text-[10px] py-4 justify-center"><Loader2 size={13} className="animate-spin" /> Carregando...</div>
                ) : urgentesAbertos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                    <CheckCircle2 className="w-7 h-7" style={{ color: 'rgba(16,185,129,0.4)' }} />
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Nenhum chamado urgente em aberto</p>
                  </div>
                ) : urgentesAbertos.map(inc => {
                  const pr = PRIORITY_CONFIG[inc.priority as keyof typeof PRIORITY_CONFIG];
                  return (
                    <div
                      key={inc.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      style={{ background: pr.bg, border: `1px solid ${pr.border}` }}
                      onClick={() => { setSelected(inc); gotoSlide(1); }}
                    >
                      <Zap size={12} className="flex-shrink-0" style={{ color: pr.color }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }} className="truncate">{inc.title}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>{inc.location ?? 'Área comum'} · {inc.category}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: pr.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{pr.label}</span>
                        <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SlidePanel>
      ),
    },

    /* ── Slide 2: Lista de chamados ── */
    {
      key: 'ocorrencias-lista',
      label: 'Chamados',
      content: (
        <SlidePanel
          eyebrow="Gestão de Chamados"
          title={<>Mural de <span className="grad-text">Solicitações</span></>}
          badges={[
            { icon: '📋', label: 'Histórico Completo' },
            { icon: '◈', label: 'Filtro Dinâmico' },
            { icon: '⚡', label: 'Fluxo Auditável' },
          ]}
        >
          <div className="flex flex-col h-full gap-2.5">

            {/* Busca + filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text" className="input pl-8 py-1.5 text-xs"
                  placeholder="Buscar por título ou local..."
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 w-fit self-end overflow-x-auto">
                {[
                  { v: 'aberto',       l: 'Abertos'     },
                  { v: 'em_andamento', l: 'Andamento'   },
                  { v: 'resolvido',    l: 'Resolvidos'  },
                  { v: '',             l: 'Todos'       },
                ].map(o => (
                  <button
                    key={o.v} onClick={() => setStatusFilter(o.v)}
                    className={`px-2.5 py-1 rounded text-[10px] cursor-pointer font-semibold whitespace-nowrap transition-all ${
                      statusFilter === o.v ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista + painel de detalhe */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-2.5 min-h-[160px] overflow-hidden">

              {/* Lista */}
              <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${selected ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs">
                    <Loader2 size={16} className="animate-spin" /> Carregando...
                  </div>
                )}
                {!loading && filtered.length === 0 && (
                  <div className="text-center py-10">
                    <MoreHorizontal className="w-6 h-6 mx-auto mb-2 opacity-20" />
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Nenhuma ocorrência encontrada.</p>
                  </div>
                )}
                {filtered.map(inc => {
                  const pr = PRIORITY_CONFIG[inc.priority as keyof typeof PRIORITY_CONFIG];
                  const st = STATUS_CONFIG[inc.status as keyof typeof STATUS_CONFIG];
                  const isSelected = selected?.id === inc.id;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelected(isSelected ? null : inc)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all text-[11px] ${
                        isSelected ? 'bg-cyan/8 border-cyan/30' : 'bg-white/2 border-white/5 hover:bg-white/4'
                      }`}
                    >
                      {/* Dot de prioridade */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: pr.color, boxShadow: inc.status === 'aberto' ? `0 0 6px ${pr.color}` : 'none' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white leading-none truncate mb-1.5">{inc.title}</p>
                        <div className="flex items-center gap-1.5 text-[9.5px] flex-wrap">
                          <span className="font-semibold px-1.5 py-0.5 rounded-md" style={{ background: pr.bg, color: pr.color, border: `1px solid ${pr.border}` }}>{pr.label}</span>
                          <span className="font-semibold" style={{ color: st?.color ?? 'rgba(255,255,255,0.4)' }}>· {st?.label}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {inc.location ?? 'Área comum'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{formatDate(inc.created_at)}</span>
                        <ChevronRight size={12} style={{ color: isSelected ? CYAN : 'rgba(255,255,255,0.2)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Painel de detalhe */}
              {selected && (
                <div className="lg:col-span-2 rounded-2xl p-3.5 flex flex-col gap-3 overflow-y-auto"
                  style={{ background: 'linear-gradient(135deg, rgba(13,20,35,0.95), rgba(8,13,24,0.98))', border: '1px solid rgba(87,216,255,0.15)' }}>

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {selected.category}
                      </span>
                      <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.875rem', lineHeight: 1.25, marginTop: 2 }}>{selected.title}</h4>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }} className="hover:text-white/70 cursor-pointer">✕</button>
                  </div>

                  {/* Timeline */}
                  <StatusTimeline status={selected.status} />

                  {/* Descrição */}
                  <p className="text-[11px] text-white/60 leading-relaxed p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selected.description}
                  </p>

                  {/* Meta */}
                  <div className="space-y-1.5 text-[10px]">
                    {[
                      { icon: MapPin, label: selected.location ?? 'Não informado' },
                      { icon: User,   label: selected.profiles?.full_name ?? 'Condômino' },
                      { icon: Calendar, label: formatDate(selected.created_at) },
                      ...(selected.resolved_at ? [{ icon: CheckCircle2, label: `Resolvido em ${formatDate(selected.resolved_at)}` }] : []),
                    ].map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <m.icon size={11} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{m.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Ações (gestor) */}
                  {isGestor && selected.status !== 'resolvido' && selected.status !== 'fechado' && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {selected.status === 'aberto' && (
                        <button
                          disabled={updating === selected.id}
                          onClick={() => handleUpdateStatus(selected.id, 'em_andamento')}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          style={{ background: 'rgba(87,216,255,0.1)', border: '1px solid rgba(87,216,255,0.25)', color: CYAN }}
                        >
                          {updating === selected.id ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                          Iniciar Atendimento
                        </button>
                      )}
                      <button
                        disabled={updating === selected.id}
                        onClick={() => handleUpdateStatus(selected.id, 'resolvido')}
                        className="btn-primary flex items-center justify-center gap-1.5 py-2 text-xs font-bold"
                      >
                        {updating === selected.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Marcar como Resolvido
                      </button>
                    </div>
                  )}

                  {/* Feedback morador */}
                  {!isGestor && (
                    <div className="rounded-xl p-2.5 text-center"
                      style={{
                        background: selected.status === 'resolvido' ? 'rgba(16,185,129,0.07)' : selected.status === 'em_andamento' ? 'rgba(87,216,255,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selected.status === 'resolvido' ? 'rgba(16,185,129,0.2)' : selected.status === 'em_andamento' ? 'rgba(87,216,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                        {selected.status === 'resolvido'
                          ? '✅ Sua ocorrência foi resolvida pela equipe.'
                          : selected.status === 'em_andamento'
                          ? '🔧 A equipe já está trabalhando na sua ocorrência.'
                          : '📬 Seu chamado foi recebido e aguarda atendimento.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SlidePanel>
      ),
    },

    /* ── Slide 3: Registrar ── */
    {
      key: 'ocorrencias-registrar',
      label: 'Novo Chamado',
      content: (
        <SlidePanel
          eyebrow="Registrar Ocorrência"
          title={<>Abrir <span className="grad-text">Novo Chamado</span></>}
          badges={[
            { icon: '✦', label: 'Registro Direto' },
            { icon: '🔔', label: 'Notifica Gestão' },
            { icon: '🔒', label: 'Auditável' },
          ]}
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-3 py-1 text-xs">

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="input-label text-[11px]">Título do Chamado *</label>
                <input
                  type="text" className="input"
                  placeholder="Ex: Poste apagado na rua 4, Portão com defeito..."
                  value={formTitle} onChange={e => setFormTitle(e.target.value)} required
                />
              </div>

              <div>
                <label className="input-label text-[11px]">Localização / Unidade *</label>
                <input
                  type="text" className="input"
                  placeholder="Ex: Rua das Palmeiras / Chácara 42"
                  value={formLocation} onChange={e => setFormLocation(e.target.value)} required
                />
              </div>

              <div>
                <label className="input-label text-[11px]">Categoria</label>
                <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Seletor visual de prioridade */}
            <div>
              <label className="input-label text-[11px]">Prioridade</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {(Object.entries(PRIORITY_CONFIG) as [DbIncident['priority'], typeof PRIORITY_CONFIG['media']][]).map(([key, cfg]) => (
                  <button
                    key={key} type="button"
                    onClick={() => setFormPriority(key)}
                    className="py-2 rounded-xl text-center text-[10px] font-bold transition-all cursor-pointer"
                    style={{
                      background: formPriority === key ? cfg.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${formPriority === key ? cfg.color : 'rgba(255,255,255,0.07)'}`,
                      color: formPriority === key ? cfg.color : 'rgba(255,255,255,0.4)',
                      boxShadow: formPriority === key ? `0 0 12px ${cfg.color}25` : 'none',
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="input-label text-[11px]">Descrição Detalhada *</label>
              <textarea
                className="input resize-none"
                style={{ height: 72 }}
                placeholder="Descreva o problema com detalhes para que a equipe possa agir com precisão..."
                value={formDescription} onChange={e => setFormDescription(e.target.value)} required
              />
            </div>

            {/* Aviso de encaminhamento */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl"
              style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.12)' }}>
              <ArrowRight size={11} className="flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
              <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Seu chamado será encaminhado imediatamente para a administração e você poderá acompanhar o status em tempo real nesta página.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5"
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 size={13} className="animate-spin" /> Registrando...</>
                : <><Plus size={13} /> Abrir Ocorrência e Notificar Administração</>
              }
            </button>
          </form>
        </SlidePanel>
      ),
    },
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides3D} />
    </div>
  );
};
