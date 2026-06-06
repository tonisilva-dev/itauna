import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle, Plus, Search, Clock, CheckCircle2, Loader2,
  PlayCircle, ArrowRight, ChevronRight, MapPin, User, Calendar,
  Zap, MoreHorizontal, MessageSquare, Send, Eye,
} from 'lucide-react';
import { formatDate, gotoSlide } from '../../utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatCard } from '../../components/ui/StatCard';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import {
  fetchIncidents, createIncident,
  updateIncidentStatusWithNote, addIncidentComment,
  fetchIncidentUpdates, markIncidentSeenByGestor,
  type DbIncident, type DbIncidentUpdate,
} from '@/lib/supabase-queries';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';
const BLUE   = '#5a84ff';
const PURPLE = '#a78bfa';

const PRIORITY_CONFIG = {
  urgente: { label: 'Urgente', color: RED,    bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'  },
  alta:    { label: 'Alta',    color: YELLOW, bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  media:   { label: 'Média',   color: BLUE,   bg: 'rgba(90,132,255,0.10)', border: 'rgba(90,132,255,0.25)' },
  baixa:   { label: 'Baixa',   color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
};

const STATUS_CONFIG = {
  aberto:       { label: 'Aberto',       color: RED,    step: 0 },
  em_andamento: { label: 'Em andamento', color: CYAN,   step: 1 },
  resolvido:    { label: 'Resolvido',    color: GREEN,  step: 2 },
  fechado:      { label: 'Fechado',      color: 'rgba(255,255,255,0.3)', step: 2 },
};

const UPDATE_CONFIG: Record<string, { color: string; icon: string }> = {
  criado:      { color: 'rgba(255,255,255,0.35)', icon: '📝' },
  status:      { color: CYAN,   icon: '🔄' },
  comentario:  { color: PURPLE, icon: '💬' },
  resolucao:   { color: GREEN,  icon: '✅' },
};

const STATUS_LABEL_MAP: Record<string, string> = {
  aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido', fechado: 'Fechado',
};

const CATEGORIES = [
  'Manutenção Geral', 'Elétrica / Iluminação', 'Limpeza / Vias',
  'Infraestrutura', 'Segurança', 'Vizinhança', 'Outros',
];

/* ── Barra de progresso de status ── */
const StatusTimeline = ({ status }: { status: string }) => {
  const step = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.step ?? 0;
  const steps = [
    { label: 'Aberto',       icon: AlertCircle,  activeColor: RED   },
    { label: 'Em andamento', icon: PlayCircle,   activeColor: CYAN  },
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
              <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: current ? `${s.activeColor}20` : done ? `${s.activeColor}12` : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${color}`,
                  boxShadow: current ? `0 0 10px ${s.activeColor}40` : 'none',
                }}>
                <s.icon size={11} style={{ color }} />
              </div>
              <span style={{ fontSize: '0.58rem', color: current ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: current ? 700 : 400, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-1 mb-3.5"
                style={{ background: i < step ? `linear-gradient(90deg, ${steps[i].activeColor}60, ${steps[i+1].activeColor}40)` : 'rgba(255,255,255,0.06)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Item da linha do tempo ── */
const TimelineItem = ({ upd, isLast }: { upd: DbIncidentUpdate; isLast: boolean }) => {
  const cfg = UPDATE_CONFIG[upd.tipo] ?? UPDATE_CONFIG.comentario;
  const fmtHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex gap-2.5">
      {/* Trilho vertical */}
      <div className="flex flex-col items-center gap-0 flex-shrink-0" style={{ width: 20 }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}>
          {cfg.icon}
        </div>
        {!isLast && <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)', minHeight: 12 }} />}
      </div>

      <div className="flex-1 min-w-0 pb-3">
        {/* Linha de status */}
        {upd.tipo === 'status' || upd.tipo === 'resolucao' ? (
          <p style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
            {upd.status_anterior && upd.status_novo
              ? <><span style={{ color: 'rgba(255,255,255,0.45)' }}>{STATUS_LABEL_MAP[upd.status_anterior]}</span>{' → '}<span style={{ color: cfg.color }}>{STATUS_LABEL_MAP[upd.status_novo]}</span></>
              : <span style={{ color: cfg.color }}>{STATUS_LABEL_MAP[upd.status_novo ?? ''] ?? upd.tipo}</span>
            }
          </p>
        ) : (
          <p style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
            {upd.tipo === 'criado' ? 'Chamado aberto' : 'Nota da administração'}
          </p>
        )}

        {/* Mensagem/nota */}
        {upd.mensagem && (
          <div className="mt-1.5 rounded-xl p-2.5"
            style={{ background: upd.tipo === 'resolucao' ? 'rgba(16,185,129,0.07)' : upd.tipo === 'comentario' ? 'rgba(167,139,250,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${upd.tipo === 'resolucao' ? 'rgba(16,185,129,0.18)' : upd.tipo === 'comentario' ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{upd.mensagem}</p>
          </div>
        )}

        {/* Meta: autor + hora */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {upd.profiles?.full_name && (
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{upd.profiles.full_name}</span>
          )}
          {upd.profiles?.full_name && <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>·</span>}
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>{fmtHora(upd.created_at)}</span>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════ */

export const Ocorrencias = () => {
  const { user, isGestor } = useAuth();

  const [incidents, setIncidents]         = useState<DbIncident[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('aberto');
  const [selected, setSelected]           = useState<DbIncident | null>(null);
  const [updating, setUpdating]           = useState(false);

  // Timeline do chamado selecionado
  const [updates, setUpdates]             = useState<DbIncidentUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  // Resposta do gestor
  const [replyText, setReplyText]         = useState('');
  const [nextStatus, setNextStatus]       = useState<DbIncident['status'] | ''>('');
  const [sending, setSending]             = useState(false);

  // Form novo chamado
  const [formTitle, setFormTitle]         = useState('');
  const [formCategory, setFormCategory]   = useState(CATEGORIES[0]);
  const [formPriority, setFormPriority]   = useState<DbIncident['priority']>('media');
  const [formLocation, setFormLocation]   = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timelineBottomRef = useRef<HTMLDivElement>(null);

  /* ── Carga inicial ── */
  useEffect(() => {
    if (!user) return;
    fetchIncidents(isGestor ? undefined : user.id)
      .then(setIncidents)
      .catch(() => toast.error('Erro ao carregar ocorrências.'))
      .finally(() => setLoading(false));
  }, [user, isGestor]);

  /* ── Realtime: morador recebe notificação quando gestor responde ── */
  useEffect(() => {
    if (!user || isGestor) return;

    realtimeRef.current = supabase
      .channel(`incident-updates-morador-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'incident_updates',
      }, async payload => {
        const upd = payload.new as DbIncidentUpdate;
        // Verifica se é de uma ocorrência do morador
        const mine = incidents.find(i => i.id === upd.incident_id);
        if (!mine) return;

        // Atualiza timeline se o chamado está aberto no painel
        if (selected?.id === upd.incident_id) {
          setUpdates(prev => [...prev, upd]);
          setTimeout(() => timelineBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }

        // Notificação toast
        if (upd.tipo === 'resolucao') {
          toast.success(`✅ "${mine.title}" foi resolvida pela administração!`, { duration: 8000 });
        } else if (upd.tipo === 'status' && upd.status_novo === 'em_andamento') {
          toast(`🔧 Sua ocorrência "${mine.title}" está em atendimento.`, {
            duration: 6000,
            style: { background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.3)', color: '#fff' },
          });
        } else if (upd.tipo === 'comentario') {
          toast(`💬 Administração comentou em "${mine.title}".`, {
            duration: 7000,
            style: { background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#fff' },
          });
        }

        // Atualiza status local se mudou
        if (upd.status_novo) {
          setIncidents(prev => prev.map(i => i.id === upd.incident_id
            ? { ...i, status: upd.status_novo as DbIncident['status'], resolved_at: upd.status_novo === 'resolvido' ? upd.created_at : i.resolved_at }
            : i
          ));
          if (selected?.id === upd.incident_id) {
            setSelected(prev => prev ? { ...prev, status: upd.status_novo as DbIncident['status'] } : prev);
          }
        }
      })
      .subscribe();

    return () => { realtimeRef.current?.unsubscribe(); };
  }, [user, isGestor, incidents, selected]);

  /* ── Carregar timeline ao selecionar chamado ── */
  const selectIncident = useCallback(async (inc: DbIncident | null) => {
    setSelected(inc);
    setReplyText('');
    setNextStatus('');
    if (!inc) { setUpdates([]); return; }

    setUpdatesLoading(true);
    try {
      const data = await fetchIncidentUpdates(inc.id);
      setUpdates(data);
      setTimeout(() => timelineBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* silencioso */ }
    finally { setUpdatesLoading(false); }

    // Marcar como visto pelo gestor (apenas se gestor e ainda não visto)
    if (isGestor && !inc.seen_by_gestor_at) {
      markIncidentSeenByGestor(inc.id).catch(() => {});
      setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, seen_by_gestor_at: new Date().toISOString() } : i));
    }
  }, [isGestor]);

  /* ── Enviar resposta/comentário do gestor ── */
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selected) return;
    if (!replyText.trim() && !nextStatus) {
      toast.error('Escreva uma mensagem ou selecione um novo status.');
      return;
    }
    setSending(true);
    try {
      if (nextStatus && nextStatus !== selected.status) {
        // Mudança de status + nota opcional
        await updateIncidentStatusWithNote(
          selected.id,
          nextStatus as DbIncident['status'],
          replyText.trim() || null,
          user.id,
          selected.status,
        );
        const patch = { status: nextStatus as DbIncident['status'], resolved_at: nextStatus === 'resolvido' ? new Date().toISOString() : selected.resolved_at };
        setIncidents(prev => prev.map(i => i.id === selected.id ? { ...i, ...patch } : i));
        setSelected(prev => prev ? { ...prev, ...patch } : prev);
        toast.success(nextStatus === 'resolvido' ? 'Ocorrência resolvida!' : 'Status atualizado!');
      } else if (replyText.trim()) {
        // Comentário puro sem mudar status
        const upd = await addIncidentComment(selected.id, user.id, replyText.trim());
        setUpdates(prev => [...prev, upd]);
        toast.success('Resposta enviada ao morador.');
      }
      setReplyText('');
      setNextStatus('');
      // Recarrega a timeline completa para garantir sincronismo
      const data = await fetchIncidentUpdates(selected.id);
      setUpdates(data);
      setTimeout(() => timelineBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      toast.error('Erro ao enviar resposta.');
    } finally {
      setSending(false);
    }
  };

  /* ── Criar novo chamado ── */
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

  /* ── Derivados ── */
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

  /* ── Painel de detalhe (reutilizado nos slides 1 e 2) ── */
  const DetalhePanel = () => {
    if (!selected) return null;
    const pr = PRIORITY_CONFIG[selected.priority];
    const hasResponse = updates.some(u => u.tipo === 'comentario' || u.tipo === 'resolucao');
    const seenAt = (selected as any).seen_by_gestor_at as string | null;

    return (
      <div className="rounded-2xl flex flex-col gap-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(13,20,35,0.97), rgba(8,13,24,0.99))', border: '1px solid rgba(87,216,255,0.18)' }}>

        {/* ── Header ── */}
        <div className="p-3.5 border-b border-white/5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {selected.category}
              </span>
              <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.875rem', lineHeight: 1.25, marginTop: 2 }}>{selected.title}</h4>
            </div>
            <button onClick={() => selectIncident(null)} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} className="hover:text-white/70 cursor-pointer text-sm font-bold">✕</button>
          </div>

          {/* Badge prioridade + "visto" */}
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: pr.bg, color: pr.color, border: `1px solid ${pr.border}` }}>{pr.label}</span>
            {!isGestor && seenAt && (
              <span className="flex items-center gap-1" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                <Eye size={9} /> Visto pela gestão em {new Date(seenAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {!isGestor && !seenAt && selected.status === 'aberto' && (
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>Aguardando análise</span>
            )}
          </div>

          {/* Barra de progresso */}
          <div className="mt-3">
            <StatusTimeline status={selected.status} />
          </div>
        </div>

        {/* ── Linha do Tempo ── */}
        <div className="px-3.5 pt-3 flex-1 overflow-y-auto" style={{ maxHeight: 260 }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Histórico
          </p>
          {updatesLoading ? (
            <div className="flex items-center gap-2 py-4 text-white/30 text-xs justify-center">
              <Loader2 size={13} className="animate-spin" />
            </div>
          ) : updates.length === 0 ? (
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', paddingBottom: 12 }}>Sem histórico ainda.</p>
          ) : (
            <div>
              {/* Descrição original do morador como primeiro evento visual */}
              <div className="flex gap-2.5 mb-0">
                <div className="flex flex-col items-center gap-0 flex-shrink-0" style={{ width: 20 }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    📋
                  </div>
                  <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)', minHeight: 12 }} />
                </div>
                <div className="flex-1 pb-3 min-w-0">
                  <p style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}>Descrição do problema</p>
                  <div className="mt-1.5 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{selected.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {selected.location && <><MapPin size={9} style={{ color: 'rgba(255,255,255,0.3)' }} /><span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{selected.location}</span></>}
                  </div>
                </div>
              </div>

              {updates.map((u, i) => (
                <TimelineItem key={u.id} upd={u} isLast={i === updates.length - 1} />
              ))}
              <div ref={timelineBottomRef} />
            </div>
          )}

          {/* Banner de feedback para morador (quando não há resposta ainda) */}
          {!isGestor && !hasResponse && selected.status !== 'resolvido' && (
            <div className="rounded-xl p-2.5 mb-3 text-center"
              style={{
                background: selected.status === 'em_andamento' ? 'rgba(87,216,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected.status === 'em_andamento' ? 'rgba(87,216,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {selected.status === 'em_andamento'
                  ? '🔧 A equipe já está trabalhando no seu chamado.'
                  : '📬 Chamado recebido. Você será notificado quando houver atualizações.'}
              </p>
            </div>
          )}
        </div>

        {/* ── Formulário de resposta (gestor) ── */}
        {isGestor && selected.status !== 'fechado' && (
          <form onSubmit={handleSendReply} className="border-t border-white/6 p-3.5 space-y-2.5">
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Responder
            </p>

            {/* Seletor de próximo status */}
            <div className="flex gap-1 flex-wrap">
              {([
                { v: '',             l: 'Só comentar'   },
                { v: 'em_andamento', l: '▶ Iniciar'     },
                { v: 'resolvido',    l: '✅ Resolver'    },
                { v: 'fechado',      l: '🔒 Fechar'     },
              ] as const).filter(o => !o.v || o.v !== selected.status).map(o => (
                <button key={o.v} type="button"
                  onClick={() => setNextStatus(o.v as any)}
                  className="px-2 py-1 rounded-lg text-[9.5px] font-bold cursor-pointer transition-all"
                  style={{
                    background: nextStatus === o.v ? 'rgba(87,216,255,0.15)' : 'rgba(255,255,255,0.04)',
                    color: nextStatus === o.v ? CYAN : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${nextStatus === o.v ? 'rgba(87,216,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                className="input resize-none text-xs w-full"
                style={{ minHeight: 60, paddingRight: 40 }}
                placeholder={nextStatus === 'resolvido'
                  ? 'Descreva a solução aplicada (enviada ao morador)...'
                  : nextStatus === 'em_andamento'
                  ? 'Informe o morador o que está sendo feito (opcional)...'
                  : 'Escreva uma mensagem ou nota para o morador...'
                }
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
              />
              <button
                type="submit"
                disabled={sending || (!replyText.trim() && !nextStatus)}
                className="absolute right-2 bottom-2 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                style={{
                  background: (replyText.trim() || nextStatus) && !sending ? 'rgba(87,216,255,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${(replyText.trim() || nextStatus) && !sending ? 'rgba(87,216,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {sending ? <Loader2 size={12} className="animate-spin" style={{ color: CYAN }} /> : <Send size={12} style={{ color: (replyText.trim() || nextStatus) ? CYAN : 'rgba(255,255,255,0.25)' }} />}
              </button>
            </div>

            {nextStatus === 'resolvido' && (
              <p style={{ fontSize: '0.63rem', color: 'rgba(16,185,129,0.7)', lineHeight: 1.5 }}>
                💡 O morador receberá uma notificação e poderá ver a solução descrita acima.
              </p>
            )}
          </form>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════
     SLIDES
  ════════════════════════════════════════════════════════════════ */
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
            <button onClick={() => gotoSlide(2)} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
              <Plus size={13} /> Novo Chamado
            </button>
          }
        >
          <div className="flex flex-col h-full gap-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Abertos"      value={loading ? '...' : String(abertos)}    icon={AlertCircle}  iconColor={RED}   iconBg="rgba(239,68,68,0.08)" />
              <StatCard label="Em Andamento" value={loading ? '...' : String(andamento)}  icon={Clock}        iconColor={CYAN}  iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Resolvidos"   value={loading ? '...' : String(resolvidos)} icon={CheckCircle2} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
            </div>

            {!loading && incidents.length > 0 && (
              <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Taxa de Resolução</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: GREEN }}>{Math.round((resolvidos / incidents.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(resolvidos / incidents.length) * 100}%`, background: `linear-gradient(90deg, ${CYAN}, ${GREEN})` }} />
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{resolvidos}/{incidents.length}</span>
              </div>
            )}

            {/* Urgentes abertos */}
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
                  <div className="flex items-center gap-2 text-white/30 text-[10px] py-4 justify-center"><Loader2 size={13} className="animate-spin" /></div>
                ) : urgentesAbertos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                    <CheckCircle2 className="w-7 h-7" style={{ color: 'rgba(16,185,129,0.4)' }} />
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Nenhum chamado urgente em aberto</p>
                  </div>
                ) : urgentesAbertos.map(inc => {
                  const pr2 = PRIORITY_CONFIG[inc.priority];
                  return (
                    <div key={inc.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      style={{ background: pr2.bg, border: `1px solid ${pr2.border}` }}
                      onClick={() => { selectIncident(inc); gotoSlide(1); }}>
                      <Zap size={12} className="flex-shrink-0" style={{ color: pr2.color }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }} className="truncate">{inc.title}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>{inc.location ?? 'Área comum'} · {inc.category}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: pr2.color, textTransform: 'uppercase' }}>{pr2.label}</span>
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

    /* ── Slide 2: Lista + Detalhe ── */
    {
      key: 'ocorrencias-lista',
      label: 'Chamados',
      content: (
        <SlidePanel
          eyebrow="Gestão de Chamados"
          title={<>Mural de <span className="grad-text">Solicitações</span></>}
          badges={[
            { icon: '📋', label: 'Histórico Completo' },
            { icon: '💬', label: 'Resposta da Gestão' },
            { icon: '⚡', label: 'Fluxo Auditável' },
          ]}
        >
          <div className="flex flex-col h-full gap-2.5">
            {/* Busca + filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input type="text" className="input pl-8 py-1.5 text-xs" placeholder="Buscar por título ou local..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 w-fit self-end overflow-x-auto">
                {[
                  { v: 'aberto',       l: 'Abertos'    },
                  { v: 'em_andamento', l: 'Andamento'  },
                  { v: 'resolvido',    l: 'Resolvidos' },
                  { v: '',             l: 'Todos'      },
                ].map(o => (
                  <button key={o.v} onClick={() => setStatusFilter(o.v)}
                    className={`px-2.5 py-1 rounded text-[10px] cursor-pointer font-semibold whitespace-nowrap transition-all ${statusFilter === o.v ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista + detalhe lado a lado */}
            <div className={`flex-1 grid gap-2.5 min-h-[160px] overflow-hidden ${selected ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
              {/* Lista */}
              <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${selected ? 'lg:col-span-2' : ''}`}>
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
                {!loading && filtered.length === 0 && (
                  <div className="text-center py-10">
                    <MoreHorizontal className="w-6 h-6 mx-auto mb-2 opacity-20" />
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Nenhuma ocorrência encontrada.</p>
                  </div>
                )}
                {filtered.map(inc => {
                  const pr2 = PRIORITY_CONFIG[inc.priority];
                  const st2 = STATUS_CONFIG[inc.status as keyof typeof STATUS_CONFIG];
                  const isSelected = selected?.id === inc.id;
                  const seenInc = (inc as any).seen_by_gestor_at as string | null;
                  return (
                    <div key={inc.id}
                      onClick={() => selectIncident(isSelected ? null : inc)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all text-[11px] ${isSelected ? 'bg-cyan/8 border-cyan/30' : 'bg-white/2 border-white/5 hover:bg-white/4'}`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: pr2.color, boxShadow: inc.status === 'aberto' ? `0 0 6px ${pr2.color}` : 'none' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white leading-none truncate mb-1.5">{inc.title}</p>
                        <div className="flex items-center gap-1.5 text-[9.5px] flex-wrap">
                          <span className="font-semibold px-1.5 py-0.5 rounded-md" style={{ background: pr2.bg, color: pr2.color, border: `1px solid ${pr2.border}` }}>{pr2.label}</span>
                          <span className="font-semibold" style={{ color: st2?.color ?? 'rgba(255,255,255,0.4)' }}>· {st2?.label}</span>
                          {!isGestor && seenInc && <Eye size={8} style={{ color: 'rgba(255,255,255,0.3)' }} />}
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
                <div className="lg:col-span-3 overflow-y-auto">
                  <DetalhePanel />
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
                <input type="text" className="input" placeholder="Ex: Poste apagado na rua 4, Portão com defeito..."
                  value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Localização / Unidade *</label>
                <input type="text" className="input" placeholder="Ex: Rua das Palmeiras / Chácara 42"
                  value={formLocation} onChange={e => setFormLocation(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Categoria</label>
                <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label text-[11px]">Prioridade</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {(Object.entries(PRIORITY_CONFIG) as [DbIncident['priority'], typeof PRIORITY_CONFIG['media']][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setFormPriority(key)}
                    className="py-2 rounded-xl text-center text-[10px] font-bold transition-all cursor-pointer"
                    style={{
                      background: formPriority === key ? cfg.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${formPriority === key ? cfg.color : 'rgba(255,255,255,0.07)'}`,
                      color: formPriority === key ? cfg.color : 'rgba(255,255,255,0.4)',
                      boxShadow: formPriority === key ? `0 0 12px ${cfg.color}25` : 'none',
                    }}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="input-label text-[11px]">Descrição Detalhada *</label>
              <textarea className="input resize-none" style={{ height: 72 }}
                placeholder="Descreva o problema com detalhes para que a equipe possa agir com precisão..."
                value={formDescription} onChange={e => setFormDescription(e.target.value)} required />
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.12)' }}>
              <MessageSquare size={11} className="flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
              <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Seu chamado será encaminhado para a administração. Você receberá uma notificação quando houver resposta ou mudança de status.
              </p>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5" disabled={submitting}>
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
