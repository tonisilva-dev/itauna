import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText, Download, Search, Upload, Eye, FileImage,
  FileSpreadsheet, File, Plus, HelpCircle, Loader2,
  BookOpen, Shield, Phone, MessageSquare, ArrowRight,
} from 'lucide-react';
import { formatDate, gotoSlide } from '../../utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { fetchDocuments, insertDocument, type DbDocument } from '@/lib/supabase-queries';
import { supabase } from '@/lib/supabase';

const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const RED   = '#ef4444';
const BLUE  = '#5a84ff';

const CATEGORY_FIXED = ['Editais', 'Rateios', 'Atas', 'Regulamento', 'Financeiro', 'Contratos'];

const fileIcon = (type: string) => {
  if (type === 'pdf')                          return { icon: FileText,        color: RED,  bg: 'rgba(239,68,68,0.08)' };
  if (type === 'xlsx' || type === 'xls')       return { icon: FileSpreadsheet, color: GREEN, bg: 'rgba(16,185,129,0.08)' };
  if (['jpg','png','webp','jpeg'].includes(type)) return { icon: FileImage,    color: BLUE, bg: 'rgba(59,130,246,0.08)' };
  return { icon: File, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' };
};

const formatSize = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const isNew = (dateStr: string) => {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 7;
};

export const Documentos = () => {
  const { isGestor, user } = useAuth();
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('Todos');

  const [formTitle, setFormTitle]       = useState('');
  const [formDesc, setFormDesc]         = useState('');
  const [formCategory, setFormCategory] = useState('Rateios');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments(isGestor)
      .then(setDocuments)
      .catch(() => toast.error('Erro ao carregar documentos.'))
      .finally(() => setLoading(false));
  }, [isGestor]);

  const allCategories = useMemo(
    () => ['Todos', ...Array.from(new Set(documents.map(d => d.category))).sort()],
    [documents]
  );

  const filtered = useMemo(() => documents.filter(d => {
    if (catFilter !== 'Todos' && d.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
    }
    return true;
  }), [documents, catFilter, search]);

  const openDocument = async (doc: DbDocument) => {
    if (!doc.file_url) return;
    if (doc.file_url.startsWith('http')) { window.open(doc.file_url, '_blank'); return; }
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Não foi possível abrir o arquivo.');
  };

  const downloadDocument = async (doc: DbDocument) => {
    if (!doc.file_url) return;
    try {
      let url = doc.file_url;
      if (!url.startsWith('http')) {
        const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 60);
        if (!data?.signedUrl) { toast.error('Erro ao gerar link de download.'); return; }
        url = data.signedUrl;
      }
      const a = Object.assign(document.createElement('a'), { href: url, download: doc.file_name ?? doc.title, target: '_blank' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { toast.error('Erro ao baixar documento.'); }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const MAX = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX) { toast.error('Arquivo muito grande. Máximo: 20 MB.'); return; }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !selectedFile) { toast.error('Preencha o título e selecione um arquivo.'); return; }
    setSubmitting(true);
    setUploadProgress(10);
    try {
      const ext         = selectedFile.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const storagePath = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;

      setUploadProgress(30);
      const { error: upErr } = await supabase.storage
        .from('documents').upload(storagePath, selectedFile, { upsert: false });
      if (upErr) throw upErr;

      setUploadProgress(70);
      const newDoc = await insertDocument({
        title: formTitle.trim(), description: formDesc.trim() || formTitle.trim(),
        category: formCategory, file_url: storagePath,
        file_name: selectedFile.name, file_type: ext,
        file_size: selectedFile.size, is_public: formIsPublic, created_by: user!.id,
      });

      setUploadProgress(100);
      setDocuments(prev => [newDoc, ...prev]);
      setFormTitle(''); setFormDesc(''); setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Documento publicado com sucesso!');
      gotoSlide(0);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao publicar documento.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1200);
    }
  };

  // ── Slide 1: Biblioteca ─────────────────────────────────────────
  const slideBiblioteca: SlideItem = {
    key: 'documentos-biblioteca',
    label: 'Biblioteca',
    content: (
      <SlidePanel
        eyebrow="Biblioteca Digital Itaúna"
        title={<>Documentos & <span className="grad-text">Arquivos</span></>}
        badges={[
          { icon: '📁', label: loading ? 'Carregando...' : `${documents.length} documentos` },
          { icon: '🔒', label: 'Acesso Seguro' },
          { icon: '⚡', label: 'Download Imediato' },
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

          {/* Busca + filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text" className="input pl-8 py-1.5 text-xs"
                placeholder="Buscar por título ou descrição..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 w-fit self-end overflow-x-auto">
              {allCategories.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-2.5 py-1 rounded text-[10px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                    catFilter === c ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs">
                <Loader2 size={16} className="animate-spin" /> Carregando...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-white/30 text-xs py-10">Nenhum documento encontrado.</p>
            )}
            {!loading && filtered.map(doc => {
              const fi  = fileIcon(doc.file_type);
              const Fi  = fi.icon;
              const nov = isNew(doc.created_at);
              return (
                <div key={doc.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border transition-all hover:bg-white/4"
                  style={{
                    background: nov ? 'rgba(87,216,255,0.03)' : 'rgba(255,255,255,0.02)',
                    borderColor: nov ? 'rgba(87,216,255,0.18)' : 'rgba(255,255,255,0.05)',
                  }}>
                  {/* Ícone de tipo */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: fi.bg, border: `1px solid ${fi.color}20` }}>
                    <Fi size={16} style={{ color: fi.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-bold text-white text-[12px] truncate leading-none">{doc.title}</p>
                      {nov && (
                        <span style={{ fontSize: '0.58rem', fontWeight: 800, color: CYAN, background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.25)', borderRadius: 5, padding: '1px 5px', flexShrink: 0 }}>
                          Novo
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.35 }} className="truncate">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 text-[9.5px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <span>{doc.category}</span>
                      <span>·</span>
                      <span>{formatSize(doc.file_size)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openDocument(doc)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                      title="Visualizar"
                    >
                      <Eye size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                    </button>
                    <button
                      onClick={() => downloadDocument(doc)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                      style={{ background: 'rgba(87,216,255,0.08)', border: '1px solid rgba(87,216,255,0.2)' }}
                      title="Baixar"
                    >
                      <Download size={12} style={{ color: CYAN }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SlidePanel>
    ),
  };

  // ── Slide 2: Upload (gestor) ────────────────────────────────────
  const slidePublicar: SlideItem = {
    key: 'documentos-publicar',
    label: 'Publicar',
    content: (
      <SlidePanel
        eyebrow="Publicar na Biblioteca"
        title={<>Enviar <span className="grad-text">Documento</span></>}
        badges={[
          { icon: '✦', label: 'Upload Seguro' },
          { icon: '🔒', label: 'Bucket Privado' },
          { icon: '⌘', label: 'Máx. 20 MB' },
        ]}
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-3 py-1 text-xs">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Título *</label>
              <input type="text" className="input" placeholder="Ex: Ata AGO — Jun/2026"
                value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Categoria</label>
              <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                {CATEGORY_FIXED.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label text-[11px]">Descrição breve</label>
            <input type="text" className="input" placeholder="Ex: Prestação de contas assinada pelo síndico"
              value={formDesc} onChange={e => setFormDesc(e.target.value)} />
          </div>

          {/* Drop zone */}
          <div>
            <label className="input-label text-[11px]">Arquivo *</label>
            <label
              htmlFor="doc-file-input"
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all"
              style={{
                borderColor: dragging ? CYAN : selectedFile ? GREEN : 'rgba(255,255,255,0.1)',
                background:  dragging ? 'rgba(87,216,255,0.05)' : selectedFile ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              {selectedFile ? (() => {
                const fi = fileIcon(selectedFile.name.split('.').pop() ?? '');
                const Fi = fi.icon;
                return (
                  <>
                    <Fi size={22} style={{ color: fi.color }} />
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate max-w-full">{selectedFile.name}</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{formatSize(selectedFile.size)} · Clique para trocar</p>
                  </>
                );
              })() : (
                <>
                  <Upload size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Arraste ou clique para selecionar</p>
                  <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>PDF, Excel, Word, Imagens · Máx. 20 MB</p>
                </>
              )}
            </label>
            <input ref={fileInputRef} id="doc-file-input" type="file" className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.webp"
              onChange={e => handleFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="flex items-center gap-2.5">
            <input type="checkbox" id="doc-public" className="w-4 h-4 rounded accent-cyan"
              checked={formIsPublic} onChange={e => setFormIsPublic(e.target.checked)} />
            <label htmlFor="doc-public" className="text-[11px] text-white/60 cursor-pointer select-none">
              Documento público — visível para todos os condôminos
            </label>
          </div>

          {/* Barra de progresso */}
          {submitting && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[9.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>{uploadProgress < 70 ? 'Enviando arquivo...' : uploadProgress < 100 ? 'Registrando...' : 'Concluído!'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%`, background: `linear-gradient(90deg, ${CYAN}, ${GREEN})` }}
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || !selectedFile}
            className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5"
            style={!selectedFile ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
            {submitting
              ? <><Loader2 size={13} className="animate-spin" /> Publicando...</>
              : <><Upload size={13} /> Publicar na Biblioteca Digital</>
            }
          </button>
        </form>
      </SlidePanel>
    ),
  };

  // ── Slide 2: FAQ morador ────────────────────────────────────────
  const slideFaq: SlideItem = {
    key: 'documentos-faq',
    label: 'Dúvidas & Suporte',
    content: (
      <SlidePanel
        eyebrow="Central de Apoio ao Condômino"
        title={<>Dúvidas <span className="grad-text">Frequentes</span></>}
        badges={[
          { icon: '❓', label: 'FAQ' },
          { icon: '🔒', label: 'LGPD' },
          { icon: '📞', label: 'Suporte' },
        ]}
      >
        <div className="space-y-2.5 overflow-y-auto pr-0.5 h-full">
          {[
            {
              icon: BookOpen, color: CYAN,
              q: 'Como solicitar cópia autenticada de ata?',
              a: 'Atas e regulamentos autenticados podem ser solicitados presencialmente na administração com 48h de antecedência. Documentos assinados digitalmente têm validade jurídica.',
            },
            {
              icon: FileText, color: RED,
              q: 'Onde encontro meu rateio e boletos?',
              a: 'Rateios mensais são publicados aqui na Biblioteca. Para boletos avulsos ou segunda via, acesse a seção Chácaras e clique em "Boleto PDF".',
            },
            {
              icon: Shield, color: GREEN,
              q: 'Política de Proteção de Dados (LGPD)',
              a: 'Documentos contábeis e financeiros com dados de terceiros são criptografados. O acesso é restrito por perfil. Seus dados nunca são compartilhados com terceiros sem consentimento.',
            },
            {
              icon: MessageSquare, color: '#8b5cf6',
              q: 'Posso solicitar documentos por aqui?',
              a: 'Para solicitações formais (declarações, certidões, histórico financeiro), abra uma ocorrência na categoria "Administrativo" e a gestão responderá em até 72 horas úteis.',
            },
          ].map((faq, i) => (
            <div key={i} className="rounded-2xl p-3.5 space-y-2"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${faq.color}12`, border: `1px solid ${faq.color}22` }}>
                  <faq.icon size={12} style={{ color: faq.color }} />
                </div>
                <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem', lineHeight: 1.25 }}>{faq.q}</h4>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, paddingLeft: '2.125rem' }}>{faq.a}</p>
            </div>
          ))}

          <div className="rounded-xl p-2.5 flex items-center gap-2.5"
            style={{ background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.1)' }}>
            <ArrowRight size={11} className="flex-shrink-0" style={{ color: CYAN }} />
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              Outras dúvidas? Abra uma <strong style={{ color: CYAN }}>Ocorrência</strong> ou consulte os <strong style={{ color: CYAN }}>Comunicados</strong> da administração.
            </p>
          </div>
        </div>
      </SlidePanel>
    ),
  };

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={[slideBiblioteca, isGestor ? slidePublicar : slideFaq]} />
    </div>
  );
};
