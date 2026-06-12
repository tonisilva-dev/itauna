import { useState, useEffect, useMemo } from 'react';
import { Building2, Globe, Phone, Mail, Edit2, Trash2, Save, BadgePercent, Gift, ArrowRight, Loader2, Star, Handshake, Package, Users, Tag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D } from '../../components/ui/PageCarousel3D';
import type { SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { maskPhone, gotoSlide } from '../../utils/format';
import {
  fetchParceiros, insertParceiro, updateParceiro, deleteParceiro,
  type DbParceiro,
} from '@/lib/supabase-queries';

const CYAN   = '#57d8ff';
const YELLOW = '#f59e0b';
const GREEN  = '#10b981';
const BLUE   = '#5a84ff';
const PURPLE = '#8b5cf6';

const CATEGORIAS = ['Patrocinador', 'Apoiador', 'Fornecedor', 'Institucional', 'Geral'];

const CAT_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof Star; label: string }> = {
  Patrocinador:  { color: YELLOW, bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.28)', icon: Star,      label: 'Patrocinador' },
  Apoiador:      { color: CYAN,   bg: 'rgba(87,216,255,0.08)', border: 'rgba(87,216,255,0.22)', icon: Handshake, label: 'Apoiador'     },
  Fornecedor:    { color: BLUE,   bg: 'rgba(90,132,255,0.08)', border: 'rgba(90,132,255,0.22)', icon: Package,   label: 'Fornecedor'   },
  Institucional: { color: GREEN,  bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.22)', icon: Users,     label: 'Institucional' },
  Geral:         { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', icon: Building2, label: 'Geral' },
};

const whatsappLink = (tel: string) => {
  const digits = tel.replace(/\D/g, '');
  if (digits.length >= 10) return `https://wa.me/55${digits}`;
  return null;
};

export const Parceiros = () => {
  const { isGestor, user } = useAuth();
  const [parceiros, setParceiros] = useState<DbParceiro[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('Todos');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome]           = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('Geral');
  const [telefone, setTelefone]   = useState('');
  const [email, setEmail]         = useState('');
  const [website, setWebsite]     = useState('');

  useEffect(() => {
    fetchParceiros()
      .then(setParceiros)
      .catch(() => toast.error('Erro ao carregar parceiros.'))
      .finally(() => setLoading(false));
  }, []);

  const CAT_ORDER: Record<string, number> = { Patrocinador: 0, Apoiador: 1, Fornecedor: 2, Institucional: 3, Geral: 4 };

  const sorted = useMemo(() => {
    const filtered = parceiros.filter(p => {
      const matchCat    = catFilter === 'Todos' || p.categoria === catFilter;
      const matchSearch = !search || p.nome.toLowerCase().includes(search.toLowerCase()) ||
                          p.descricao?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
    return [...filtered].sort((a, b) => (CAT_ORDER[a.categoria] ?? 5) - (CAT_ORDER[b.categoria] ?? 5));
  }, [parceiros, catFilter, search]);

  const totalPatrocinadores = useMemo(() => parceiros.filter(p => p.categoria === 'Patrocinador').length, [parceiros]);

  const clearForm = () => {
    setEditingId(null); setNome(''); setDescricao(''); setCategoria('Geral');
    setTelefone(''); setEmail(''); setWebsite('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !descricao.trim()) { toast.error('Nome e descrição são obrigatórios.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        nome: nome.trim(), descricao: descricao.trim(), categoria,
        website: website.trim() || undefined, telefone: telefone.trim() || undefined, email: email.trim() || undefined,
      };
      if (editingId) {
        const updated = await updateParceiro(editingId, payload);
        setParceiros(prev => prev.map(p => p.id === editingId ? updated : p));
        toast.success('Parceiro atualizado!');
      } else {
        const novo = await insertParceiro({ ...payload, created_by: user!.id });
        setParceiros(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
        toast.success('Nova parceria cadastrada!');
      }
      clearForm();
      gotoSlide(0);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar parceiro.');
    } finally { setSubmitting(false); }
  };

  const startEdit = (p: DbParceiro) => {
    setEditingId(p.id); setNome(p.nome); setDescricao(p.descricao); setCategoria(p.categoria);
    setTelefone(p.telefone ?? ''); setEmail(p.email ?? ''); setWebsite(p.website ?? '');
    gotoSlide(1);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteParceiro(deleteId);
      setParceiros(prev => prev.filter(p => p.id !== deleteId));
      toast.success('Parceiro removido.');
    } catch { toast.error('Erro ao remover.'); }
    finally { setDeleteId(null); setDeleteName(''); }
  };

  /* ── Slide 1: Vitrine ── */
  const slideVitrine: SlideItem = {
    key: 'vitrine',
    label: 'Vitrine de Parceiros',
    content: (
      <SlidePanel
        eyebrow="Gestão · Fornecedores"
        title={<>Parceiros <span className="grad-text">& Convênios</span></>}
        subtitle="Fornecedores, prestadores de serviço e convênios com desconto para condôminos."
        badges={[
          { icon: '⭐', label: `${totalPatrocinadores} patrocinadores` },
          { icon: '🤝', label: `${parceiros.length} no total` },
          { icon: '💰', label: 'Descontos exclusivos' },
        ]}
        actions={
          isGestor ? (
            <button
              onClick={() => { gotoSlide(1); }}
              className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
            >
              + Parceiro
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-col h-full gap-2.5">

          {/* Busca + filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="input flex-1 text-xs py-1.5" placeholder="Buscar parceiro..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 w-fit self-end overflow-x-auto">
              {['Todos', ...CATEGORIAS].map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-2.5 py-1 rounded text-[9.5px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                    catFilter === c ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          {/* Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto flex-1 pr-0.5">
            {loading && (
              <div className="col-span-full flex items-center justify-center gap-2 py-12 text-white/40 text-xs">
                <Loader2 size={16} className="animate-spin" /> Carregando...
              </div>
            )}
            {!loading && sorted.map(p => {
              const cfg     = CAT_CONFIG[p.categoria] ?? CAT_CONFIG.Geral;
              const Icon    = cfg.icon;
              const isSponsor = p.categoria === 'Patrocinador';
              const waLink  = p.telefone ? whatsappLink(p.telefone) : null;

              return (
                <div key={p.id}
                  className="rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all hover:translate-y-[-1px]"
                  style={{
                    background: isSponsor
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(13,20,35,0.95))'
                      : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isSponsor ? 'rgba(245,158,11,0.3)' : cfg.border}`,
                    boxShadow: isSponsor ? '0 0 20px rgba(245,158,11,0.08)' : 'none',
                  }}>

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <Icon size={16} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }} className="truncate">{p.nome}</p>
                          {isSponsor && <Star size={10} style={{ color: YELLOW, flexShrink: 0 }} />}
                        </div>
                        <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {p.categoria}
                        </span>
                      </div>
                    </div>
                    {isGestor && (
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button className="btn-ghost p-1" onClick={() => startEdit(p)}><Edit2 size={12} /></button>
                        <button className="btn-ghost p-1" onClick={() => { setDeleteId(p.id); setDeleteName(p.nome); }} style={{ color: 'rgba(239,68,68,0.6)' }}><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  {p.descricao && (
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 }} className="line-clamp-2">{p.descricao}</p>
                  )}

                  {/* Contatos */}
                  <div className="flex flex-wrap gap-1.5 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all"
                        style={{ background: 'rgba(37,211,102,0.12)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)', textDecoration: 'none' }}>
                        <Phone size={9} /> WhatsApp
                      </a>
                    )}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all"
                        style={{ background: `${cfg.color}10`, color: cfg.color, border: `1px solid ${cfg.color}25`, textDecoration: 'none' }}>
                        <Globe size={9} /> Site
                      </a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all"
                        style={{ background: 'rgba(90,132,255,0.08)', color: BLUE, border: '1px solid rgba(90,132,255,0.18)', textDecoration: 'none' }}>
                        <Mail size={9} /> Email
                      </a>
                    )}
                    {p.telefone && !waLink && (
                      <span className="flex items-center gap-1 px-2 py-1 text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <Phone size={9} /> {p.telefone}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && sorted.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>Nenhum parceiro encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </SlidePanel>
    ),
  };

  /* ── Slide 2: Cadastrar / Vantagens ── */
  const slideCadastro: SlideItem = {
    key: 'cadastro_vantagem',
    label: isGestor ? (editingId ? 'Editar Parceria' : 'Registrar Parceria') : 'Como Usar',
    content: (
      <SlidePanel
        eyebrow={isGestor ? 'Gerenciar Parcerias' : 'Clube de Vantagens'}
        title={isGestor
          ? <>{editingId ? 'Editar' : 'Nova'} <span className="grad-text">Parceria</span></>
          : <>Vantagens <span className="grad-text">Exclusivas</span></>
        }
        badges={isGestor
          ? [{ icon: '✦', label: 'Parceria Comercial' }, { icon: '🤝', label: 'Convênio Oficial' }]
          : [{ icon: '💰', label: 'Descontos' }, { icon: '⭐', label: 'Patrocinadores' }, { icon: '📍', label: 'Região' }]
        }
      >
        {isGestor ? (
          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Nome da Empresa *</label>
                <input className="input w-full" placeholder="Ex: Farmácia Popular" value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Categoria</label>
                <select className="input w-full" value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="input-label text-[11px]">Descrição / Vantagem Oferecida *</label>
              <textarea className="input w-full resize-none" style={{ height: 60 }}
                placeholder="Desconto de 10% em toda a linha de genéricos para moradores Itaúna"
                value={descricao} onChange={e => setDescricao(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Telefone / WhatsApp</label>
                <input className="input w-full" placeholder="(43) 99999-0000" value={telefone} onChange={e => setTelefone(maskPhone(e.target.value))} />
              </div>
              <div>
                <label className="input-label text-[11px]">E-mail</label>
                <input className="input w-full" type="email" placeholder="contato@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="input-label text-[11px]">Website</label>
              <input className="input w-full" placeholder="https://site.com.br" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              {editingId && (
                <button type="button" onClick={clearForm} className="btn-ghost flex-1 py-2 text-xs">Cancelar</button>
              )}
              <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5">
                {submitting ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Save size={13} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Parceiro'}</>}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 overflow-y-auto h-full pr-0.5">

            {/* Destaque Patrocinadores */}
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(13,20,35,0.95))', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="flex items-center gap-2">
                <Star size={14} style={{ color: YELLOW }} />
                <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.875rem' }}>Clube de Vantagens Itaúna</p>
              </div>
              <p style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                Como condômino do Itaúna, você tem acesso a <strong style={{ color: YELLOW }}>descontos e benefícios exclusivos</strong> no comércio local de Ibiporã e região. Nenhum cadastro adicional necessário.
              </p>
            </div>

            {/* Como usar */}
            {[
              { icon: BadgePercent, color: CYAN, title: 'Como acessar os descontos?', desc: 'Ao visitar empresas com selo Patrocinador ou Apoiador, informe que é morador do Condomínio Chácaras Itaúna e apresente o perfil no app.' },
              { icon: Gift, color: GREEN, title: 'Qual a validade das ofertas?', desc: 'Os convênios são negociados pela administração e renovados periodicamente. Consulte a descrição de cada parceiro para os detalhes da oferta atual.' },
              { icon: Handshake, color: BLUE, title: 'Quer indicar um parceiro?', desc: 'Se conhece uma empresa interessada em oferecer descontos aos moradores, entre em contato com a administração para negociação.' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 p-3.5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${item.color}10`, border: `1px solid ${item.color}22` }}>
                  <item.icon size={14} style={{ color: item.color }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: 3 }}>{item.title}</p>
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{item.desc}</p>
                </div>
              </div>
            ))}

            <a href="mailto:secretaria@itauna.org"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(87,216,255,0.08)', color: CYAN, border: '1px solid rgba(87,216,255,0.2)', textDecoration: 'none' }}>
              Falar com a Secretaria <ArrowRight size={12} />
            </a>
          </div>
        )}
      </SlidePanel>
    ),
  };

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={[slideVitrine, slideCadastro]} />
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl p-5 max-w-xs w-full space-y-4" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Trash2 className="w-5 h-5" style={{ color: '#ef4444' }} />
              </div>
              <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Remover Parceiro?</h4>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                "<strong style={{ color: 'rgba(255,255,255,0.7)' }}>{deleteName}</strong>" será removido da vitrine permanentemente.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setDeleteId(null); setDeleteName(''); }} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
