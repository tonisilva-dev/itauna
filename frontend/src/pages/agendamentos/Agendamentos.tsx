import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Loader2, X, AlertTriangle, CheckCircle2, Clock,
  CalendarDays, ChevronRight, DollarSign, Ban, Pencil, Trash2,
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, gotoSlide, TODAY } from '../../utils/format';
import toast from 'react-hot-toast';
import {
  fetchAreasComuns, fetchBookings, createBooking, cancelBooking,
  confirmBookingPayment, insertAreaComum, updateAreaComum,
  type DbAreaComum, type DbBooking,
} from '@/lib/supabase-queries';

const getNow = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const GREEN  = '#10b981';
const CYAN   = '#57d8ff';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';

/* Detecta conflito de horário para área+data */
const hasConflict = (bookings: DbBooking[], areaId: string, date: string, start: string, end: string) =>
  bookings.some(b =>
    b.area_id === areaId && b.booking_date === date && b.ativo &&
    !(end <= b.start_time || start >= b.end_time)
  );

const dateLabel = (d: string) => {
  const parsed = parseISO(d);
  if (isToday(parsed))    return 'Hoje';
  if (isTomorrow(parsed)) return 'Amanhã';
  return format(parsed, "dd/MM (EEE)", { locale: ptBR });
};

const pgtoColor = (s: string) =>
  s === 'pago' ? GREEN : s === 'pendente' ? YELLOW : 'rgba(255,255,255,0.3)';
const pgtoLabel = (s: string) =>
  s === 'pago' ? 'Pago' : s === 'pendente' ? 'Aguardando pagamento' : 'Isento';

export const Agendamentos = () => {
  const { user, isGestor } = useAuth();

  const [areas, setAreas]       = useState<DbAreaComum[]>([]);
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [areaFilter, setAreaFilter] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [confirmPgtoId, setConfirmPgtoId] = useState<string | null>(null);

  // Form — nova reserva
  const [formAreaId, setFormAreaId] = useState('');
  const [formDate, setFormDate]     = useState(TODAY);
  const [formStart, setFormStart]   = useState('14:00');
  const [formEnd, setFormEnd]       = useState('18:00');
  const [formNotes, setFormNotes]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form — nova área (gestor)
  const [showAreaForm, setShowAreaForm]     = useState(false);
  const [editingArea, setEditingArea]       = useState<DbAreaComum | null>(null);
  const [areaFormNome, setAreaFormNome]     = useState('');
  const [areaFormDesc, setAreaFormDesc]     = useState('');
  const [areaFormCap, setAreaFormCap]       = useState('');
  const [areaFormEmoji, setAreaFormEmoji]   = useState('📍');
  const [areaFormCor, setAreaFormCor]       = useState('#57d8ff');
  const [areaFormRes, setAreaFormRes]       = useState(true);
  const [areaFormTaxa, setAreaFormTaxa]     = useState(false);
  const [areaFormValor, setAreaFormValor]   = useState('');
  const [savingArea, setSavingArea]         = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchAreasComuns(true),
      fetchBookings(isGestor ? undefined : user.id),
    ]).then(([a, b]) => {
      setAreas(a);
      setBookings(b);
      if (a.length > 0) setFormAreaId(a[0].id);
    }).catch(() => toast.error('Erro ao carregar agendamentos.'))
      .finally(() => setLoading(false));
  }, [user, isGestor]);

  const selectedArea  = useMemo(() => areas.find(a => a.id === formAreaId), [areas, formAreaId]);
  const conflict      = useMemo(() =>
    formAreaId ? hasConflict(bookings, formAreaId, formDate, formStart, formEnd) : false,
    [bookings, formAreaId, formDate, formStart, formEnd]
  );
  const occupiedSlots = useMemo(() =>
    bookings.filter(b => b.area_id === formAreaId && b.booking_date === formDate && b.ativo),
    [bookings, formAreaId, formDate]
  );
  const todayBookings = useMemo(() => bookings.filter(b => b.booking_date === TODAY), [bookings]);
  const filtered      = useMemo(() => bookings.filter(b => !areaFilter || b.area_id === areaFilter), [bookings, areaFilter]);

  // Status de disponibilidade hoje por área — getNow() é chamado fresh a cada render
  const areaStatus = useCallback((area: DbAreaComum) => {
    const now = getNow();
    if (!area.reservavel) return { label: 'Uso livre', color: CYAN, dot: 'bg-sky-400' };
    const today   = bookings.filter(b => b.area_id === area.id && b.booking_date === TODAY && b.ativo);
    const busyNow = today.some(b => b.start_time <= now && b.end_time > now);
    if (busyNow) return { label: 'Ocupada agora', color: RED,    dot: 'bg-red-400 animate-pulse' };
    const next   = today.find(b => b.start_time > now);
    if (next)    return { label: `Livre até ${next.start_time.slice(0,5)}`, color: YELLOW, dot: 'bg-yellow-400' };
    return        { label: 'Livre hoje', color: GREEN, dot: 'bg-emerald-400' };
  }, [bookings]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAreaId)              { toast.error('Selecione uma área.'); return; }
    if (formEnd <= formStart)     { toast.error('O fim deve ser após o início.'); return; }
    if (formDate < TODAY)         { toast.error('Data não pode ser no passado.'); return; }
    if (conflict)                 { toast.error('Horário já reservado para esta área.'); return; }
    if (!selectedArea?.reservavel){ toast.error('Esta área não aceita reservas.'); return; }
    setSubmitting(true);
    try {
      const novo = await createBooking({
        user_id:      user!.id,
        area_id:      formAreaId,
        area_name:    selectedArea?.nome ?? '',
        booking_date: formDate,
        start_time:   formStart,
        end_time:     formEnd,
        notes:        formNotes.trim() || null,
        cobra_taxa:   selectedArea?.cobra_taxa ?? false,
      });
      setBookings(prev => [...prev, novo].sort((a, b) => a.booking_date.localeCompare(b.booking_date)));
      setFormNotes(''); setFormDate(TODAY);
      if (selectedArea?.cobra_taxa) {
        toast.success(`Reserva registrada! Efetive o pagamento de ${formatCurrency(selectedArea.taxa_uso ?? 0)} para confirmar.`);
      } else {
        toast.success('Reserva confirmada!');
      }
      gotoSlide(1);
    } catch { toast.error('Erro ao realizar agendamento.'); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await cancelBooking(cancelId);
      setBookings(prev => prev.filter(b => b.id !== cancelId));
      toast.success('Reserva cancelada.');
    } catch { toast.error('Erro ao cancelar.'); }
    finally { setCancelId(null); }
  };

  const handleConfirmPgto = async () => {
    if (!confirmPgtoId) return;
    try {
      await confirmBookingPayment(confirmPgtoId);
      setBookings(prev => prev.map(b => b.id === confirmPgtoId ? { ...b, status_pagamento: 'pago' } : b));
      toast.success('Pagamento confirmado! Reserva efetivada.');
    } catch { toast.error('Erro ao confirmar pagamento.'); }
    finally { setConfirmPgtoId(null); }
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaFormNome.trim()) { toast.error('Nome obrigatório.'); return; }
    if (areaFormTaxa && (!areaFormValor || Number(areaFormValor) <= 0)) {
      toast.error('Informe o valor da taxa.'); return;
    }
    setSavingArea(true);
    const payload = {
      nome: areaFormNome.trim(), descricao: areaFormDesc.trim() || null,
      capacidade: areaFormCap.trim() || null, emoji: areaFormEmoji, cor: areaFormCor,
      reservavel: areaFormRes, cobra_taxa: areaFormTaxa,
      taxa_uso: areaFormTaxa ? Number(areaFormValor) : null, ativo: true,
    };
    try {
      if (editingArea) {
        await updateAreaComum(editingArea.id, payload);
        setAreas(prev => prev.map(a => a.id === editingArea.id ? { ...a, ...payload } : a));
        toast.success('Área atualizada!');
      } else {
        const nova = await insertAreaComum(payload as any);
        setAreas(prev => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)));
        toast.success('Área cadastrada!');
      }
      setShowAreaForm(false); setEditingArea(null);
      setAreaFormNome(''); setAreaFormDesc(''); setAreaFormCap('');
      setAreaFormEmoji('📍'); setAreaFormCor('#57d8ff'); setAreaFormRes(true);
      setAreaFormTaxa(false); setAreaFormValor('');
    } catch { toast.error('Erro ao salvar área.'); }
    finally { setSavingArea(false); }
  };

  const startEditArea = (a: DbAreaComum) => {
    setEditingArea(a); setAreaFormNome(a.nome); setAreaFormDesc(a.descricao ?? '');
    setAreaFormCap(a.capacidade ?? ''); setAreaFormEmoji(a.emoji); setAreaFormCor(a.cor);
    setAreaFormRes(a.reservavel); setAreaFormTaxa(a.cobra_taxa);
    setAreaFormValor(a.taxa_uso ? String(a.taxa_uso) : '');
    setShowAreaForm(true);
  };

  // ─────────────────────────────────────────────────────────────────
  const slides3D: SlideItem[] = [

    /* ── Slide 1: Áreas e disponibilidade ── */
    {
      key: 'areas',
      label: 'Áreas',
      content: (
        <SlidePanel
          eyebrow="Espaços de Lazer do Condomínio"
          title={<>Áreas <span className="grad-text">Disponíveis</span></>}
          subtitle="Reserve a piscina, salão de festas, quadra esportiva e demais espaços."
          badges={[
            { icon: '🏡', label: `${areas.length} áreas` },
            { icon: '📅', label: `${todayBookings.length} reservas hoje` },
            { icon: areas.some(a => a.cobra_taxa) ? '💰' : '✅', label: 'Algumas com taxa' },
          ]}
          actions={
            <button
              onClick={() => { gotoSlide(2); }}
              className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
            >
              <Plus size={13} /> Reservar
            </button>
          }
        >
          <div className="flex flex-col h-full gap-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Reservas Hoje" value={loading ? '...' : String(todayBookings.length)} icon={CalendarDays} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Próximas" value={loading ? '...' : String(bookings.length)} icon={Clock} iconColor={YELLOW} iconBg="rgba(245,158,11,0.08)" />
              <StatCard label="Áreas Ativas" value={loading ? '...' : String(areas.length)} icon={CheckCircle2} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
            </div>

            {/* Cards das áreas */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-xs"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
                {areas.map(area => {
                  const st = areaStatus(area);
                  const isFiltered = areaFilter === area.id;
                  return (
                    <button
                      key={area.id}
                      onClick={() => setAreaFilter(isFiltered ? '' : area.id)}
                      className="p-3 rounded-2xl text-left border cursor-pointer transition-all hover:scale-[1.02] flex flex-col gap-2"
                      style={{
                        background: isFiltered ? `${area.cor}14` : 'rgba(255,255,255,0.025)',
                        borderColor: isFiltered ? area.cor : 'rgba(255,255,255,0.06)',
                        boxShadow: isFiltered ? `0 0 18px ${area.cor}18` : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl leading-none">{area.emoji}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{area.nome}</p>
                        <p style={{ fontSize: '0.6rem', color: st.color, fontWeight: 600, marginTop: 2 }}>{st.label}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)' }}>{area.capacidade ?? '—'}</p>
                        {area.cobra_taxa && area.taxa_uso && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 700, color: YELLOW, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '1px 5px' }}>
                            {formatCurrency(area.taxa_uso)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Botão adicionar área (gestor) */}
                {isGestor && !showAreaForm && (
                  <button
                    onClick={() => setShowAreaForm(true)}
                    className="p-3 rounded-2xl border border-dashed cursor-pointer transition-all hover:bg-white/5 flex flex-col items-center justify-center gap-1.5"
                    style={{ borderColor: 'rgba(255,255,255,0.12)' }}
                  >
                    <Plus size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Nova Área</span>
                  </button>
                )}
              </div>
            )}

            {/* Agenda do dia */}
            {!loading && todayBookings.length > 0 && (
              <div className="rounded-xl p-2.5 space-y-1" style={{ background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.1)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: CYAN, textTransform: 'uppercase', letterSpacing: '.06em' }}>Agenda de Hoje</p>
                {todayBookings.map(b => (
                  <div key={b.id} className="flex items-center gap-2 text-[10px]">
                    <span>{b.areas_comuns?.emoji ?? '📍'}</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{b.areas_comuns?.nome ?? b.area_name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</span>
                    {b.status_pagamento === 'pendente' && (
                      <span style={{ color: YELLOW, fontWeight: 700, fontSize: '0.55rem' }}>· Taxa pendente</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SlidePanel>
      ),
    },

    /* ── Slide 2: Lista de reservas ── */
    {
      key: 'reservas',
      label: 'Reservas',
      content: (
        <SlidePanel
          eyebrow="Quadro de Reservas"
          title={<>Reservas <span className="grad-text">Confirmadas</span></>}
          badges={[
            { icon: '📅', label: 'Próximos Eventos' },
            { icon: '💰', label: 'Status Pagamento' },
            { icon: '⚡', label: 'Tempo Real' },
          ]}
        >
          <div className="flex flex-col h-full gap-2.5">
            {areaFilter && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl text-[10.5px]"
                style={{ background: 'rgba(87,216,255,0.06)', border: '1px solid rgba(87,216,255,0.15)' }}>
                <span style={{ color: CYAN }}>Filtro: <strong>{areas.find(a => a.id === areaFilter)?.nome}</strong></span>
                <button onClick={() => setAreaFilter('')} style={{ color: CYAN, fontWeight: 700 }} className="cursor-pointer hover:opacity-70">Limpar</button>
              </div>
            )}

            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs"><Loader2 size={16} className="animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                  <CalendarDays className="w-7 h-7 mx-auto mb-2 opacity-20" />
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Nenhuma reserva encontrada.</p>
                </div>
              ) : filtered.map(b => {
                const area   = b.areas_comuns;
                const color  = area?.cor ?? CYAN;
                const isOwn  = b.user_id === user?.id;
                const today  = b.booking_date === TODAY;
                const owner  = b.profiles?.unit_number
                  ? `Chácara ${String(b.profiles.unit_number).padStart(3,'0')}`
                  : b.profiles?.full_name ?? 'Condômino';

                return (
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl border"
                    style={{
                      background: today ? `${color}07` : 'rgba(255,255,255,0.02)',
                      borderColor: b.status_pagamento === 'pendente' ? 'rgba(245,158,11,0.25)' : today ? `${color}28` : 'rgba(255,255,255,0.05)',
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                      {area?.emoji ?? '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{area?.nome ?? b.area_name}</p>
                        {today && <span style={{ fontSize: '0.58rem', fontWeight: 800, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 5, padding: '1px 5px' }}>Hoje</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[9.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <span>📅 {dateLabel(b.booking_date)}</span>
                        <span>·</span>
                        <span>⏰ {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</span>
                        <span>·</span>
                        <span>{owner}</span>
                      </div>
                      {/* Status pagamento */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <DollarSign size={9} style={{ color: pgtoColor(b.status_pagamento) }} />
                        <span style={{ fontSize: '0.62rem', color: pgtoColor(b.status_pagamento), fontWeight: 600 }}>
                          {pgtoLabel(b.status_pagamento)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {isGestor && b.status_pagamento === 'pendente' && (
                        <button
                          onClick={() => setConfirmPgtoId(b.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}
                        >
                          <CheckCircle2 size={9} /> Confirmar Pgto
                        </button>
                      )}
                      {isOwn && (
                        <button
                          onClick={() => setCancelId(b.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.18)' }}
                        >
                          <X size={9} /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal: cancelar */}
          {cancelId && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
              <div className="rounded-2xl p-5 max-w-xs w-full mx-4 space-y-4" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: RED }} />
                  </div>
                  <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Cancelar Reserva?</h4>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Esta ação não pode ser desfeita. A área ficará disponível para outros condôminos.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCancelId(null)} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Manter</button>
                  <button onClick={handleCancel} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>Confirmar Cancelamento</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: confirmar pagamento */}
          {confirmPgtoId && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
              <div className="rounded-2xl p-5 max-w-xs w-full mx-4 space-y-4" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <DollarSign className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Confirmar Pagamento?</h4>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    Ao confirmar, a reserva ficará efetivada e o condômino será informado.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmPgtoId(null)} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                  <button onClick={handleConfirmPgto} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>Confirmar Recebimento</button>
                </div>
              </div>
            </div>
          )}
        </SlidePanel>
      ),
    },

    /* ── Slide 3: Nova reserva ── */
    {
      key: 'nova-reserva',
      label: 'Reservar',
      content: (
        <SlidePanel
          eyebrow="Nova Reserva"
          title={<>Reservar <span className="grad-text">Área Comum</span></>}
          badges={[
            { icon: '✦', label: 'Reserva Rápida' },
            { icon: '🔒', label: 'Verificação Automática' },
            { icon: selectedArea?.cobra_taxa ? '💰' : '✅', label: selectedArea?.cobra_taxa ? `Taxa: ${formatCurrency(selectedArea.taxa_uso ?? 0)}` : 'Uso gratuito' },
          ]}
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-3 py-1 text-xs">

            {/* Seletor visual de área */}
            <div>
              <label className="input-label text-[11px]">Área de Lazer</label>
              <div className="grid grid-cols-5 gap-1.5 mt-1">
                {areas.filter(a => a.reservavel).map(area => {
                  const st        = areaStatus(area);
                  const isChosen  = formAreaId === area.id;
                  return (
                    <button
                      key={area.id} type="button"
                      onClick={() => setFormAreaId(area.id)}
                      className="py-2.5 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all"
                      style={{
                        background: isChosen ? `${area.cor}14` : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${isChosen ? area.cor : 'rgba(255,255,255,0.07)'}`,
                        boxShadow: isChosen ? `0 0 14px ${area.cor}22` : 'none',
                      }}
                    >
                      <span className="text-base leading-none">{area.emoji}</span>
                      <span style={{ fontSize: '0.52rem', fontWeight: 700, color: isChosen ? area.cor : 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.2 }}>
                        {area.nome.split(' ')[0]}
                      </span>
                      <div className={`w-1 h-1 rounded-full ${st.dot}`} />
                    </button>
                  );
                })}
              </div>
              {selectedArea && (
                <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.4)', marginTop: 5, lineHeight: 1.4 }}>
                  {selectedArea.descricao}
                  {selectedArea.cobra_taxa && selectedArea.taxa_uso && (
                    <span style={{ color: YELLOW }}> · Taxa de uso: <strong>{formatCurrency(selectedArea.taxa_uso)}</strong></span>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="input-label text-[11px]">Data</label>
                <input type="date" className="input" value={formDate} min={TODAY} onChange={e => setFormDate(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Início</label>
                <input type="time" className="input" value={formStart} onChange={e => setFormStart(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Fim</label>
                <input type="time" className="input" value={formEnd} onChange={e => setFormEnd(e.target.value)} required />
              </div>
            </div>

            {/* Horários ocupados na data selecionada */}
            {occupiedSlots.length > 0 && (
              <div className="rounded-xl p-2.5 space-y-1" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p style={{ fontSize: '0.63rem', fontWeight: 700, color: YELLOW }}>Horários ocupados nesta data:</p>
                {occupiedSlots.map(b => (
                  <p key={b.id} style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.5)' }}>
                    · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                    {b.profiles?.unit_number ? ` (Ch.${b.profiles.unit_number})` : ''}
                  </p>
                ))}
              </div>
            )}

            {/* Conflito */}
            {conflict && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <AlertTriangle size={13} className="flex-shrink-0" style={{ color: RED }} />
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fca5a5' }}>Horário indisponível</p>
                  <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)' }}>Já existe reserva neste período. Escolha outro horário.</p>
                </div>
              </div>
            )}

            {/* Aviso de taxa */}
            {selectedArea?.cobra_taxa && !conflict && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <DollarSign size={13} className="flex-shrink-0" style={{ color: YELLOW }} />
                <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  Esta área cobra taxa de <strong style={{ color: YELLOW }}>{formatCurrency(selectedArea.taxa_uso ?? 0)}</strong> por reserva.
                  Sua reserva ficará <strong style={{ color: YELLOW }}>aguardando confirmação do pagamento</strong> pela administração.
                </p>
              </div>
            )}

            <div>
              <label className="input-label text-[11px]">Observações / Evento</label>
              <textarea className="input resize-none" style={{ height: 48 }}
                placeholder="Ex: Aniversário — aprox. 40 convidados"
                value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5"
              disabled={submitting || conflict || !selectedArea?.reservavel}
              style={conflict ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
            >
              {submitting
                ? <><Loader2 size={13} className="animate-spin" /> Registrando...</>
                : selectedArea?.cobra_taxa
                  ? <><DollarSign size={13} /> Solicitar Reserva (sujeito a pagamento)</>
                  : <><CheckCircle2 size={13} /> Confirmar Reserva</>
              }
            </button>
          </form>
        </SlidePanel>
      ),
    },

    /* ── Slide 4: Gerenciar áreas (gestor) ── */
    ...(isGestor ? [{
      key: 'gerenciar-areas',
      label: 'Gerenciar Áreas',
      content: (
        <SlidePanel
          eyebrow="Administração das Áreas"
          title={<>Gerenciar <span className="grad-text">Áreas Comuns</span></>}
          badges={[
            { icon: '🏡', label: `${areas.length} cadastradas` },
            { icon: '💰', label: 'Taxas configuráveis' },
            { icon: '⚙️', label: 'CRUD completo' },
          ]}
        >
          <div className="flex flex-col h-full gap-3 overflow-y-auto">

            {/* Formulário inline */}
            {showAreaForm && (
              <form onSubmit={handleSaveArea} className="rounded-2xl p-3.5 space-y-3 text-xs"
                style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.15)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p style={{ fontWeight: 700, color: CYAN, fontSize: '0.78rem' }}>{editingArea ? 'Editar Área' : 'Nova Área'}</p>
                  <button type="button" onClick={() => { setShowAreaForm(false); setEditingArea(null); }} style={{ color: 'rgba(255,255,255,0.4)' }} className="cursor-pointer hover:text-white/70">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <label className="input-label text-[10px]">Nome *</label>
                    <input className="input" placeholder="Ex: Sauna, Churrasqueira 2..." value={areaFormNome} onChange={e => setAreaFormNome(e.target.value)} required />
                  </div>
                  <div>
                    <label className="input-label text-[10px]">Emoji</label>
                    <input className="input" value={areaFormEmoji} onChange={e => setAreaFormEmoji(e.target.value)} maxLength={2} />
                  </div>
                  <div>
                    <label className="input-label text-[10px]">Capacidade</label>
                    <input className="input" placeholder="Ex: 40 pessoas" value={areaFormCap} onChange={e => setAreaFormCap(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="input-label text-[10px]">Descrição</label>
                    <input className="input" placeholder="Descrição breve da área..." value={areaFormDesc} onChange={e => setAreaFormDesc(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="accent-cyan" checked={areaFormRes} onChange={e => setAreaFormRes(e.target.checked)} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>Aceita reservas</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="accent-yellow-400" checked={areaFormTaxa} onChange={e => setAreaFormTaxa(e.target.checked)} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>Cobra taxa</span>
                  </label>
                  {areaFormTaxa && (
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: '0.68rem', color: YELLOW }}>R$</span>
                      <input className="input py-1 text-xs" style={{ width: 70 }} placeholder="0,00" value={areaFormValor} onChange={e => setAreaFormValor(e.target.value)} />
                    </div>
                  )}
                </div>

                <button type="submit" disabled={savingArea} className="btn-primary w-full justify-center py-2 text-xs font-bold gap-1">
                  {savingArea ? <><Loader2 size={11} className="animate-spin" /> Salvando...</> : <><CheckCircle2 size={11} /> Salvar Área</>}
                </button>
              </form>
            )}

            {/* Lista de áreas para gerenciar */}
            <div className="space-y-1.5 flex-1">
              {areas.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-lg flex-shrink-0">{a.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{a.nome}</p>
                    <div className="flex items-center gap-2 text-[9.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {a.reservavel ? <span style={{ color: GREEN }}>Reservável</span> : <span style={{ color: 'rgba(255,255,255,0.3)' }}>Livre</span>}
                      {a.cobra_taxa && a.taxa_uso && <span style={{ color: YELLOW }}>· Taxa {formatCurrency(a.taxa_uso)}</span>}
                      {a.capacidade && <span>· {a.capacidade}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEditArea(a)} className="p-1.5 rounded-lg cursor-pointer hover:bg-white/8" title="Editar">
                      <Pencil size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await updateAreaComum(a.id, { ativo: false });
                          setAreas(prev => prev.filter(x => x.id !== a.id));
                          toast.success('Área desativada.');
                        } catch { toast.error('Erro ao desativar área.'); }
                      }}
                      className="p-1.5 rounded-lg cursor-pointer hover:bg-red-500/10"
                      title="Desativar"
                    >
                      <Ban size={12} style={{ color: 'rgba(239,68,68,0.5)' }} />
                    </button>
                  </div>
                </div>
              ))}
              {!showAreaForm && (
                <button onClick={() => setShowAreaForm(true)} className="w-full py-2 rounded-xl border border-dashed cursor-pointer hover:bg-white/5 text-[11px] font-bold"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                  <Plus size={12} className="inline mr-1" /> Adicionar Nova Área
                </button>
              )}
            </div>
          </div>
        </SlidePanel>
      ),
    } as SlideItem] : []),
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides3D} />
    </div>
  );
};
