import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, CheckCircle2, AlertCircle, Loader2, MapPin, Calendar, AlertTriangle, Package } from 'lucide-react';
import { gotoSlide } from '../../utils/format';
import { PageCarousel3D } from '../../components/ui/PageCarousel3D';
import type { SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAchadosPerdidos, insertAchadoPerdido, resolveAchadoPerdido,
  type DbAchadoPerdido,
} from '@/lib/supabase-queries';

const TODAY = new Date().toISOString().slice(0, 10);

const RED    = '#ef4444';
const GREEN  = '#10b981';
const YELLOW = '#f59e0b';
const CYAN   = '#57d8ff';

export const AchadosPerdidos = () => {
  const { user } = useAuth();
  const [items, setItems]         = useState<DbAchadoPerdido[]>([]);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setTypeFilter]   = useState<'todos' | 'perdido' | 'achado'>('todos');
  const [statusFilter, setStatusFilter] = useState<'aberto' | 'resolvido' | 'todos'>('aberto');
  const [search, setSearch]       = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);

  const [formType, setFormType]   = useState<'perdido' | 'achado'>('perdido');
  const [formTitle, setFormTitle] = useState('');
  const [formLocal, setFormLocal] = useState('');
  const [formDate, setFormDate]   = useState(TODAY);
  const [formDesc, setFormDesc]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAchadosPerdidos()
      .then(setItems)
      .catch(() => toast.error('Erro ao carregar mural.'))
      .finally(() => setLoading(false));
  }, []);

  const perdidosAbertos = useMemo(() => items.filter(i => i.type === 'perdido' && i.status !== 'resolvido').length, [items]);
  const achadosAbertos  = useMemo(() => items.filter(i => i.type === 'achado'  && i.status !== 'resolvido').length, [items]);
  const resolvidos      = useMemo(() => items.filter(i => i.status === 'resolvido').length, [items]);

  const filtered = useMemo(() => items.filter(i => {
    if (typeFilter   !== 'todos'    && i.type   !== typeFilter)                       return false;
    if (statusFilter === 'aberto'   && i.status === 'resolvido')                      return false;
    if (statusFilter === 'resolvido' && i.status !== 'resolvido')                     return false;
    if (search) {
      const q = search.toLowerCase();
      return i.title.toLowerCase().includes(q) || i.descricao.toLowerCase().includes(q) || i.local.toLowerCase().includes(q);
    }
    return true;
  }), [items, typeFilter, statusFilter, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formLocal.trim()) { toast.error('Preencha título e local.'); return; }
    setSubmitting(true);
    try {
      const novo = await insertAchadoPerdido({
        type: formType, title: formTitle.trim(), local: formLocal.trim(),
        descricao: formDesc.trim(), date: formDate, user_id: user!.id,
      });
      setItems(prev => [novo, ...prev]);
      setFormTitle(''); setFormLocal(''); setFormDesc('');
      setFormDate(TODAY);
      toast.success('Item registrado no mural!');
      gotoSlide(0);
    } catch { toast.error('Erro ao registrar item.'); }
    finally { setSubmitting(false); }
  };

  const handleResolve = async () => {
    if (!resolveId) return;
    try {
      await resolveAchadoPerdido(resolveId);
      setItems(prev => prev.map(i =>
        i.id === resolveId ? { ...i, status: 'resolvido', resolved_at: new Date().toISOString() } : i
      ));
      toast.success('Item marcado como devolvido!');
    } catch { toast.error('Erro ao atualizar status.'); }
    finally { setResolveId(null); }
  };

  /* ── Slide 1: Mural ── */
  const slideMural: SlideItem = {
    key: 'achados-mural',
    label: 'Mural',
    content: (
      <SlidePanel
        eyebrow="Mural de Achados & Perdidos"
        title={<>Achados & <span className="grad-text">Perdidos</span></>}
        badges={[
          { icon: '🔍', label: `${perdidosAbertos} perdidos` },
          { icon: '✅', label: `${achadosAbertos} achados` },
          { icon: '📦', label: `${resolvidos} resolvidos` },
        ]}
        actions={
          <button
            onClick={() => { gotoSlide(1); }}
            className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
          >
            <Plus size={13} /> Registrar
          </button>
        }
      >
        <div className="flex flex-col h-full gap-2.5">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Perdidos" value={String(perdidosAbertos)} icon={AlertCircle} iconColor={RED} iconBg="rgba(239,68,68,0.08)" />
            <StatCard label="Achados" value={String(achadosAbertos)} icon={Package} iconColor={YELLOW} iconBg="rgba(245,158,11,0.08)" />
            <StatCard label="Resolvidos" value={String(resolvidos)} icon={CheckCircle2} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input type="text" className="input pl-8 py-1.5 text-xs"
                placeholder="Buscar por item, descrição ou local..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 w-fit self-end">
              {([
                { v: 'todos',   l: 'Todos'    },
                { v: 'perdido', l: '🔍 Perdidos' },
                { v: 'achado',  l: '✅ Achados' },
              ] as const).map(f => (
                <button key={f.v} onClick={() => setTypeFilter(f.v)}
                  className={`px-2 py-1 rounded text-[9.5px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                    typeFilter === f.v ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                  }`}>{f.l}</button>
              ))}
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 w-fit self-end">
              {([
                { v: 'aberto',   l: 'Em aberto' },
                { v: 'resolvido', l: 'Resolvidos' },
                { v: 'todos',    l: 'Todos'      },
              ] as const).map(f => (
                <button key={f.v} onClick={() => setStatusFilter(f.v)}
                  className={`px-2 py-1 rounded text-[9.5px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                    statusFilter === f.v ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                  }`}>{f.l}</button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-xs">
                <Loader2 size={14} className="animate-spin" /> Carregando...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-7 h-7 mx-auto mb-2 opacity-20" />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Nenhum item encontrado.</p>
              </div>
            )}
            {!loading && filtered.map(item => {
              const isLost     = item.type === 'perdido';
              const isResolved = item.status === 'resolvido';
              const color      = isLost ? RED : YELLOW;
              return (
                <div key={item.id}
                  className="flex items-start gap-3 p-3 rounded-2xl border transition-all"
                  style={{
                    background: isResolved ? 'rgba(16,185,129,0.04)' : isLost ? 'rgba(239,68,68,0.04)' : 'rgba(245,158,11,0.04)',
                    borderColor: isResolved ? 'rgba(16,185,129,0.15)' : `${color}22`,
                  }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: isResolved ? 'rgba(16,185,129,0.1)' : `${color}12`, border: `1px solid ${isResolved ? 'rgba(16,185,129,0.2)' : color + '28'}` }}>
                    {isResolved
                      ? <CheckCircle2 size={14} style={{ color: GREEN }} />
                      : isLost
                        ? <AlertCircle size={14} style={{ color: RED }} />
                        : <Package size={14} style={{ color: YELLOW }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: `${color}12`, color, border: `1px solid ${color}28` }}>
                        {isLost ? 'Perdido' : 'Achado'}
                      </span>
                      <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: isResolved ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: isResolved ? GREEN : YELLOW, border: `1px solid ${isResolved ? 'rgba(16,185,129,0.22)' : 'rgba(245,158,11,0.22)'}` }}>
                        {isResolved ? 'Resolvido' : 'Em aberto'}
                      </span>
                    </div>
                    <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem', lineHeight: 1.2 }}>{item.title}</h4>
                    {item.descricao && (
                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, margin: '3px 0' }} className="line-clamp-2">{item.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span className="flex items-center gap-1"><MapPin size={8} /> {item.local}</span>
                      <span className="flex items-center gap-1"><Calendar size={8} /> {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  {!isResolved && (
                    <button
                      onClick={() => setResolveId(item.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer flex-shrink-0 self-center"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.22)' }}
                    >
                      <CheckCircle2 size={10} /> Devolvido
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal confirmar devolução */}
        {resolveId && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
            <div className="rounded-2xl p-5 max-w-xs w-full mx-4 space-y-4"
              style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />
                </div>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Marcar como Devolvido?</h4>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>O item será marcado como resolvido e removido da lista de pendências.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setResolveId(null)} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                <button onClick={handleResolve} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    ),
  };

  /* ── Slide 2: Registrar ── */
  const slideRegistrar: SlideItem = {
    key: 'achados-registrar',
    label: 'Registrar',
    content: (
      <SlidePanel
        eyebrow="Registrar no Mural"
        title={<>Declarar Item <span className="grad-text">Perdido ou Achado</span></>}
        badges={[
          { icon: '✦', label: 'Registro Rápido' },
          { icon: '🔔', label: 'Notifica Portaria' },
          { icon: '🔒', label: 'Identificado' },
        ]}
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-3 py-1 text-xs">

          {/* Seletor visual de tipo */}
          <div>
            <label className="input-label text-[11px]">Tipo de Declaração</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {([
                { v: 'perdido', l: 'Perdi um item', icon: AlertCircle, color: RED, bg: 'rgba(239,68,68,0.09)', border: 'rgba(239,68,68,0.25)', desc: 'Você perdeu algo no condomínio' },
                { v: 'achado',  l: 'Encontrei um item', icon: Package, color: YELLOW, bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.25)', desc: 'Você achou algo pertencente a outro morador' },
              ] as const).map(opt => (
                <button key={opt.v} type="button" onClick={() => setFormType(opt.v)}
                  className="p-3 rounded-xl flex flex-col items-center gap-1.5 cursor-pointer transition-all text-center"
                  style={{
                    background: formType === opt.v ? opt.bg : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${formType === opt.v ? opt.color : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: formType === opt.v ? `0 0 14px ${opt.color}22` : 'none',
                  }}>
                  <opt.icon size={18} style={{ color: formType === opt.v ? opt.color : 'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.72rem', color: formType === opt.v ? opt.color : 'rgba(255,255,255,0.5)' }}>{opt.l}</span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Nome / Descrição do Item *</label>
              <input type="text" className="input" placeholder="Ex: Chave com chaveiro azul"
                value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Local Aproximado *</label>
              <input type="text" className="input" placeholder="Ex: Próximo à quadra"
                value={formLocal} onChange={e => setFormLocal(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Data do Acontecido</label>
              <input type="date" className="input" value={formDate} onChange={e => setFormDate(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Detalhes adicionais</label>
              <input type="text" className="input" placeholder="Cor, marca, tamanho..."
                value={formDesc} onChange={e => setFormDesc(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5">
            {submitting
              ? <><Loader2 size={13} className="animate-spin" /> Publicando...</>
              : <><Plus size={13} /> Publicar no Mural</>
            }
          </button>
        </form>
      </SlidePanel>
    ),
  };

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={[slideMural, slideRegistrar]} />
    </div>
  );
};
