import { useState, useEffect, useMemo } from 'react';
import { gotoSlide } from '../../utils/format';
import { Plus, Calendar as CalendarIcon, ChevronRight, Loader2, Users, Clock, MapPin, Tag, CheckCircle2, Edit2, Save, X, AlertTriangle, Trash2 } from 'lucide-react';
import { format, parseISO, isFuture, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import {
  fetchAllEvents, insertEvent, updateEvent, deleteEvent, fetchInscricoes, fetchInscricoesCount,
  insertInscricao,
  type DbEvent,
} from '@/lib/supabase-queries';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const BLUE   = '#5a84ff';
const PURPLE = '#8b5cf6';
const YELLOW = '#f59e0b';

const CAT_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  'Reunião':   { color: BLUE,   bg: 'rgba(59,130,246,0.09)',  border: 'rgba(59,130,246,0.25)'  },
  'Social':    { color: PURPLE, bg: 'rgba(139,92,246,0.09)',  border: 'rgba(139,92,246,0.25)'  },
  'Esporte':   { color: GREEN,  bg: 'rgba(16,185,129,0.09)',  border: 'rgba(16,185,129,0.25)'  },
  'Ambiental': { color: CYAN,   bg: 'rgba(87,216,255,0.09)',  border: 'rgba(87,216,255,0.25)'  },
  'Cultural':  { color: YELLOW, bg: 'rgba(245,158,11,0.09)',  border: 'rgba(245,158,11,0.25)'  },
};
const getCat = (cat: string) => CAT_CONFIG[cat] ?? { color: CYAN, bg: 'rgba(87,216,255,0.08)', border: 'rgba(87,216,255,0.2)' };

const TODAY = new Date().toISOString().slice(0, 10);

export const Eventos = () => {
  const { isGestor, user } = useAuth();
  const [events, setEvents]   = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [selectedEvent, setSelectedEvent] = useState<DbEvent | null>(null);
  const [inscricoes, setInscricoes] = useState<any[]>([]);
  const [loadingInsc, setLoadingInsc] = useState(false);
  const [submittingInsc, setSubmittingInsc] = useState(false);

  // Inscrição — pré-preenchido com dados do usuário
  const [inscNome, setInscNome]       = useState('');
  const [inscEmail, setInscEmail]     = useState('');
  const [inscChacara, setInscChacara] = useState('');

  // Criar evento
  const [formTitle, setFormTitle]       = useState('');
  const [formDate, setFormDate]         = useState(TODAY);
  const [formStart, setFormStart]       = useState('18:00');
  const [formEnd, setFormEnd]           = useState('22:00');
  const [formLocation, setFormLocation] = useState('Salão de Festas');
  const [formCategory, setFormCategory] = useState('Social');
  const [formMax, setFormMax]           = useState('150');
  const [formDesc, setFormDesc]         = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Editar evento
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [deleteName, setDeleteName]     = useState('');
  const [savingEdit, setSavingEdit]     = useState(false);

  const clearForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormDate(TODAY);
    setFormStart('18:00');
    setFormEnd('22:00');
    setFormLocation('Salão de Festas');
    setFormCategory('Social');
    setFormMax('150');
    setEditingId(null);
  };

  useEffect(() => {
    fetchAllEvents()
      .then(async (data) => {
        setEvents(data);
        const upcoming = data.filter(e => !isPast(parseISO(e.event_date)) || isToday(parseISO(e.event_date)));
        if (upcoming.length) {
          const cts = await fetchInscricoesCount(upcoming.map(e => e.id));
          setCounts(cts);
          setSelectedEvent(upcoming[0] ?? null);
        }
      })
      .catch(() => toast.error('Erro ao carregar eventos.'))
      .finally(() => setLoading(false));
  }, []);

  // Pré-preenche dados do usuário logado na inscrição
  useEffect(() => {
    if (user) {
      setInscNome(user.full_name ?? '');
      setInscEmail(user.email ?? '');
      setInscChacara(user.unit_number ? String(user.unit_number) : '');
    }
  }, [user]);

  // Carrega inscrições ao selecionar evento
  useEffect(() => {
    if (!selectedEvent) return;
    setLoadingInsc(true);
    fetchInscricoes(selectedEvent.id)
      .then(setInscricoes)
      .catch(() => {})
      .finally(() => setLoadingInsc(false));
  }, [selectedEvent?.id]);

  const proximos = useMemo(
    () => events.filter(e => !isPast(parseISO(e.event_date)) || isToday(parseISO(e.event_date))),
    [events]
  );
  const passados = useMemo(
    () => events.filter(e => isPast(parseISO(e.event_date)) && !isToday(parseISO(e.event_date))),
    [events]
  );
  const totalInscritos = useMemo(
    () => Object.values(counts).reduce((s, n) => s + n, 0),
    [counts]
  );

  const handleInscricao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!inscNome.trim() || !inscEmail.trim()) { toast.error('Informe o nome e o e-mail.'); return; }
    const total = counts[selectedEvent.id] ?? 0;
    if (selectedEvent.max_participants && total >= selectedEvent.max_participants) {
      toast.error('Vagas esgotadas para este evento!'); return;
    }
    setSubmittingInsc(true);
    try {
      const nova = await insertInscricao({
        event_id: selectedEvent.id, nome: inscNome.trim(), email: inscEmail.trim(),
        unit_number: inscChacara ? Number(inscChacara) : null, user_id: user?.id ?? null,
      });
      setInscricoes(prev => [...prev, nova]);
      setCounts(prev => ({ ...prev, [selectedEvent.id]: (prev[selectedEvent.id] ?? 0) + 1 }));
      toast.success('Inscrição confirmada!');
    } catch { toast.error('Erro ao confirmar inscrição.'); }
    finally { setSubmittingInsc(false); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) { toast.error('Preencha título e descrição.'); return; }
    if (formEnd <= formStart) { toast.error('Horário de fim deve ser após o início.'); return; }
    setSubmittingEvent(true);
    try {
      const newEvent = await insertEvent({
        title: formTitle.trim(), description: formDesc.trim(),
        event_date: formDate, start_time: formStart, end_time: formEnd,
        location: formLocation, category: formCategory,
        max_participants: formMax ? Number(formMax) : null, created_by: user!.id,
      });
      setEvents(prev => [newEvent, ...prev].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      clearForm();
      toast.success('Evento publicado na agenda!');
      gotoSlide(0);
    } catch { toast.error('Erro ao criar evento.'); }
    finally { setSubmittingEvent(false); }
  };

  const handleEdit = (e: DbEvent) => {
    setEditingId(e.id);
    setFormTitle(e.title);
    setFormDesc(e.description);
    setFormDate(e.event_date);
    setFormStart(e.start_time);
    setFormEnd(e.end_time);
    setFormLocation(e.location);
    setFormCategory(e.category);
    setFormMax(String(e.max_participants ?? ''));
    gotoSlide(1);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formTitle.trim() || !formDesc.trim()) return;
    if (formEnd <= formStart) { toast.error('Horário de fim deve ser após o início.'); return; }
    setSavingEdit(true);
    try {
      const updated = await updateEvent(editingId, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        event_date: formDate,
        start_time: formStart,
        end_time: formEnd,
        location: formLocation,
        category: formCategory,
        max_participants: formMax ? Number(formMax) : null,
      });
      setEvents(prev => prev.map(e => e.id === editingId ? updated : e).sort((a, b) => a.event_date.localeCompare(b.event_date)));
      clearForm();
      toast.success('Evento atualizado com sucesso!');
      gotoSlide(0);
    } catch { toast.error('Erro ao atualizar evento.'); }
    finally { setSavingEdit(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEvent(deleteId);
      setEvents(prev => prev.filter(e => e.id !== deleteId));
      setDeleteId(null);
      setDeleteName('');
      if (selectedEvent?.id === deleteId) setSelectedEvent(null);
      toast.success('Evento removido com sucesso!');
    } catch { toast.error('Erro ao remover evento.'); }
  };

  // ─────────────────────────────────────────────────────────────────
  const slides3D: SlideItem[] = [

    /* ── Slide 1: Mural de eventos ── */
    {
      key: 'eventos-mural',
      label: 'Agenda',
      content: (
        <SlidePanel
          eyebrow="Agenda Social do Condomínio"
          title={<>Próximos <span className="grad-text">Eventos</span></>}
          badges={[
            { icon: '🎉', label: `${proximos.length} próximos` },
            { icon: '👥', label: `${totalInscritos} inscritos` },
            { icon: '⚡', label: 'Tempo Real' },
          ]}
          actions={
            isGestor ? (
              <button
                onClick={() => { gotoSlide(2); }}
                className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
              >
                <Plus size={13} /> Novo Evento
              </button>
            ) : undefined
          }
        >
          <div className="flex flex-col h-full gap-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Próximos" value={String(proximos.length)} icon={CalendarIcon} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Inscritos" value={String(totalInscritos)} icon={Users} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
              <StatCard label="Realizados" value={String(passados.length)} icon={CheckCircle2} iconColor="rgba(255,255,255,0.3)" iconBg="rgba(255,255,255,0.04)" />
            </div>

            {/* Lista de próximos eventos */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-xs">
                  <Loader2 size={14} className="animate-spin" /> Carregando...
                </div>
              )}
              {!loading && proximos.length === 0 && (
                <div className="text-center py-8">
                  <CalendarIcon className="w-7 h-7 mx-auto mb-2 opacity-20" />
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Nenhum evento próximo.</p>
                </div>
              )}
              {!loading && proximos.map(ev => {
                const cfg     = getCat(ev.category);
                const date    = parseISO(ev.event_date);
                const numInsc = counts[ev.id] ?? 0;
                const vagas   = ev.max_participants ? ev.max_participants - numInsc : null;
                const isSelected = selectedEvent?.id === ev.id;
                const hoje    = isToday(date);

                return (
                  <div key={ev.id}
                    onClick={() => { setSelectedEvent(ev); gotoSlide(1); }}
                    className="flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all"
                    style={{
                      background: isSelected ? `${cfg.color}10` : 'rgba(255,255,255,0.025)',
                      borderColor: isSelected ? cfg.color : cfg.border,
                    }}
                  >
                    {/* Bloco de data */}
                    <div className="flex-shrink-0 text-center rounded-xl p-2 min-w-[48px]"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <p style={{ fontSize: '1.3rem', fontWeight: 900, color: cfg.color, lineHeight: 1 }}>{format(date, 'd')}</p>
                      <p style={{ fontSize: '0.6rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', marginTop: 2 }}>
                        {format(date, 'MMM', { locale: ptBR })}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {ev.category}
                        </span>
                        {hoje && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.12)', color: YELLOW, border: '1px solid rgba(245,158,11,0.25)' }}>Hoje</span>}
                        {numInsc > 0 && <span style={{ fontSize: '0.62rem', color: GREEN, fontWeight: 700 }}>✓ {numInsc} inscrito{numInsc !== 1 ? 's' : ''}</span>}
                      </div>
                      <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem', lineHeight: 1.2 }} className="truncate">{ev.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <span className="flex items-center gap-0.5"><Clock size={8} /> {ev.start_time?.slice(0,5)}–{ev.end_time?.slice(0,5)}</span>
                        <span className="flex items-center gap-0.5"><MapPin size={8} /> {ev.location}</span>
                        {vagas !== null && <span style={{ color: vagas <= 5 ? YELLOW : 'inherit' }}>{vagas > 0 ? `${vagas} vagas` : '⚠ Esgotado'}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isGestor && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(ev); }} className="p-1 rounded hover:bg-white/10 transition" title="Editar">
                            <Edit2 size={11} style={{ color: CYAN }} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteId(ev.id); setDeleteName(ev.title); }} className="p-1 rounded hover:bg-red-500/20 transition" title="Deletar">
                            <Trash2 size={11} style={{ color: '#ef4444' }} />
                          </button>
                        </>
                      )}
                      {!isGestor && <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)', marginTop: 4 }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlidePanel>
      ),
    },

    /* ── Slide 2: Inscrição & Detalhes ── */
    {
      key: 'eventos-inscricao',
      label: 'Inscrições',
      content: (
        <SlidePanel
          eyebrow="Detalhes & Inscrição"
          title={<>Participar do <span className="grad-text">Evento</span></>}
          badges={[
            { icon: '✦', label: 'Vagas Limitadas' },
            { icon: '🔒', label: 'Inscrição Segura' },
            { icon: '⌘', label: 'Confirmação Imediata' },
          ]}
        >
          {selectedEvent ? (() => {
            const cfg     = getCat(selectedEvent.category);
            const numInsc = counts[selectedEvent.id] ?? 0;
            const vagas   = selectedEvent.max_participants ? selectedEvent.max_participants - numInsc : null;
            const esgotado = vagas !== null && vagas <= 0;
            return (
              <div className="flex flex-col h-full gap-3">

                {/* Card do evento */}
                <div className="rounded-2xl p-3.5"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {selectedEvent.category}
                      </span>
                      <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', marginTop: 4, lineHeight: 1.2 }}>{selectedEvent.title}</h4>
                    </div>
                    <div className="text-center rounded-xl p-2 flex-shrink-0"
                      style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.border}`, minWidth: 44 }}>
                      <p style={{ fontSize: '1.1rem', fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
                        {format(parseISO(selectedEvent.event_date), 'd')}
                      </p>
                      <p style={{ fontSize: '0.58rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>
                        {format(parseISO(selectedEvent.event_date), 'MMM', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 8 }}>{selectedEvent.description}</p>
                  <div className="flex flex-wrap gap-3 text-[9.5px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span className="flex items-center gap-1"><MapPin size={10} /> {selectedEvent.location}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {selectedEvent.start_time?.slice(0,5)} às {selectedEvent.end_time?.slice(0,5)}</span>
                    <span className="flex items-center gap-1"><Users size={10} /> {numInsc} inscrito{numInsc !== 1 ? 's' : ''}{selectedEvent.max_participants ? ` / ${selectedEvent.max_participants} vagas` : ''}</span>
                  </div>
                </div>

                {/* Inscritos recentes */}
                {inscricoes.length > 0 && (
                  <div className="rounded-xl px-3 py-2 space-y-1"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Inscritos</p>
                    <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
                      {loadingInsc ? <Loader2 size={10} className="animate-spin text-white/30" /> : inscricoes.slice(0, 6).map(i => (
                        <div key={i.id} className="flex items-center gap-1.5 text-[9.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: GREEN }} />
                          {i.nome}{i.unit_number ? ` — Ch.${i.unit_number}` : ''}
                        </div>
                      ))}
                      {inscricoes.length > 6 && <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>+{inscricoes.length - 6} outros</p>}
                    </div>
                  </div>
                )}

                {/* Formulário de inscrição */}
                {esgotado ? (
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: YELLOW }}>⚠ Vagas esgotadas</p>
                    <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>Este evento atingiu o limite de participantes.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-3.5 flex-1"
                    style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.15)' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: CYAN, marginBottom: 10 }}>✦ Confirmar Inscrição</h4>
                    <form onSubmit={handleInscricao} className="flex flex-col gap-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="input-label text-[10px]">Nome *</label>
                          <input type="text" className="input py-1.5" placeholder="Seu nome completo"
                            value={inscNome} onChange={e => setInscNome(e.target.value)} required />
                        </div>
                        <div>
                          <label className="input-label text-[10px]">E-mail *</label>
                          <input type="email" className="input py-1.5" placeholder="seu@email.com"
                            value={inscEmail} onChange={e => setInscEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="input-label text-[10px]">Nº Chácara</label>
                          <input type="number" className="input py-1.5" placeholder="Ex: 42"
                            value={inscChacara} onChange={e => setInscChacara(e.target.value)} />
                        </div>
                        <div className="flex items-end flex-shrink-0">
                          <button type="submit" disabled={submittingInsc}
                            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5">
                            {submittingInsc ? <><Loader2 size={11} className="animate-spin" /> Aguarde...</> : <><CheckCircle2 size={11} /> Inscrever</>}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
              <CalendarIcon className="w-8 h-8 opacity-20" />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Selecione um evento na Agenda para ver os detalhes.</p>
            </div>
          )}
        </SlidePanel>
      ),
    },

    /* ── Slide 3: Criar evento (gestor) / Histórico (morador) ── */
    {
      key: 'eventos-terceiro',
      label: isGestor ? 'Criar Evento' : 'Histórico',
      content: isGestor ? (
        <SlidePanel
          eyebrow={editingId ? 'Edição de Evento' : 'Publicar na Agenda'}
          title={<>{editingId ? 'Editar' : 'Criar'} <span className="grad-text">Evento</span></>}
          badges={[
            { icon: editingId ? '✏️' : '✦', label: editingId ? 'Modo Edição' : 'Publicação Imediata' },
            { icon: '🔔', label: 'Notifica Moradores' },
            { icon: '⌘', label: 'Agenda Oficial' },
          ]}
        >
          <form onSubmit={editingId ? handleSaveEdit : handleCreateEvent} className="flex flex-col gap-3 py-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Título do Evento *</label>
                <input type="text" className="input" placeholder="Ex: Torneio de Truco"
                  value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Data *</label>
                <input type="date" className="input" min={TODAY}
                  value={formDate} onChange={e => setFormDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <label className="input-label text-[11px]">Início</label>
                <input type="time" className="input" value={formStart} onChange={e => setFormStart(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Fim</label>
                <input type="time" className="input" value={formEnd} onChange={e => setFormEnd(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Categoria</label>
                <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                  <option>Social</option>
                  <option>Reunião</option>
                  <option>Esporte</option>
                  <option>Ambiental</option>
                  <option>Cultural</option>
                </select>
              </div>
              <div>
                <label className="input-label text-[11px]">Vagas</label>
                <input type="number" className="input" placeholder="Ilimitado" min="1"
                  value={formMax} onChange={e => setFormMax(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="input-label text-[11px]">Local</label>
              <select className="input" value={formLocation} onChange={e => setFormLocation(e.target.value)}>
                <option>Salão de Festas</option>
                <option>Área da Piscina</option>
                <option>Campo de Futebol</option>
                <option>Quiosque</option>
                <option>Quadra Poliesportiva</option>
                <option>Área Verde Central</option>
              </select>
            </div>

            <div>
              <label className="input-label text-[11px]">Descrição *</label>
              <textarea className="input resize-none" style={{ height: 64 }}
                placeholder="Detalhes do evento para atrair participantes..."
                value={formDesc} onChange={e => setFormDesc(e.target.value)} required />
            </div>

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => { clearForm(); gotoSlide(0); }}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={editingId ? savingEdit : submittingEvent}
                className="flex-1 btn-primary justify-center py-2.5 text-xs font-bold gap-1.5">
                {(editingId ? savingEdit : submittingEvent)
                  ? <><Loader2 size={13} className="animate-spin" /> {editingId ? 'Salvando...' : 'Publicando...'}</>
                  : <>{editingId ? <><Save size={13} /> Atualizar Evento</> : <><Plus size={13} /> Publicar na Agenda</>}</>
                }
              </button>
            </div>
          </form>
        </SlidePanel>
      ) : (
        <SlidePanel
          eyebrow="Memórias da Comunidade"
          title={<>Eventos <span className="grad-text">Realizados</span></>}
          badges={[
            { icon: '🌿', label: 'Histórico' },
            { icon: '🏆', label: 'Memórias' },
            { icon: '📅', label: `${passados.length} eventos` },
          ]}
        >
          <div className="flex flex-col h-full gap-2.5">
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
              Atividades que movimentaram nossa comunidade:
            </p>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {loading && <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-xs"><Loader2 size={14} className="animate-spin" /></div>}
              {!loading && passados.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', paddingTop: 32 }}>Nenhum evento passado.</p>}
              {!loading && passados.map(ev => {
                const cfg = getCat(ev.category);
                return (
                  <div key={ev.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <CalendarIcon size={13} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{ev.title}</p>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                        {format(parseISO(ev.event_date), "dd/MM/yyyy", { locale: ptBR })} · {ev.location}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 6px' }}>Encerrado</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SlidePanel>
      ),
    },
  ];

  const deleteModal = deleteId && (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 max-w-sm border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.97))' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>
          <h3 className="text-base font-bold text-white">Remover Evento?</h3>
        </div>
        <p className="text-xs text-white/60 mb-6 leading-relaxed">
          Você está prestes a remover o evento <strong style={{ color: 'rgba(255,255,255,0.9)' }}>"{deleteName}"</strong>. Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setDeleteId(null); setDeleteName(''); }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-2.5 rounded-lg text-white text-xs font-bold transition-all"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 16px rgba(239,68,68,0.3)' }}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides3D} />
      {deleteModal}
    </div>
  );
};
