import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isPast, isFuture, addMinutes, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Video, Calendar, Users, CheckCircle2, XCircle, Clock, Plus, Trash2,
  ExternalLink, Loader2, AlertTriangle, Link2, Settings, ChevronDown, ChevronUp,
  RefreshCw, Bell, FileText, Send, TimerReset, Pencil, Save, X,
} from 'lucide-react';
import { supabase, db } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';

const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const RED   = '#ef4444';
const YELL  = '#f59e0b';
const PURP  = '#a855f7';

/* ─── Tipos ──────────────────────────────────────────────────── */
interface Meeting {
  id: string; title: string; description: string | null;
  scheduled_at: string; duration_min: number;
  google_event_id: string | null; meet_link: string | null;
  status: 'scheduled' | 'cancelled' | 'done';
  agenda_locked: boolean; created_by: string | null; created_at: string;
  ata_texto: string | null;
}
interface AgendaItem {
  id: string; meeting_id: string; position: number;
  title: string; description: string | null; doc_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'deferred'; notes: string | null;
}
interface Rsvp {
  id: string; meeting_id: string; user_id: string;
  unit_number: number | null; response: 'pending' | 'confirmed' | 'declined';
  responded_at: string | null;
  profiles?: { full_name: string | null; unit_number: number | null };
}

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtDt(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR });
}
function fmtCountdown(iso: string) {
  const h = differenceInHours(new Date(iso), new Date());
  if (h < 0)    return 'Encerrada';
  if (h < 1)    return 'Em breve!';
  if (h < 24)   return `Em ${h}h`;
  return `Em ${Math.ceil(h / 24)} dias`;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: CYAN   },
  cancelled: { label: 'Cancelada', color: RED    },
  done:      { label: 'Encerrada', color: '#6b7280' },
};

const ITEM_STATUS_OPTS = [
  { value: 'pending',  label: 'Pendente',  color: '#6b7280' },
  { value: 'approved', label: 'Aprovado',  color: '#10b981' },
  { value: 'rejected', label: 'Rejeitado', color: '#ef4444' },
  { value: 'deferred', label: 'Adiado',    color: '#f59e0b' },
] as const;

/* ─── MeetingCard (compartilhado) ────────────────────────────── */
const MeetingCard = ({
  m, rsvps, agendaItems = [], expanded, onToggle, onRsvp, isGestor, onCancel, onUpdate,
}: {
  m: Meeting; rsvps: Rsvp[]; agendaItems?: AgendaItem[]; expanded: boolean;
  onToggle: () => void;
  onRsvp?: (resp: 'confirmed' | 'declined') => void;
  isGestor?: boolean;
  onCancel?: () => void;
  onUpdate?: () => void;
}) => {
  const { user } = useAuth();
  const myRsvp   = rsvps.find(r => r.user_id === user?.id);
  const [gerandoAta, setGerandoAta] = useState(false);
  const [ataTexto,   setAtaTexto]   = useState<string | null>(m.ata_texto ?? null);
  const [ataEditando, setAtaEditando] = useState(false);
  const [ataSalvando, setAtaSalvando] = useState(false);

  // ── Edição inline ──────────────────────────────────────────────
  const [editMode,   setEditMode]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  // Campos editáveis da reunião
  const scheduledDate = m.scheduled_at.slice(0, 10);
  const scheduledTime = m.scheduled_at.slice(11, 16);
  const [editDate, setEditDate] = useState(scheduledDate);
  const [editTime, setEditTime] = useState(scheduledTime);
  const [editDesc, setEditDesc] = useState(m.description ?? '');
  // Cópia local dos itens de pauta para edição
  const [editItems, setEditItems] = useState<AgendaItem[]>(agendaItems);

  // Sincroniza itens quando o pai atualiza
  useEffect(() => { setEditItems(agendaItems); }, [agendaItems]);

  const openEdit = () => {
    setEditDate(m.scheduled_at.slice(0, 10));
    setEditTime(m.scheduled_at.slice(11, 16));
    setEditDesc(m.description ?? '');
    setEditItems(agendaItems);
    setEditMode(true);
  };

  const handleSalvarEdicao = async () => {
    setSaving(true);
    try {
      const scheduled_at = new Date(`${editDate}T${editTime}:00`).toISOString();
      const { error: errM } = await (supabase as any)
        .from('meetings')
        .update({ scheduled_at, description: editDesc || null })
        .eq('id', m.id);
      if (errM) throw errM;

      for (const item of editItems) {
        const { error: errI } = await (supabase as any)
          .from('agenda_items')
          .update({ title: item.title, notes: item.notes || null, status: item.status })
          .eq('id', item.id);
        if (errI) throw errI;
      }

      setEditMode(false);
      toast.success('Reunião atualizada.');
      onUpdate?.();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message ?? String(err)));
    } finally {
      setSaving(false);
    }
  };
  const [elapsedMin, setElapsedMin] = useState<number | null>(null);

  // Timer ao vivo para reuniões em andamento
  useEffect(() => {
    if (m.status !== 'scheduled') return;
    const start = new Date(m.scheduled_at);
    const end   = addMinutes(start, m.duration_min);
    const tick  = () => {
      const now = new Date();
      if (now >= start && now <= end) {
        setElapsedMin(differenceInMinutes(now, start));
      } else {
        setElapsedMin(null);
      }
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [m.scheduled_at, m.duration_min, m.status]);

  const isActive       = elapsedMin !== null;
  const confirmed      = rsvps.filter(r => r.response === 'confirmed').length;
  // Limite de 60 min aplica-se a grupos (3+ pessoas). Aqui: total confirmados + gestor ≈ confirmed+1
  const isGroup        = confirmed >= 2;
  const approachingLim = isActive && isGroup && elapsedMin! >= 50;
  const overLimit      = isActive && isGroup && elapsedMin! >= 60;

  const handleGerarAta = async () => {
    setGerandoAta(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-ata', {
        body: { meeting_id: m.id },
      });
      if (error) throw error;
      setAtaTexto(data.ata);
      setAtaEditando(true);
    } catch (err: any) {
      toast.error('Erro ao gerar ata: ' + (err.message ?? String(err)));
    } finally {
      setGerandoAta(false);
    }
  };

  const handleSalvarAta = async () => {
    if (!ataTexto) return;
    setAtaSalvando(true);
    try {
      const { error } = await (supabase as any).from('meetings').update({ ata_texto: ataTexto }).eq('id', m.id);
      if (error) throw error;
      setAtaEditando(false);
      toast.success('Ata salva com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar ata: ' + (err.message ?? String(err)));
    } finally {
      setAtaSalvando(false);
    }
  };
  const pending   = rsvps.filter(r => r.response === 'pending').length;
  const isFut    = isFuture(new Date(m.scheduled_at));
  const badge    = STATUS_BADGE[m.status] ?? STATUS_BADGE.scheduled;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${m.status === 'scheduled' ? `${CYAN}22` : 'rgba(255,255,255,0.07)'}` }}>

      {/* Header */}
      <button className="w-full flex items-start gap-3 p-4 text-left" onClick={onToggle}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${badge.color}18`, border: `1px solid ${badge.color}33` }}>
          <Video size={16} style={{ color: badge.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white/90 truncate">{m.title}</span>
            <span className="px-2 py-0.5 rounded-lg text-[0.55rem] font-black uppercase tracking-wider"
              style={{ background: `${badge.color}18`, color: badge.color }}>
              {badge.label}
            </span>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>
            {fmtDt(m.scheduled_at)} · {m.duration_min} min
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span style={{ fontSize: '0.6rem', color: GREEN }}>
              <CheckCircle2 size={9} className="inline mr-0.5" />{confirmed} confirmados
            </span>
            <span style={{ fontSize: '0.6rem', color: YELL }}>
              <Clock size={9} className="inline mr-0.5" />{pending} pendentes
            </span>
            {isFut && m.status === 'scheduled' && (
              <span className="text-[0.6rem] font-bold" style={{ color: CYAN }}>
                {fmtCountdown(m.scheduled_at)}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} className="flex-shrink-0 mt-1" />
                  : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} className="flex-shrink-0 mt-1" />}
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/[0.04] pt-3">
          {m.description && (
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{m.description}</p>
          )}

          {/* Timer ao vivo — reunião em andamento */}
          {isActive && (
            <div className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{
                background: overLimit ? 'rgba(239,68,68,0.10)' : approachingLim ? 'rgba(245,158,11,0.10)' : 'rgba(87,216,255,0.06)',
                border: `1px solid ${overLimit ? 'rgba(239,68,68,0.3)' : approachingLim ? 'rgba(245,158,11,0.3)' : 'rgba(87,216,255,0.2)'}`,
              }}>
              <TimerReset size={13} style={{ color: overLimit ? RED : approachingLim ? YELL : CYAN, flexShrink: 0 }} />
              <div className="flex-1">
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: overLimit ? RED : approachingLim ? YELL : CYAN }}>
                  {overLimit
                    ? `Limite de 60 min atingido (${elapsedMin} min) — sala pode encerrar a qualquer momento`
                    : approachingLim
                    ? `${elapsedMin} min — Google Meet encerrará em ${60 - elapsedMin!} min (conta gratuita)`
                    : `Em andamento · ${elapsedMin} min`}
                </p>
              </div>
              {/* Barra de progresso */}
              <div className="w-12 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (elapsedMin! / 60) * 100)}%`,
                    background: overLimit ? RED : approachingLim ? YELL : CYAN,
                  }} />
              </div>
            </div>
          )}

          {/* Alerta + Gerar nova sala — apenas gestor */}
          {isGestor && (approachingLim || overLimit) && (
            <div className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p style={{ fontSize: '0.68rem', color: RED, fontWeight: 700 }}>
                <AlertTriangle size={11} className="inline mr-1" />
                Conta gratuita: limite de 60 min para grupos
              </p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                Crie uma nova sala Meet e compartilhe o link com os participantes para continuar a reunião.
              </p>
              <a href="https://meet.new" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold self-start"
                style={{ background: `${RED}18`, border: `1px solid ${RED}33`, color: RED }}>
                <Video size={12} />Abrir nova sala Meet
                <ExternalLink size={10} className="ml-1 opacity-60" />
              </a>
            </div>
          )}

          {/* Meet link */}
          {m.meet_link ? (
            <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: `${GREEN}15`, border: `1px solid ${GREEN}33`, color: GREEN }}>
              <Video size={13} />Entrar no Google Meet
              <ExternalLink size={10} className="ml-auto opacity-60" />
            </a>
          ) : m.status === 'scheduled' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Link2 size={12} style={{ color: YELL }} />
              <span style={{ fontSize: '0.65rem', color: YELL }}>
                Link Meet ainda não gerado {isGestor ? '— conecte o Google Calendar em Configurações' : ''}
              </span>
            </div>
          )}

          {/* RSVP morador */}
          {!isGestor && m.status === 'scheduled' && isFut && onRsvp && (
            <div className="flex gap-2">
              {(['confirmed','declined'] as const).map(resp => (
                <button key={resp} onClick={() => onRsvp(resp)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: myRsvp?.response === resp
                      ? `${resp === 'confirmed' ? GREEN : RED}22`
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${myRsvp?.response === resp
                      ? `${resp === 'confirmed' ? GREEN : RED}44`
                      : 'rgba(255,255,255,0.08)'}`,
                    color: myRsvp?.response === resp
                      ? resp === 'confirmed' ? GREEN : RED
                      : 'rgba(255,255,255,0.5)',
                  }}>
                  {resp === 'confirmed' ? <><CheckCircle2 size={12} />Confirmar</> : <><XCircle size={12} />Recusar</>}
                </button>
              ))}
            </div>
          )}

          {/* Gestor: edição inline */}
          {isGestor && m.status !== 'cancelled' && (
            editMode ? (
              <div className="flex flex-col gap-3 rounded-2xl p-3"
                style={{ background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.18)' }}>
                <p style={{ fontSize: '0.6rem', color: CYAN, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Editar reunião
                </p>

                {/* Data e hora */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>Data</label>
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                      className="px-2 py-1.5 rounded-xl text-xs text-white/80 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>Hora</label>
                    <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                      className="px-2 py-1.5 rounded-xl text-xs text-white/80 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                </div>

                {/* Descrição / Observação */}
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>Observação</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                    placeholder="Contexto ou observações..."
                    className="px-2 py-1.5 rounded-xl text-xs text-white/80 outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>

                {/* Itens de pauta */}
                {editItems.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase' }}>Pauta</label>
                    {editItems.map((item, i) => (
                      <div key={item.id} className="rounded-xl p-2.5 flex flex-col gap-2"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', minWidth: 14 }}>{i + 1}.</span>
                          <input
                            value={item.title}
                            onChange={e => setEditItems(its => its.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                            className="flex-1 bg-transparent outline-none text-xs text-white/80"
                          />
                        </div>
                        {/* Status */}
                        <div className="flex gap-1.5 flex-wrap">
                          {ITEM_STATUS_OPTS.map(opt => (
                            <button key={opt.value}
                              onClick={() => setEditItems(its => its.map((x, j) => j === i ? { ...x, status: opt.value } : x))}
                              className="px-2 py-0.5 rounded-lg text-[0.58rem] font-bold transition-all"
                              style={{
                                background: item.status === opt.value ? `${opt.color}22` : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${item.status === opt.value ? `${opt.color}55` : 'rgba(255,255,255,0.06)'}`,
                                color: item.status === opt.value ? opt.color : 'rgba(255,255,255,0.3)',
                              }}>{opt.label}</button>
                          ))}
                        </div>
                        {/* Notas */}
                        <input
                          value={item.notes ?? ''}
                          onChange={e => setEditItems(its => its.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                          placeholder="Notas / decisão..."
                          className="bg-transparent outline-none text-[0.68rem] text-white/60 placeholder:text-white/20"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  <button onClick={handleSalvarEdicao} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: `${GREEN}20`, border: `1px solid ${GREEN}44`, color: GREEN }}>
                    {saving ? <><Loader2 size={11} className="animate-spin" />Salvando...</> : <><Save size={11} />Salvar alterações</>}
                  </button>
                  <button onClick={() => setEditMode(false)} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                    <X size={11} />Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold self-start"
                style={{ background: 'rgba(87,216,255,0.08)', border: '1px solid rgba(87,216,255,0.2)', color: CYAN }}>
                <Pencil size={11} />Editar reunião
              </button>
            )
          )}

          {/* Gestor: cancelar */}
          {isGestor && m.status === 'scheduled' && onCancel && !editMode && (
            <button onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold self-start"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: RED }}>
              <XCircle size={12} />Cancelar reunião
            </button>
          )}

          {/* Gestor: gerar/editar/salvar ata (só para reuniões encerradas) */}
          {isGestor && m.status === 'done' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleGerarAta}
                  disabled={gerandoAta || ataSalvando}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold self-start transition-all"
                  style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: PURP }}>
                  {gerandoAta
                    ? <><Loader2 size={12} className="animate-spin" />Gerando ata...</>
                    : <><FileText size={12} />{ataTexto ? 'Regerar com IA' : 'Gerar ata com IA'}</>}
                </button>
                {ataTexto && !ataEditando && (
                  <button
                    onClick={() => setAtaEditando(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(87,216,255,0.10)', border: '1px solid rgba(87,216,255,0.25)', color: CYAN }}>
                    Editar
                  </button>
                )}
              </div>

              {ataTexto && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${ataEditando ? 'rgba(87,216,255,0.3)' : 'rgba(168,85,247,0.2)'}` }}>
                  <div className="flex items-center justify-between px-3 py-2"
                    style={{ background: ataEditando ? 'rgba(87,216,255,0.06)' : 'rgba(168,85,247,0.08)' }}>
                    <span className="text-[0.65rem] font-bold" style={{ color: ataEditando ? CYAN : PURP }}>
                      {ataEditando ? 'Editando ata — confirme para salvar' : m.ata_texto ? 'Ata salva' : 'Ata gerada (não salva)'}
                    </span>
                    {!ataEditando && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { navigator.clipboard.writeText(ataTexto); toast.success('Ata copiada!'); }}
                          className="text-[0.6rem] px-2 py-1 rounded-lg font-bold"
                          style={{ background: 'rgba(168,85,247,0.15)', color: PURP }}>
                          Copiar
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([ataTexto], { type: 'text/plain' });
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = `ata-${m.title.replace(/\s+/g, '-').toLowerCase()}.md`;
                            a.click();
                          }}
                          className="text-[0.6rem] px-2 py-1 rounded-lg font-bold"
                          style={{ background: 'rgba(168,85,247,0.15)', color: PURP }}>
                          Baixar .md
                        </button>
                      </div>
                    )}
                  </div>

                  {ataEditando ? (
                    <>
                      <textarea
                        value={ataTexto}
                        onChange={e => setAtaTexto(e.target.value)}
                        rows={14}
                        className="w-full bg-transparent outline-none resize-none p-3"
                        style={{ fontSize: '0.65rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.25)' }}
                      />
                      <div className="flex gap-2 px-3 pb-3">
                        <button
                          onClick={handleSalvarAta}
                          disabled={ataSalvando}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{ background: `${GREEN}20`, border: `1px solid ${GREEN}44`, color: GREEN }}>
                          {ataSalvando ? <><Loader2 size={11} className="animate-spin" />Salvando...</> : <><CheckCircle2 size={11} />Confirmar e salvar</>}
                        </button>
                        <button
                          onClick={() => { setAtaTexto(m.ata_texto ?? ataTexto); setAtaEditando(false); }}
                          disabled={ataSalvando}
                          className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <pre className="p-3 text-[0.65rem] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap"
                      style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.2)' }}>
                      {ataTexto}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RSVP list (gestor) */}
          {isGestor && rsvps.length > 0 && (
            <div className="flex flex-col gap-1">
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Confirmações
              </p>
              {rsvps.slice(0, 8).map(r => {
                const rf = r.profiles;
                const rc = r.response === 'confirmed' ? GREEN : r.response === 'declined' ? RED : YELL;
                return (
                  <div key={r.id} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: rc }} />
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', flex: 1 }}>
                      {rf?.full_name ?? 'Morador'} {rf?.unit_number ? `· Ch. ${rf.unit_number}` : ''}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: rc, fontWeight: 700, textTransform: 'capitalize' }}>
                      {r.response}
                    </span>
                  </div>
                );
              })}
              {rsvps.length > 8 && (
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
                  +{rsvps.length - 8} mais
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   GESTOR — 3 slides: Lista · Criar · Configurar Google
═══════════════════════════════════════════════════════════════ */
const ReunioeGestor = () => {
  const { user } = useAuth();
  const [meetings,   setMeetings]   = useState<Meeting[]>([]);
  const [rsvpMap,    setRsvpMap]    = useState<Record<string, Rsvp[]>>({});
  const [agendaMap,  setAgendaMap]  = useState<Record<string, AgendaItem[]>>({});
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Criar reunião
  const [title, setTitle]         = useState('');
  const [desc, setDesc]           = useState('');
  const [date, setDate]           = useState('');
  const [time, setTime]           = useState('19:00');
  const [duration, setDuration]   = useState(60);
  const [pautaItems, setPautaItems] = useState<string[]>(['']);

  // Google connection status
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ms } = await db.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(30);
      setMeetings((ms ?? []) as Meeting[]);

      // Carrega RSVPs e agenda items de todas as reuniões em paralelo
      const [{ data: rs }, { data: ai }] = await Promise.all([
        db.from('meeting_rsvp').select('*, profiles!user_id(full_name, unit_number)'),
        db.from('agenda_items').select('*').order('position'),
      ]);
      const map: Record<string, Rsvp[]> = {};
      for (const r of (rs ?? []) as Rsvp[]) {
        if (!map[r.meeting_id]) map[r.meeting_id] = [];
        map[r.meeting_id].push(r);
      }
      setRsvpMap(map);
      const amap: Record<string, AgendaItem[]> = {};
      for (const a of (ai ?? []) as AgendaItem[]) {
        if (!amap[a.meeting_id]) amap[a.meeting_id] = [];
        amap[a.meeting_id].push(a);
      }
      setAgendaMap(amap);

      // Verifica se Google está conectado
      const { count } = await db.from('google_tokens').select('*', { count: 'exact', head: true }).eq('account', 'itauna');
      setGoogleConnected((count ?? 0) > 0);
    } catch { toast.error('Erro ao carregar reuniões.'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => {
    load();

    // Checa se voltou do Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      toast.success('Google Calendar conectado com sucesso!');
      window.history.replaceState({}, '', window.location.pathname);
      load();
    }
    if (params.get('google_error')) {
      toast.error(`Erro ao conectar Google: ${params.get('google_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [load]);

  const handleConnectGoogle = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-auth-init');
      if (error) throw error;
      window.open(data.authUrl, '_blank');
    } catch { toast.error('Erro ao iniciar conexão com Google.'); }
  };

  const handleCriar = async () => {
    if (!title || !date) return toast.error('Preencha título e data.');
    setSubmitting(true);
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const agenda_items  = pautaItems.filter(p => p.trim());
      const { error } = await supabase.functions.invoke('criar-reuniao', {
        body: { title, description: desc, scheduled_at, duration_min: duration, agenda_items },
      });
      if (error) throw error;
      toast.success('Reunião agendada! Notificações enviadas aos moradores.');
      setTitle(''); setDesc(''); setDate(''); setTime('19:00'); setDuration(60); setPautaItems(['']);
      await load();
    } catch (err) { toast.error('Erro ao criar reunião: ' + String(err)); }
    finally       { setSubmitting(false); }
  };

  const handleCancel = async (id: string) => {
    await db.from('meetings').update({ status: 'cancelled' }).eq('id', id);
    setMeetings(ms => ms.map(m => m.id === id ? { ...m, status: 'cancelled' } : m));
    toast('Reunião cancelada.', { icon: '🚫' });
  };

  /* Slide: Lista */
  const slideListagem = (
    <div className="flex flex-col gap-3 pb-8">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white/60">
          {meetings.length} reunião(ões)
        </span>
        <button onClick={load} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <RefreshCw size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: CYAN }} />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-2">
          <Video size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
            Nenhuma reunião ainda. Use "Criar" para agendar.
          </p>
        </div>
      ) : meetings.map(m => (
        <MeetingCard key={m.id} m={m} rsvps={rsvpMap[m.id] ?? []} agendaItems={agendaMap[m.id] ?? []}
          expanded={expanded === m.id}
          onToggle={() => setExpanded(e => e === m.id ? null : m.id)}
          isGestor
          onCancel={() => handleCancel(m.id)}
          onUpdate={load}
        />
      ))}
    </div>
  );

  /* Slide: Criar reunião */
  const slideCriar = (
    <div className="flex flex-col gap-4 pb-8">
      {!googleConnected && (
        <div className="rounded-2xl p-3 flex items-start gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={14} style={{ color: YELL, flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1">
            <p style={{ fontSize: '0.7rem', color: YELL, fontWeight: 700 }}>Google Calendar não conectado</p>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
              A reunião será criada sem link Meet. Conecte para gerar o link automaticamente.
            </p>
            <button onClick={handleConnectGoogle}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: `${YELL}18`, border: `1px solid ${YELL}33`, color: YELL }}>
              <Link2 size={11} />Conectar Google Calendar
            </button>
          </div>
        </div>
      )}

      {/* Formulário */}
      {[
        { label: 'Título da reunião *', comp: (
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assembleia Ordinária Jun/2026"
            className="w-full bg-transparent outline-none text-sm text-white/80 placeholder:text-white/20" />
        )},
        { label: 'Descrição / Contexto', comp: (
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Contexto geral da reunião..."
            className="w-full bg-transparent outline-none text-xs text-white/80 placeholder:text-white/20 resize-none" />
        )},
      ].map(({ label, comp }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
          <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {comp}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm text-white/80 outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hora</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm text-white/80 outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Duração (minutos)
        </label>
        <div className="flex gap-2">
          {[60, 90, 120].map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: duration === d ? `${CYAN}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${duration === d ? `${CYAN}44` : 'rgba(255,255,255,0.08)'}`,
                color: duration === d ? CYAN : 'rgba(255,255,255,0.5)',
              }}>{d}min</button>
          ))}
        </div>
        {duration >= 60 && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl mt-1"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertTriangle size={12} style={{ color: YELL, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.63rem', color: YELL, lineHeight: 1.4 }}>
              Conta Google gratuita: reuniões em grupo são limitadas a 60 min.
              Para sessões mais longas, planeje uma pausa e gere um novo link Meet ao retomar.
            </p>
          </div>
        )}
      </div>

      {/* Itens de pauta */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Itens de Pauta
          </label>
          <button onClick={() => setPautaItems(p => [...p, ''])}
            className="flex items-center gap-1 text-[0.6rem] font-bold"
            style={{ color: CYAN }}>
            <Plus size={10} />Adicionar
          </button>
        </div>
        {pautaItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', minWidth: 16 }}>{i + 1}.</span>
            <div className="flex-1 px-3 py-2 rounded-xl flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <input value={item} onChange={e => setPautaItems(p => p.map((x, j) => j === i ? e.target.value : x))}
                placeholder={`Item de pauta ${i + 1}`}
                className="flex-1 bg-transparent outline-none text-xs text-white/80 placeholder:text-white/20" />
            </div>
            {pautaItems.length > 1 && (
              <button onClick={() => setPautaItems(p => p.filter((_, j) => j !== i))}>
                <Trash2 size={12} style={{ color: 'rgba(239,68,68,0.6)' }} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleCriar} disabled={submitting || !title || !date}
        className="w-full py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${CYAN}cc, ${PURP}cc)`, color: '#0d1423' }}>
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {submitting ? 'Criando...' : 'Criar reunião e notificar moradores'}
      </button>
    </div>
  );

  /* Slide: Configurações Google */
  const slideConfig = (
    <div className="flex flex-col gap-4 pb-8">
      <div className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${googleConnected ? GREEN : YELL}18`, border: `1px solid ${googleConnected ? GREEN : YELL}33` }}>
            {googleConnected ? <CheckCircle2 size={18} style={{ color: GREEN }} /> : <AlertTriangle size={18} style={{ color: YELL }} />}
          </div>
          <div>
            <p className="text-sm font-bold text-white/80">Google Calendar</p>
            <p style={{ fontSize: '0.65rem', color: googleConnected ? GREEN : YELL }}>
              {googleConnected ? 'Conectado — links Meet gerados automaticamente' : 'Não conectado'}
            </p>
          </div>
        </div>
        <button onClick={handleConnectGoogle}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: `${CYAN}18`, border: `1px solid ${CYAN}33`, color: CYAN }}>
          <Link2 size={13} />
          {googleConnected ? 'Reconectar conta Google' : 'Conectar Google Calendar'}
        </button>
      </div>

      {/* Instruções setup */}
      <div className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: '0.65rem', color: CYAN, fontWeight: 700 }}>Configuração inicial (uma vez)</p>
        {[
          'Acesse console.cloud.google.com → Criar projeto "Itauna Meetings"',
          'Ativar API: Google Calendar API',
          'Criar credencial OAuth 2.0 (Web Application)',
          'Redirect URI: dokenybeazecjsszrbeo.supabase.co/functions/v1/google-auth-callback',
          'Supabase Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY (32 bytes hex)',
          'Clicar em "Conectar" acima logado com itauna.org@gmail.com',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${CYAN}18`, fontSize: '0.55rem', color: CYAN, fontWeight: 900 }}>
              {i + 1}
            </span>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{step}</p>
          </div>
        ))}
      </div>

      {/* Lembretes schedule info */}
      <div className="rounded-2xl p-4"
        style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
        <p style={{ fontSize: '0.65rem', color: PURP, fontWeight: 700 }}>Lembretes automáticos</p>
        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>
          D-7, D-1 e D-0 (2h antes) — push notification para todos os moradores.
          Ative o agendamento em: Supabase Dashboard → Edge Functions → reunioes-lembretes → Schedule: <span style={{ fontFamily: 'monospace' }}>0 * * * *</span>
        </p>
      </div>
    </div>
  );

  const slides: SlideItem[] = [
    {
      key: 'r-lista', label: 'Reuniões',
      content: (
        <SlidePanel eyebrow="Assembleias · Condominiais" title="Reuniões" subtitle="Histórico e próximas assembleias do condomínio." actions={
          <button onClick={load} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(87,216,255,0.08)', border: '1px solid rgba(87,216,255,0.2)', color: CYAN, cursor: 'pointer' }}>
            <RefreshCw size={13} />
          </button>
        }>{slideListagem}</SlidePanel>
      ),
    },
    {
      key: 'r-criar', label: 'Criar',
      content: <SlidePanel eyebrow="Nova Assembleia" title="Criar Reunião" subtitle="Agende uma assembleia e gere link Google Meet automaticamente.">{slideCriar}</SlidePanel>,
    },
    {
      key: 'r-config', label: 'Google',
      content: <SlidePanel eyebrow="Integração · Google" title="Google Calendar" subtitle="Configure a integração para gerar links Meet e lembretes automáticos.">{slideConfig}</SlidePanel>,
    },
  ];

  return <PageCarousel3D slides={slides} />;
};

/* ═══════════════════════════════════════════════════════════════
   MORADOR — 2 slides: Próximas · Histórico
═══════════════════════════════════════════════════════════════ */
const ReunioesMorador = () => {
  const { user } = useAuth();
  const [meetings,  setMeetings]  = useState<Meeting[]>([]);
  const [rsvpMap,   setRsvpMap]   = useState<Record<string, Rsvp[]>>({});
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ms } = await db.from('meetings').select('*').neq('status','cancelled').order('scheduled_at', { ascending: false }).limit(20);
      setMeetings((ms ?? []) as Meeting[]);
      const { data: rs } = await db.from('meeting_rsvp').select('*');
      const map: Record<string, Rsvp[]> = {};
      for (const r of (rs ?? []) as Rsvp[]) {
        if (!map[r.meeting_id]) map[r.meeting_id] = [];
        map[r.meeting_id].push(r);
      }
      setRsvpMap(map);
    } catch { toast.error('Erro ao carregar reuniões.'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRsvp = async (meetingId: string, response: 'confirmed' | 'declined') => {
    if (!user) return;
    await db.from('meeting_rsvp').upsert({
      meeting_id: meetingId, user_id: user.id,
      unit_number: user.unit_number ?? null,
      response, responded_at: new Date().toISOString(),
    }, { onConflict: 'meeting_id,user_id' });
    setRsvpMap(m => ({
      ...m,
      [meetingId]: [
        ...(m[meetingId] ?? []).filter(r => r.user_id !== user.id),
        { id: 'tmp', meeting_id: meetingId, user_id: user.id, unit_number: user.unit_number ?? null, response, responded_at: new Date().toISOString() },
      ],
    }));
    toast.success(response === 'confirmed' ? 'Presença confirmada!' : 'Ausência registrada.');
  };

  const upcoming = meetings.filter(m => isFuture(new Date(m.scheduled_at)) && m.status === 'scheduled');
  const past     = meetings.filter(m => !isFuture(new Date(m.scheduled_at)) || m.status !== 'scheduled');

  const renderList = (list: Meeting[], emptyMsg: string) => loading ? (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin" style={{ color: CYAN }} />
    </div>
  ) : list.length === 0 ? (
    <div className="flex flex-col items-center py-12 gap-2">
      <Calendar size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{emptyMsg}</p>
    </div>
  ) : list.map(m => (
    <MeetingCard key={m.id} m={m} rsvps={rsvpMap[m.id] ?? []}
      expanded={expanded === m.id}
      onToggle={() => setExpanded(e => e === m.id ? null : m.id)}
      onRsvp={resp => handleRsvp(m.id, resp)}
    />
  ));

  const slides: SlideItem[] = [
    {
      key: 'rm-proximas', label: 'Próximas',
      content: (
        <SlidePanel eyebrow="Assembleias · Condominiais" title="Próximas Reuniões" subtitle="Confirme sua presença e acompanhe a pauta das assembleias.">
          <div className="flex flex-col gap-3 pb-8">{renderList(upcoming, 'Nenhuma reunião agendada no momento.')}</div>
        </SlidePanel>
      ),
    },
    {
      key: 'rm-historico', label: 'Histórico',
      content: (
        <SlidePanel eyebrow="Assembleias · Histórico" title="Reuniões Passadas" subtitle="Registro de todas as assembleias realizadas.">
          <div className="flex flex-col gap-3 pb-8">{renderList(past, 'Nenhuma reunião passada.')}</div>
        </SlidePanel>
      ),
    },
  ];

  return <PageCarousel3D slides={slides} />;
};

/* ═══════════════════════════════════════════════════════════════
   Export principal
═══════════════════════════════════════════════════════════════ */
export const Reunioes = () => {
  const { isGestor } = useAuth();
  return (
    <div className="w-full h-full">
      {isGestor ? <ReunioeGestor /> : <ReunioesMorador />}
    </div>
  );
};
