import { useState, useEffect, useMemo } from 'react';
import {
  Bell, Plus, Pin, AlertTriangle, Info, ChevronRight,
  Search, CheckCircle, Loader2, Megaphone, Calendar, User,
  BookOpen, Car, Waves, Trash2, Volume2, TreePine, Edit2, Save, X,
} from 'lucide-react';
import { formatDate, gotoSlide } from '../../utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, type DbAnnouncement } from '@/lib/supabase-queries';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';
const PURPLE = '#8b5cf6';

const PRIORITY_CONFIG = {
  urgente: {
    label: 'Urgente', color: RED, bg: 'rgba(239,68,68,0.09)', border: 'rgba(239,68,68,0.28)',
    icon: AlertTriangle, badgeCls: 'badge-red',
    highlight: 'linear-gradient(135deg, rgba(239,68,68,0.13), rgba(239,68,68,0.04))',
  },
  importante: {
    label: 'Importante', color: YELLOW, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)',
    icon: Bell, badgeCls: 'badge-yellow',
    highlight: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03))',
  },
  normal: {
    label: 'Informativo', color: CYAN, bg: 'rgba(87,216,255,0.05)', border: 'rgba(87,216,255,0.14)',
    icon: Info, badgeCls: 'badge-teal',
    highlight: 'linear-gradient(135deg, rgba(87,216,255,0.06), rgba(87,216,255,0.02))',
  },
};

const CATEGORIES_FIXED = ['Informativo', 'Reunião', 'Manutenção', 'Serviços', 'Regulamento', 'Segurança'];

/* ── Card de comunicado — fora do componente para evitar re-mounts ── */
const AnnCard = ({
  a, selected, onSelect, isGestor, onEdit, onDelete,
}: {
  a: DbAnnouncement;
  selected: DbAnnouncement | null;
  onSelect: (a: DbAnnouncement | null) => void;
  isGestor: boolean;
  onEdit: (a: DbAnnouncement) => void;
  onDelete: (id: string, title: string) => void;
}) => {
  const cfg = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal;
  const isSelected = selected?.id === a.id;
  const isUrgent   = a.priority === 'urgente';

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-2xl border transition-all group"
      style={{
        background:  isSelected ? 'rgba(87,216,255,0.09)' : cfg.highlight,
        borderColor: isSelected ? 'rgba(87,216,255,0.35)' : cfg.border,
        boxShadow:   isUrgent && !isSelected ? `0 0 16px ${RED}14` : 'none',
        cursor: isGestor ? 'pointer' : 'default',
      }}
      onClick={() => !isGestor && onSelect(isSelected ? null : a)}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <cfg.icon size={14} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-white text-[12px] leading-tight">{a.title}</h4>
          {a.is_pinned && <Pin size={10} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }} />}
        </div>
        <p className="text-[10px] text-white/45 leading-relaxed line-clamp-2 mb-1.5">{a.content}</p>
        <div className="flex items-center gap-2 text-[9px]">
          <span className="font-bold px-1.5 py-0.5 rounded-md" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{a.category}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{formatDate(a.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isGestor && (
          <>
            <button onClick={() => onEdit(a)} className="p-1 rounded hover:bg-white/10 transition" title="Editar">
              <Edit2 size={11} style={{ color: CYAN }} />
            </button>
            <button onClick={() => onDelete(a.id, a.title)} className="p-1 rounded hover:bg-red-500/20 transition" title="Deletar">
              <Trash2 size={11} style={{ color: RED }} />
            </button>
          </>
        )}
        {!isGestor && <ChevronRight size={12} style={{ color: isSelected ? CYAN : 'rgba(255,255,255,0.2)' }} onClick={() => onSelect(isSelected ? null : a)} />}
      </div>
    </div>
  );
};

export const Comunicados = () => {
  const { isGestor, user } = useAuth();
  const [announcements, setAnnouncements]   = useState<DbAnnouncement[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [selected, setSelected]             = useState<DbAnnouncement | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  const [editingId, setEditingId]       = useState<string | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [deleteName, setDeleteName]     = useState('');
  const [savingEdit, setSavingEdit]     = useState(false);

  const [formTitle, setFormTitle]       = useState('');
  const [formCategory, setFormCategory] = useState('Informativo');
  const [formPriority, setFormPriority] = useState<DbAnnouncement['priority']>('normal');
  const [formPinned, setFormPinned]     = useState(false);
  const [formContent, setFormContent]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const clearForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormCategory('Informativo');
    setFormPriority('normal');
    setFormPinned(false);
    setEditingId(null);
  };

  useEffect(() => {
    fetchAnnouncements(60)
      .then(setAnnouncements)
      .catch(() => toast.error('Erro ao carregar comunicados.'))
      .finally(() => setLoading(false));
  }, []);

  const allCategories = useMemo(
    () => ['Todos', ...Array.from(new Set(announcements.map(a => a.category)))],
    [announcements]
  );

  const filtered = useMemo(() => announcements.filter(a => {
    if (categoryFilter !== 'Todos' && a.category !== categoryFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
        !a.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [announcements, categoryFilter, search]);

  const pinned  = useMemo(() => filtered.filter(a =>  a.is_pinned), [filtered]);
  const others  = useMemo(() => filtered.filter(a => !a.is_pinned), [filtered]);
  const urgentes = useMemo(() => announcements.filter(a => a.priority === 'urgente').length, [announcements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) { toast.error('Preencha todos os campos.'); return; }
    setSubmitting(true);
    try {
      const novo = await createAnnouncement({
        title: formTitle.trim(), content: formContent.trim(),
        category: formCategory, priority: formPriority,
        is_pinned: formPinned, created_by: user!.id,
      });
      setAnnouncements(prev => novo.is_pinned ? [novo, ...prev] : [...prev, novo]);
      clearForm();
      toast.success('Comunicado publicado com sucesso!');
      gotoSlide(0);
    } catch { toast.error('Erro ao publicar comunicado.'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (a: DbAnnouncement) => {
    setEditingId(a.id);
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormCategory(a.category);
    setFormPriority(a.priority);
    setFormPinned(a.is_pinned);
    gotoSlide(1);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formTitle.trim() || !formContent.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updateAnnouncement(editingId, {
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        is_pinned: formPinned,
      });
      setAnnouncements(prev => prev.map(a => a.id === editingId ? updated : a));
      clearForm();
      toast.success('Comunicado atualizado com sucesso!');
      gotoSlide(0);
    } catch { toast.error('Erro ao atualizar comunicado.'); }
    finally { setSavingEdit(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAnnouncement(deleteId);
      setAnnouncements(prev => prev.filter(a => a.id !== deleteId));
      setDeleteId(null);
      setDeleteName('');
      toast.success('Comunicado removido com sucesso!');
    } catch { toast.error('Erro ao remover comunicado.'); }
  };


  /* ── Slide 1: Mural ─────────────────────────────────────────── */
  const slideMural: SlideItem = {
    key: 'comunicados-mural',
    label: 'Mural',
    content: (
      <SlidePanel
        eyebrow="Mural Oficial do Condomínio"
        title={<>Comunicados & <span className="grad-text">Avisos</span></>}
        badges={[
          { icon: '📣', label: 'Avisos da Gestão' },
          { icon: '📌', label: 'Fixados no Topo' },
          { icon: urgentes > 0 ? '🚨' : '✅', label: urgentes > 0 ? `${urgentes} urgentes` : 'Tudo em ordem' },
        ]}
        actions={
          isGestor ? (
            <button
              onClick={() => { gotoSlide(1); }}
              className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
            >
              <Plus size={13} /> Publicar
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-col h-full gap-2.5">

          {/* Busca + filtro */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text" className="input pl-8 py-1.5 text-xs"
                placeholder="Buscar por título ou conteúdo..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 w-fit self-end overflow-x-auto">
              {allCategories.map(c => (
                <button
                  key={c} onClick={() => setCategoryFilter(c)}
                  className={`px-2.5 py-1 rounded text-[10px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                    categoryFilter === c ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Layout lista + detalhe */}
          <div className={`flex-1 grid gap-2.5 min-h-[160px] overflow-hidden ${selected ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>

            {/* Lista */}
            <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${selected ? 'lg:col-span-3' : ''}`}>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs">
                  <Loader2 size={16} className="animate-spin" /> Carregando...
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <p className="text-center text-white/30 text-xs py-10">Nenhum comunicado encontrado.</p>
              )}

              {/* Fixados */}
              {pinned.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/35 uppercase tracking-widest pl-1">
                    <Pin size={9} /> Fixados
                  </div>
                  {pinned.map(a => (
                    <AnnCard
                      key={a.id}
                      a={a}
                      selected={selected}
                      onSelect={setSelected}
                      isGestor={isGestor}
                      onEdit={handleEdit}
                      onDelete={(id, title) => { setDeleteId(id); setDeleteName(title); }}
                    />
                  ))}
                </div>
              )}

              {/* Recentes */}
              {others.length > 0 && (
                <div className="space-y-1.5 mt-1.5">
                  {pinned.length > 0 && (
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest pl-1">Recentes</div>
                  )}
                  {others.map(a => (
                    <AnnCard
                      key={a.id}
                      a={a}
                      selected={selected}
                      onSelect={setSelected}
                      isGestor={isGestor}
                      onEdit={handleEdit}
                      onDelete={(id, title) => { setDeleteId(id); setDeleteName(title); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Painel de detalhe */}
            {selected && (() => {
              const cfg = PRIORITY_CONFIG[selected.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal;
              return (
                <div className="lg:col-span-2 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto"
                  style={{ background: 'linear-gradient(135deg, rgba(13,20,35,0.96), rgba(8,13,24,0.98))', border: `1px solid ${cfg.border}` }}>

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>{selected.category}</span>
                        {selected.is_pinned && <Pin size={9} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                      </div>
                      <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', lineHeight: 1.3 }}>{selected.title}</h4>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }} className="hover:text-white/60 cursor-pointer mt-0.5">✕</button>
                  </div>

                  {/* Conteúdo completo */}
                  <div className="rounded-xl p-3 flex-1" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{selected.content}</p>
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                      <User size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{selected.profiles?.full_name ?? 'Administração'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{formatDate(selected.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </SlidePanel>
    ),
  };

  /* ── Slide 2: Publicar/Editar (gestor) ─────────────────────────── */
  const slidePublicar: SlideItem = {
    key: 'comunicados-publicar',
    label: editingId ? 'Editar' : 'Publicar',
    content: (
      <SlidePanel
        eyebrow={editingId ? 'Edição de Comunicado' : 'Nova Publicação Oficial'}
        title={<>{editingId ? 'Editar' : 'Publicar'} <span className="grad-text">Comunicado</span></>}
        badges={[
          { icon: editingId ? '✏️' : '📣', label: editingId ? 'Modo Edição' : 'Envio Imediato' },
          { icon: '🔒', label: 'Painel Seguro' },
          { icon: '⌘', label: 'Notificação Push' },
        ]}
      >
        <form onSubmit={editingId ? handleSaveEdit : handleCreate} className="flex flex-col gap-3 py-1 text-xs">

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="input-label text-[11px]">Título do Comunicado *</label>
              <input
                type="text" className="input"
                placeholder="Ex: Manutenção da bomba d'água — Dias 05 e 06/06"
                value={formTitle} onChange={e => setFormTitle(e.target.value)} required
              />
            </div>

            <div>
              <label className="input-label text-[11px]">Categoria</label>
              <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                {CATEGORIES_FIXED.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2.5 pt-4 pl-1">
              <input
                type="checkbox" id="pinned" className="w-4 h-4 rounded accent-cyan cursor-pointer"
                checked={formPinned} onChange={e => setFormPinned(e.target.checked)}
              />
              <label htmlFor="pinned" className="text-[11px] font-bold text-white/70 cursor-pointer select-none flex items-center gap-1.5">
                <Pin size={11} style={{ color: CYAN }} /> Fixar no topo
              </label>
            </div>
          </div>

          {/* Seletor visual de prioridade */}
          <div>
            <label className="input-label text-[11px]">Prioridade</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(Object.entries(PRIORITY_CONFIG) as [DbAnnouncement['priority'], typeof PRIORITY_CONFIG['normal']][]).map(([key, cfg]) => (
                <button
                  key={key} type="button"
                  onClick={() => setFormPriority(key)}
                  className="py-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer"
                  style={{
                    background: formPriority === key ? cfg.bg : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${formPriority === key ? cfg.color : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: formPriority === key ? `0 0 16px ${cfg.color}28` : 'none',
                  }}
                >
                  <cfg.icon size={14} style={{ color: formPriority === key ? cfg.color : 'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: formPriority === key ? cfg.color : 'rgba(255,255,255,0.4)' }}>
                    {cfg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label text-[11px]">Conteúdo do Comunicado *</label>
            <textarea
              className="input resize-none"
              style={{ height: 80 }}
              placeholder="Escreva a mensagem oficial que será publicada para todos os moradores..."
              value={formContent} onChange={e => setFormContent(e.target.value)} required
            />
          </div>

          {/* Preview de alcance */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl"
            style={{ background: formPriority === 'urgente' ? 'rgba(239,68,68,0.06)' : 'rgba(87,216,255,0.05)', border: `1px solid ${formPriority === 'urgente' ? 'rgba(239,68,68,0.18)' : 'rgba(87,216,255,0.12)'}` }}>
            <Megaphone size={11} className="flex-shrink-0" style={{ color: formPriority === 'urgente' ? RED : CYAN }} />
            <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              Este comunicado será publicado imediatamente no mural e visível para todos os{' '}
              <strong style={{ color: 'rgba(255,255,255,0.65)' }}>360 condôminos</strong>.
              {formPinned && <> Será <strong style={{ color: CYAN }}>fixado no topo</strong> do mural.</>}
            </p>
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
            <button
              type="submit"
              className="flex-1 btn-primary justify-center py-2.5 text-xs font-bold gap-1.5"
              disabled={editingId ? savingEdit : submitting}
              style={formPriority === 'urgente' ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 24px rgba(239,68,68,0.35)' } : {}}
            >
              {(editingId ? savingEdit : submitting)
                ? <><Loader2 size={13} className="animate-spin" /> {editingId ? 'Salvando...' : 'Publicando...'}</>
                : <>{editingId ? <><Save size={13} /> Atualizar Comunicado</> : <><Megaphone size={13} /> Publicar Comunicado Oficial</>}</>
              }
            </button>
          </div>
        </form>
      </SlidePanel>
    ),
  };

  /* ── Slide 2: Manual de Convivência (morador) ───────────────── */
  const slideManual: SlideItem = {
    key: 'comunicados-manual',
    label: 'Manual',
    content: (
      <SlidePanel
        eyebrow="Manual de Convivência"
        title={<>Regras da <span className="grad-text">Comunidade</span></>}
        badges={[
          { icon: '🌿', label: 'Harmonia' },
          { icon: '🏊', label: 'Lazer' },
          { icon: '🔒', label: 'Silêncio 22h' },
        ]}
      >
        <div className="space-y-2.5 overflow-y-auto pr-0.5 h-full">
          {[
            {
              icon: Waves, color: CYAN, title: 'Área de Lazer',
              rules: ['Piscina: das 08h às 21h todos os dias', 'Trajes adequados e toucas obrigatórias', 'Proibido copos de vidro na área da piscina'],
            },
            {
              icon: Volume2, color: PURPLE, title: 'Silêncio e Convivência',
              rules: ['Silêncio absoluto das 22h às 08h', 'Velocidade máxima nas vias internas: 20 km/h', 'Proibido som automotivo alto dentro do condomínio'],
            },
            {
              icon: Trash2, color: GREEN, title: 'Limpeza e Coleta',
              rules: ['Lixo doméstico: lixeiras setoriais às seg. e sex.', 'Resíduos volumosos: agendar coleta especial', 'Proibido descartar entulho nas vias comuns'],
            },
            {
              icon: TreePine, color: YELLOW, title: 'Área Verde e Natureza',
              rules: ['Proibido cortar árvores sem autorização da gestão', 'Fogueiras apenas em áreas demarcadas', 'Respeite a fauna: não alimente animais silvestres'],
            },
          ].map(section => (
            <div key={section.title}
              className="rounded-2xl p-3.5 space-y-2"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${section.color}12`, border: `1px solid ${section.color}25` }}>
                  <section.icon size={14} style={{ color: section.color }} />
                </div>
                <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem' }}>{section.title}</h4>
              </div>
              <div className="space-y-1.5 pl-1">
                {section.rules.map(rule => (
                  <div key={rule} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5" style={{ background: section.color }} />
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl p-2.5 flex items-start gap-2"
            style={{ background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.10)' }}>
            <BookOpen size={11} className="flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              Regulamento completo disponível em <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Documentos → Regulamento Interno</strong>.
            </p>
          </div>
        </div>
      </SlidePanel>
    ),
  };

  /* ── Modal de Delete ─────────────────────────────────────────── */
  const deleteModal = deleteId && (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 max-w-sm border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.97))' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={18} style={{ color: RED }} />
          </div>
          <h3 className="text-base font-bold text-white">Remover Comunicado?</h3>
        </div>
        <p className="text-xs text-white/60 mb-6 leading-relaxed">
          Você está prestes a remover o comunicado <strong style={{ color: 'rgba(255,255,255,0.9)' }}>"{deleteName}"</strong>. Esta ação não pode ser desfeita.
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
      <PageCarousel3D slides={[slideMural, isGestor ? slidePublicar : slideManual]} />
      {deleteModal}
    </div>
  );
};
