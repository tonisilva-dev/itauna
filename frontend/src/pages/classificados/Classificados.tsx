import { useState, useEffect, useMemo } from 'react';
import { Tag, Plus, Search, ChevronRight, Lock, MessageSquare, Loader2, Trash2, Package, X, Phone, Mail, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { maskPhone, gotoSlide } from '../../utils/format';
import {
  fetchClassificados, insertClassificado, deactivateClassificado,
  fetchMeusClassificados, type DbClassificado,
} from '@/lib/supabase-queries';

const CATEGORIES = ['Todos', 'Imóveis', 'Veículos', 'Serviços', 'Eletrônicos', 'Móveis', 'Outros'];

export const Classificados = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ads, setAds] = useState<DbClassificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selectedAd, setSelectedAd] = useState<DbClassificado | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('Outros');
  const [formPhone, setFormPhone] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [meusAds, setMeusAds] = useState<DbClassificado[]>([]);
  const [loadingMeus, setLoadingMeus] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Modal de contato
  const [contactAd, setContactAd] = useState<DbClassificado | null>(null);
  const [contactNome, setContactNome] = useState('');
  const [contactTel, setContactTel] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSending, setContactSending] = useState(false);

  useEffect(() => {
    fetchClassificados()
      .then(data => { setAds(data); if (data.length) setSelectedAd(data[0]); })
      .catch(() => toast.error('Erro ao carregar classificados.'))
      .finally(() => setLoading(false));
  }, []);

  // Carrega meus anúncios quando usuário está logado
  useEffect(() => {
    if (!user) return;
    setLoadingMeus(true);
    fetchMeusClassificados(user.id)
      .then(setMeusAds)
      .catch(() => {})
      .finally(() => setLoadingMeus(false));
  }, [user?.id]);

  const handleRemoveAd = async (id: string) => {
    setConfirmRemoveId(null);
    setRemovingId(id);
    try {
      await deactivateClassificado(id);
      setMeusAds(prev => prev.map(a => a.id === id ? { ...a, is_active: false } : a));
      setAds(prev => prev.filter(a => a.id !== id));
      if (selectedAd?.id === id) setSelectedAd(null);
      toast.success('Anúncio removido da vitrine.');
    } catch { toast.error('Erro ao remover anúncio.'); }
    finally { setRemovingId(null); }
  };

  const filtered = useMemo(() => ads.filter(a =>
    (categoryFilter === 'Todos' || a.category === categoryFilter) &&
    (search === '' || a.title.toLowerCase().includes(search.toLowerCase()))
  ), [ads, categoryFilter, search]);

  const abrirContato = (ad: DbClassificado) => {
    setContactAd(ad);
    setContactNome(user?.full_name ?? '');
    setContactTel('');
    setContactEmail('');
    setContactMsg(`Olá! Tenho interesse no anúncio "${ad.title}". Poderia me passar mais informações?`);
  };

  const enviarContato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactAd) return;
    if (!contactNome.trim() || !contactTel.trim()) {
      toast.error('Preencha nome e telefone.');
      return;
    }
    setContactSending(true);
    const texto = [
      `*Interesse em anúncio — Chácaras Itaúna*`,
      ``,
      `*Anúncio:* ${contactAd.title} (${contactAd.price})`,
      ``,
      `*Nome:* ${contactNome.trim()}`,
      `*Telefone:* ${contactTel.trim()}`,
      contactEmail.trim() ? `*E-mail:* ${contactEmail.trim()}` : '',
      ``,
      `*Mensagem:*`,
      contactMsg.trim(),
    ].filter(l => l !== undefined).join('\n');

    const numero = contactAd.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`, '_blank');
    toast.success('WhatsApp aberto com sua mensagem!');
    setContactSending(false);
    setContactAd(null);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPrice.trim() || !formPhone.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSubmitting(true);
    try {
      const newAd = await insertClassificado({
        title:       formTitle.trim(),
        description: formDesc.trim() || null,
        category:    formCategory,
        price:       formPrice.trim(),
        phone:       formPhone.trim(),
        location:    user?.unit_number ? `Chácara ${String(user.unit_number).padStart(3, '0')}` : null,
        user_id:     user!.id,
      });
      setAds(prev => [newAd, ...prev]);
      setSelectedAd(newAd);
      setFormTitle(''); setFormPrice(''); setFormPhone(''); setFormDesc('');
      toast.success('Anúncio publicado com sucesso!');
      gotoSlide(0);
    } catch { toast.error('Erro ao publicar anúncio. Tente novamente.'); }
    finally { setSubmitting(false); }
  };

  const slideVitrine = (
    <SlidePanel
      eyebrow="Social · Mercado"
      title={<>Classificados <span className="grad-text">Internos</span></>}
      subtitle="Compra, venda e serviços entre condôminos — sem taxas adicionais."
      badges={[
        { icon: '🛒', label: 'Mural Livre' },
        { icon: '🤝', label: 'Compra & Venda' },
        { icon: '⚡', label: 'Sem Taxas Adicionais' }
      ]}
      actions={
        <button
          onClick={() => {
            gotoSlide(1);
          }}
          className="btn-primary py-1.5 px-3 text-xs gap-1"
        >
          <Plus size={13} /> Anunciar
        </button>
      }
    >
      <div className="flex flex-col h-full gap-3 py-1">
        {/* Search & Category filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text" className="input pl-8 py-1.5 text-xs"
              placeholder="Buscar produtos..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 w-fit overflow-x-auto self-end">
            {CATEGORIES.map(c => (
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

        {/* Grid and Details Split */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-3 min-h-[170px] overflow-hidden">
          {/* Grid list */}
          <div className={`space-y-1.5 overflow-y-auto pr-1 ${selectedAd ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-xs">
                <Loader2 size={14} className="animate-spin" /> Carregando anúncios...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-white/30 text-xs py-8">Nenhum produto anunciado.</p>
            )}
            {!loading && filtered.map(ad => {
              const isSelected = selectedAd?.id === ad.id;
              return (
                <div
                  key={ad.id}
                  onClick={() => setSelectedAd(ad)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all text-[11px] ${
                    isSelected ? 'bg-cyan/10 border-cyan/35' : 'bg-white/3 border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-white/35">
                    <Tag size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white truncate leading-none mb-1">{ad.title}</h4>
                    <p className="text-[9.5px] text-white/40 leading-none">{ad.category} • <strong className="text-cyan">{ad.price}</strong></p>
                  </div>
                  <ChevronRight size={13} className="text-white/20 mt-0.5 flex-shrink-0" />
                </div>
              );
            })}
          </div>

          {/* Details Pane Inline */}
          {selectedAd && (
            <div className="lg:col-span-2 p-3.5 rounded-xl bg-white/4 border border-cyan/15 flex flex-col justify-between animate-slide-up text-[11px] h-full overflow-hidden">
              <div className="overflow-y-auto max-h-[160px] pr-1">
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/5">
                  <span className="badge badge-teal text-[8.5px] py-0.5 px-1 font-semibold">{selectedAd.category}</span>
                  <button onClick={() => setSelectedAd(null)} className="text-white/45 hover:text-white font-bold cursor-pointer text-[9.5px]">Fechar</button>
                </div>
                <h4 className="font-extrabold text-white mb-1 leading-snug">{selectedAd.title}</h4>
                <p className="text-cyan font-black text-xs mb-1.5">{selectedAd.price}</p>
                {selectedAd.description && (
                  <p className="text-white/60 leading-relaxed bg-white/2 p-2 rounded-lg border border-white/5 mb-2 whitespace-pre-wrap">{selectedAd.description}</p>
                )}
                <div className="space-y-0.5 text-[9.5px] text-white/40">
                  {selectedAd.location && (
                    <p>🏡 Origem: <strong className="text-white/70">{selectedAd.location}</strong></p>
                  )}
                  <p>📅 Data: <strong className="text-white/70">{new Date(selectedAd.created_at).toLocaleDateString('pt-BR')}</strong></p>
                </div>
              </div>

              <button
                onClick={() => abrirContato(selectedAd)}
                className="btn-primary w-full justify-center py-2 text-[10px] font-bold mt-2 gap-1.5"
              >
                <MessageSquare size={12} /> Entrar em contato
              </button>
            </div>
          )}
        </div>
      </div>
    </SlidePanel>
  );

  const slidePublicar = (
    <SlidePanel
      eyebrow="Novo Anúncio"
      title={<>Publicar <span className="grad-text">Classificado</span></>}
      badges={[
        { icon: '✦', label: 'Anúncio Rápido' },
        { icon: '🔒', label: 'Apenas Moradores' },
        { icon: '⌘', label: 'Livre de Comissão' }
      ]}
    >
      {!user ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-4">
          <div className="w-12 h-12 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center text-white/30">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs mb-1">Acesso Restrito</h4>
            <p className="text-[10px] text-white/40 max-w-[220px] leading-relaxed">
              Apenas condôminos logados podem publicar anúncios comerciais no mural interno do Itaúna.
            </p>
          </div>
          <button onClick={() => navigate('/login')} className="btn-primary text-xs py-2 px-4 mt-1">
            Fazer login
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreateAd} className="flex flex-col gap-3 py-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Título do Produto</label>
              <input
                type="text" className="input" placeholder="Ex: Bicicleta Caloi..."
                value={formTitle} onChange={e => setFormTitle(e.target.value)} required
              />
            </div>

            <div>
              <label className="input-label text-[11px]">Preço / Valor</label>
              <input
                type="text" className="input" placeholder="Ex: R$ 800 ou A combinar"
                value={formPrice} onChange={e => setFormPrice(e.target.value)} required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Categoria</label>
              <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                {CATEGORIES.slice(1).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label text-[11px]">Contato / WhatsApp</label>
              <input
                type="text" className="input" placeholder="Ex: (43) 99999-0000"
                value={formPhone} onChange={e => setFormPhone(maskPhone(e.target.value))} required
              />
            </div>
          </div>

          <div>
            <label className="input-label text-[11px]">Descrição Detalhada</label>
            <textarea
              className="input h-14 resize-none py-1.5"
              placeholder="Descreva o produto, conservação e formas de entrega para os vizinhos..."
              value={formDesc} onChange={e => setFormDesc(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1"
            disabled={submitting}
          >
            {submitting
              ? <><Loader2 size={13} className="animate-spin" /> Publicando...</>
              : '✓ Anunciar na Vitrine do Condomínio'
            }
          </button>
        </form>
      )}
    </SlidePanel>
  );

  const meusAtivos = useMemo(() => meusAds.filter(a => a.is_active).length, [meusAds]);

  const slideMeusAnuncios = (
    <SlidePanel
      eyebrow="Minha Conta"
      title={<>Meus <span className="grad-text">Anúncios</span></>}
      badges={[
        { icon: '📦', label: `${meusAtivos} ativo${meusAtivos !== 1 ? 's' : ''}` },
        { icon: '🔒', label: 'Somente você' },
        { icon: '⌘', label: 'Gerencie aqui' },
      ]}
    >
      <div className="flex flex-col h-full gap-3 py-1">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-4">
            <Lock size={20} className="text-white/30" />
            <p className="text-[10px] text-white/40">Faça login para ver seus anúncios.</p>
          </div>
        ) : loadingMeus ? (
          <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs">
            <Loader2 size={14} className="animate-spin" /> Carregando seus anúncios...
          </div>
        ) : meusAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-6">
            <Package size={28} className="text-white/20" />
            <p className="text-xs text-white/40">Você ainda não publicou nenhum anúncio.</p>
            <button
              className="btn-primary text-xs py-1.5 px-4 gap-1"
              onClick={() => { gotoSlide(1); }}
            >
              <Plus size={12} /> Publicar agora
            </button>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {meusAds.map(ad => (
              <div key={ad.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/3 border border-white/5 text-[11px]"
                style={{ opacity: ad.is_active ? 1 : 0.5 }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Tag size={12} className="text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`badge text-[8px] py-0 px-1 ${ad.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {ad.is_active ? 'Ativo' : 'Removido'}
                    </span>
                    <span className="text-[9px] text-white/35">{ad.category}</span>
                  </div>
                  <p className="font-bold text-white truncate leading-none mb-0.5">{ad.title}</p>
                  <p className="text-[9.5px] text-cyan font-bold">{ad.price}</p>
                  <p className="text-[9px] text-white/35 mt-0.5">
                    {new Date(ad.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {ad.is_active && (
                  <button
                    onClick={() => setConfirmRemoveId(ad.id)}
                    disabled={removingId === ad.id}
                    className="w-7 h-7 rounded-lg bg-red/10 hover:bg-red/20 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5"
                    title="Remover da vitrine"
                  >
                    {removingId === ad.id
                      ? <Loader2 size={11} className="animate-spin text-red" />
                      : <Trash2 size={11} className="text-red" />
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SlidePanel>
  );

  const slides3D: SlideItem[] = [
    {
      key: 'classificados-vitrine',
      label: 'Vitrine',
      content: slideVitrine
    },
    {
      key: 'classificados-secundario',
      label: 'Anunciar',
      content: slidePublicar
    },
    {
      key: 'classificados-meus',
      label: `Meus${meusAtivos > 0 ? ` (${meusAtivos})` : ''}`,
      content: slideMeusAnuncios
    }
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides3D} />

      {/* Modal de contato */}
      {contactAd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={e => { if (e.target === e.currentTarget) setContactAd(null); }}>
          <div className="rounded-2xl w-full max-w-sm overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.99),rgba(7,16,28,.99))', border: '1px solid rgba(87,216,255,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.65)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Entrar em contato</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }} className="truncate max-w-[220px]">{contactAd.title}</p>
              </div>
              <button onClick={() => setContactAd(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <X size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
            </div>

            <form onSubmit={enviarContato} className="flex flex-col gap-3 p-5">
              {/* Nome */}
              <div className="relative">
                <User size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input
                  type="text" className="input pl-9 text-xs" placeholder="Nome *"
                  value={contactNome} onChange={e => setContactNome(e.target.value)} required
                />
              </div>

              {/* Telefone */}
              <div className="relative">
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.95rem', lineHeight: 1 }}>🇧🇷</span>
                <input
                  type="tel" className="input pl-9 text-xs" placeholder="Telefone / WhatsApp *"
                  value={contactTel} onChange={e => setContactTel(maskPhone(e.target.value))} required
                />
              </div>

              {/* E-mail */}
              <div className="relative">
                <Mail size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input
                  type="email" className="input pl-9 text-xs" placeholder="E-mail (opcional)"
                  value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                />
              </div>

              {/* Mensagem */}
              <textarea
                className="input text-xs resize-none"
                rows={3}
                placeholder="Sua mensagem..."
                value={contactMsg}
                onChange={e => setContactMsg(e.target.value)}
              />

              {/* Aviso */}
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                Ao enviar, você será redirecionado ao WhatsApp com sua mensagem formatada para o anunciante.
              </p>

              <button type="submit" disabled={contactSending}
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5">
                {contactSending
                  ? <><Loader2 size={13} className="animate-spin" /> Enviando...</>
                  : <><MessageSquare size={13} /> Enviar mensagem</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de remoção */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl p-5 max-w-xs w-full space-y-4"
            style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Trash2 className="w-5 h-5" style={{ color: '#ef4444' }} />
              </div>
              <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Remover Anúncio?</h4>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                O anúncio será removido da vitrine permanentemente.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRemoveId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancelar
              </button>
              <button onClick={() => handleRemoveAd(confirmRemoveId)}
                className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
