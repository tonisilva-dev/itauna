import { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, ZoomIn, Plus, Heart, Map, Loader2, Search, Trash2, Image as ImageIcon, TreePine } from 'lucide-react';
import { gotoSlide } from '../../utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { Lightbox, type CarouselPhoto } from '../../components/ui/Carousel';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import { fetchGaleriaFotos, insertGaleriaFoto, deleteGaleriaFoto, type DbGaleriaFoto } from '@/lib/supabase-queries';
import { supabase } from '@/lib/supabase';

const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const RED   = '#ef4444';

const CATEGORIES = ['Todas', 'Natureza', 'Infraestrutura', 'Lazer', 'Esportes'];

const toCarousel = (fotos: DbGaleriaFoto[]): CarouselPhoto[] =>
  fotos.map((f, idx) => ({ id: idx, src: f.src, caption: f.caption, category: f.category }));

export const Galeria = () => {
  const { isGestor, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dbFotos, setDbFotos]         = useState<DbGaleriaFoto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [catFilter, setCatFilter]     = useState('Todas');
  const [search, setSearch]           = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx]       = useState<number | null>(null);

  const [formCaption, setFormCaption] = useState('');
  const [formCategory, setFormCategory] = useState('Natureza');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging]       = useState(false);

  useEffect(() => {
    fetchGaleriaFotos()
      .then(setDbFotos)
      .catch(() => toast.error('Erro ao carregar galeria.'))
      .finally(() => setLoading(false));
  }, []);

  const photoList = useMemo(() => toCarousel(dbFotos), [dbFotos]);

  // Mapa id → dbFoto para lookup O(1) dentro do grid
  const dbFotoById = useMemo(
    () => Object.fromEntries(dbFotos.map(f => [f.src, f])),
    [dbFotos]
  );

  const filtered = useMemo(() => photoList.filter(p => {
    const matchCat    = catFilter === 'Todas' || p.category === catFilter;
    const matchSearch = !search || p.caption.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [photoList, catFilter, search]);

  const openLightbox = (filteredIdx: number) => {
    const photo = filtered[filteredIdx];
    const realIdx = photoList.findIndex(p => p.id === photo.id);
    setLightboxIndex(realIdx >= 0 ? realIdx : filteredIdx);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 10 MB.'); return; }
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCaption.trim()) { toast.error('Informe a legenda.'); return; }
    if (!selectedFile)       { toast.error('Selecione uma imagem.'); return; }
    setSubmitting(true);
    setUploadProgress(20);
    try {
      const path = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('galeria').upload(path, selectedFile, { upsert: false });
      if (upErr) throw upErr;
      setUploadProgress(70);
      const { data: urlData } = supabase.storage.from('galeria').getPublicUrl(path);
      const newFoto = await insertGaleriaFoto({
        src: urlData.publicUrl, caption: formCaption.trim(),
        category: formCategory, created_by: user!.id,
      });
      setUploadProgress(100);
      setDbFotos(prev => [...prev, newFoto]);
      setFormCaption(''); setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Foto publicada na galeria!');
      gotoSlide(0);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar foto.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1200);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<DbGaleriaFoto | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget || !isGestor) return;
    try {
      await deleteGaleriaFoto(deleteTarget.id);
      setDbFotos(prev => prev.filter(f => f.id !== deleteTarget.id));
      toast.success('Foto removida da galeria.');
    } catch { toast.error('Erro ao remover foto.'); }
    finally { setDeleteTarget(null); }
  };

  // ─────────────────────────────────────────────────────────────────
  const slideGaleria: SlideItem = {
    key: 'galeria-mural',
    label: 'Galeria',
    content: (
      <SlidePanel
        eyebrow="Galeria Fotográfica Itaúna"
        title={<>Álbuns de <span className="grad-text">Fotos</span></>}
        badges={[
          { icon: '🌅', label: 'Lagos & Matas' },
          { icon: '🏡', label: 'Infraestrutura' },
          { icon: '🏊', label: 'Lazer & Esportes' },
        ]}
        actions={
          isGestor ? (
            <button
              onClick={() => { gotoSlide(1); }}
              className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
            >
              <Plus size={13} /> Adicionar
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-col h-full gap-2.5">

          {/* KPIs + filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 overflow-x-auto">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-2.5 py-1 rounded text-[10px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                    catFilter === c ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                  }`}>{c}</button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[120px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <input type="text" className="input pl-7 py-1.5 text-xs w-full"
                placeholder="Buscar por legenda..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
              {filtered.length} foto{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grid de fotos */}
          <div className="flex-1 overflow-y-auto pr-0.5">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-white/40 text-xs">
                <Loader2 size={14} className="animate-spin" /> Carregando galeria...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Nenhuma foto encontrada.</p>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filtered.map((photo, idx) => {
                  const dbFoto = dbFotoById[photo.src];
                  const isHovered = hoverIdx === idx;
                  return (
                    <div key={photo.id}
                      className="group relative rounded-xl overflow-hidden cursor-pointer border border-white/5 aspect-square"
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx(null)}
                    >
                      <img src={photo.src} alt={photo.caption}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Overlay — visível no hover (desktop) ou sempre no mobile via group-hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex flex-col justify-end p-1.5 text-[8.5px] text-white opacity-0 group-hover:opacity-100 sm:opacity-0 transition-opacity duration-200"
                        style={{ opacity: isHovered ? 1 : undefined }}
                      >
                        <p className="font-bold leading-tight truncate">{photo.caption}</p>
                        <span style={{ fontSize: '0.6rem', color: CYAN, textTransform: 'uppercase', fontWeight: 700 }}>{photo.category}</span>
                      </div>
                      {/* Botão zoom — sempre visível no mobile */}
                      <button
                        onClick={() => openLightbox(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/65 backdrop-blur-sm flex items-center justify-center border border-white/10 cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn size={11} style={{ color: CYAN }} />
                      </button>
                      {/* Botão delete — sempre visível no mobile para gestor */}
                      {isGestor && dbFoto && (
                        <button
                          onClick={() => setDeleteTarget(dbFoto)}
                          className="absolute top-1 left-1 w-6 h-6 rounded-md bg-black/65 backdrop-blur-sm flex items-center justify-center border border-red-500/30 cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          title="Remover foto"
                        >
                          <Trash2 size={10} style={{ color: RED }} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SlidePanel>
    ),
  };

  const slideUpload: SlideItem = {
    key: 'galeria-upload',
    label: 'Adicionar Foto',
    content: (
      <SlidePanel
        eyebrow="Publicar na Galeria"
        title={<>Adicionar <span className="grad-text">Nova Foto</span></>}
        badges={[
          { icon: '✦', label: 'Upload Imediato' },
          { icon: '🔒', label: 'Bucket Público' },
          { icon: '⌘', label: 'Máx. 10 MB' },
        ]}
      >
        <form onSubmit={handleUpload} className="flex flex-col gap-3.5 py-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Legenda da Foto *</label>
              <input type="text" className="input" placeholder="Ex: Fogueira sob as estrelas"
                value={formCaption} onChange={e => setFormCaption(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Categoria</label>
              <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Drop zone */}
          <div>
            <label className="input-label text-[11px]">Imagem *</label>
            <label
              htmlFor="galeria-file"
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0] ?? null); }}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all"
              style={{
                borderColor: dragging ? CYAN : selectedFile ? GREEN : 'rgba(255,255,255,0.1)',
                background:  dragging ? 'rgba(87,216,255,0.05)' : selectedFile ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              {selectedFile ? (
                <>
                  <ImageIcon size={20} style={{ color: GREEN }} />
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate max-w-full">{selectedFile.name}</p>
                  <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.4)' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · Clique para trocar
                  </p>
                </>
              ) : (
                <>
                  <Upload size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Arraste ou clique para selecionar</p>
                  <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>JPG, PNG, WebP · Máx. 10 MB</p>
                </>
              )}
            </label>
            <input ref={fileInputRef} id="galeria-file" type="file" className="hidden"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={e => handleFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Barra de progresso */}
          {submitting && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[9.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>{uploadProgress < 70 ? 'Enviando imagem...' : uploadProgress < 100 ? 'Registrando...' : 'Concluído!'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%`, background: `linear-gradient(90deg, ${CYAN}, ${GREEN})` }} />
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || !selectedFile}
            className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5"
            style={!selectedFile ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
            {submitting
              ? <><Loader2 size={13} className="animate-spin" /> Publicando...</>
              : <><Upload size={13} /> Publicar na Galeria</>
            }
          </button>
        </form>
      </SlidePanel>
    ),
  };

  const slideSobre: SlideItem = {
    key: 'galeria-sobre',
    label: 'Sobre Itaúna',
    content: (
      <SlidePanel
        eyebrow="Nosso Lar"
        title={<>Belezas de <span className="grad-text">Ibiporã – PR</span></>}
        badges={[
          { icon: '🌿', label: 'Preservação Verde' },
          { icon: '📍', label: 'Norte do Paraná' },
          { icon: '🏊', label: 'Ecoturismo' },
        ]}
      >
        <div className="space-y-3 overflow-y-auto h-full pr-0.5">
          {[
            { icon: TreePine, color: GREEN, title: 'Área de Preservação', desc: 'O condomínio preserva extensas áreas verdes com mata nativa, lagoas artificiais e fauna local, criando um ambiente único de contato com a natureza.' },
            { icon: Heart,    color: RED,   title: 'Aves e Fauna Local', desc: 'Lagos e arredores abrigam garças, patos, gansos e dezenas de espécies de aves que encantam moradores e visitantes ao longo de todo o ano.' },
            { icon: Map,      color: CYAN,  title: 'Localização Estratégica', desc: 'Em Ibiporã, com acesso rápido à BR-369 e a poucos quilômetros de Londrina. Tranquilidade rural com praticidade urbana.' },
          ].map(item => (
            <div key={item.title} className="flex gap-3 p-3.5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}10`, border: `1px solid ${item.color}22` }}>
                <item.icon size={14} style={{ color: item.color }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem', marginBottom: 3 }}>{item.title}</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SlidePanel>
    ),
  };

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={[slideGaleria, isGestor ? slideUpload : slideSobre]} />
      {lightboxIndex !== null && (
        <Lightbox photos={photoList} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl p-5 max-w-xs w-full space-y-4" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Trash2 className="w-5 h-5" style={{ color: RED }} />
              </div>
              <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Remover Foto?</h4>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                "<strong style={{ color: 'rgba(255,255,255,0.7)' }}>{deleteTarget.caption}</strong>" será removida da galeria permanentemente.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
