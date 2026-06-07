import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isPast, isFuture, addMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Video, Calendar, Users, CheckCircle2, XCircle, Clock, Plus, Trash2,
  ExternalLink, Loader2, AlertTriangle, Link2, Settings, ChevronDown, ChevronUp,
  RefreshCw, Bell, FileText, Send,
} from 'lucide-react';
import { supabase, db } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
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

/* ─── MeetingCard (compartilhado) ────────────────────────────── */
const MeetingCard = ({
  m, rsvps, expanded, onToggle, onRsvp, isGestor, onCancel,
}: {
  m: Meeting; rsvps: Rsvp[]; expanded: boolean;
  onToggle: () => void;
  onRsvp?: (resp: 'confirmed' | 'declined') => void;
  isGestor?: boolean;
  onCancel?: () => void;
}) => {
  const { user } = useAuth();
  const myRsvp   = rsvps.find(r => r.user_id === user?.id);
  const confirmed = rsvps.filter(r => r.response === 'confirmed').length;
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

          {/* Gestor: cancelar */}
          {isGestor && m.status === 'scheduled' && onCancel && (
            <button onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold self-start"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: RED }}>
              <XCircle size={12} />Cancelar reunião
            </button>
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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rsvpMap,  setRsvpMap]  = useState<Record<string, Rsvp[]>>({});
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

      // Carrega RSVPs de todas as reuniões
      const { data: rs } = await db.from('meeting_rsvp').select('*, profiles!user_id(full_name, unit_number)');
      const map: Record<string, Rsvp[]> = {};
      for (const r of (rs ?? []) as Rsvp[]) {
        if (!map[r.meeting_id]) map[r.meeting_id] = [];
        map[r.meeting_id].push(r);
      }
      setRsvpMap(map);

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
        <MeetingCard key={m.id} m={m} rsvps={rsvpMap[m.id] ?? []}
          expanded={expanded === m.id}
          onToggle={() => setExpanded(e => e === m.id ? null : m.id)}
          isGestor
          onCancel={() => handleCancel(m.id)}
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
    { key: 'r-lista',  label: 'Reuniões', content: slideListagem },
    { key: 'r-criar',  label: 'Criar',    content: slideCriar    },
    { key: 'r-config', label: 'Google',   content: slideConfig   },
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
      content: <div className="flex flex-col gap-3 pb-8">{renderList(upcoming, 'Nenhuma reunião agendada no momento.')}</div>,
    },
    {
      key: 'rm-historico', label: 'Histórico',
      content: <div className="flex flex-col gap-3 pb-8">{renderList(past, 'Nenhuma reunião passada.')}</div>,
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
