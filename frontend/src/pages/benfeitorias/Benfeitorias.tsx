import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HardHat, Loader2, Plus, X, Trash2, CheckCircle2,
  CalendarDays, Wallet, Hammer, ListChecks, CircleDashed, PlayCircle,
  FileDown, TrendingUp, PieChart,
} from 'lucide-react';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import { gotoSlide } from '../../utils/format';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  fetchBenfeitorias, fetchBenfeitoriaEtapas,
  insertBenfeitoria, updateBenfeitoria, deleteBenfeitoria,
  insertBenfeitoriaEtapa, updateBenfeitoriaEtapa, deleteBenfeitoriaEtapa,
  type DbBenfeitoria, type DbBenfeitoriaEtapa,
} from '@/lib/supabase-queries';

const CYAN = '#57d8ff';
const GREEN = '#10b981';
const YELLOW = '#f59e0b';
const BLUE = '#5a84ff';
const RED = '#ef4444';
const TODAY = new Date().toISOString().slice(0, 10);

const CATEGORIA = {
  infraestrutura: { emoji: '🏗️', label: 'Infraestrutura' },
  lazer:          { emoji: '🏖️', label: 'Lazer' },
  seguranca:      { emoji: '🛡️', label: 'Segurança' },
  paisagismo:     { emoji: '🌿', label: 'Paisagismo' },
  manutencao:     { emoji: '🔧', label: 'Manutenção' },
  outros:         { emoji: '📦', label: 'Outros' },
};

const STATUS = {
  planejada:    { label: 'Planejada',    color: BLUE,   bg: 'rgba(90,132,255,0.12)' },
  em_andamento: { label: 'Em andamento', color: CYAN,   bg: 'rgba(87,216,255,0.12)' },
  pausada:      { label: 'Pausada',      color: YELLOW, bg: 'rgba(245,158,11,0.12)' },
  concluida:    { label: 'Concluída',    color: GREEN,  bg: 'rgba(16,185,129,0.12)' },
};

const ETAPA_STATUS = {
  pendente:     { label: 'Pendente',     color: 'rgba(255,255,255,0.4)', Icon: CircleDashed },
  em_andamento: { label: 'Em andamento', color: CYAN,                    Icon: PlayCircle },
  concluida:    { label: 'Concluída',    color: GREEN,                   Icon: CheckCircle2 },
};

const fmtMoney = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

export const Benfeitorias = () => {
  const { isGestor } = useAuth();

  const [obras, setObras] = useState<DbBenfeitoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DbBenfeitoria | null>(null);
  const [etapas, setEtapas] = useState<DbBenfeitoriaEtapa[]>([]);
  const [etapasLoading, setEtapasLoading] = useState(false);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Form nova obra (gestor)
  const [fTitulo, setFTitulo] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fCat, setFCat] = useState<DbBenfeitoria['categoria']>('infraestrutura');
  const [fResp, setFResp] = useState('');
  const [fOrc, setFOrc] = useState('');
  const [fInicio, setFInicio] = useState(TODAY);
  const [fPrev, setFPrev] = useState('');
  const [saving, setSaving] = useState(false);
  // Fases/etapas iniciais no cadastro: { titulo, percentual }
  const [fases, setFases] = useState<{ titulo: string; percentual: string }[]>([{ titulo: '', percentual: '' }]);

  // Nova etapa (gestor, dentro do detalhe)
  const [novaEtapa, setNovaEtapa] = useState('');
  const [novaEtapaPct, setNovaEtapaPct] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchBenfeitorias()
      .then(setObras)
      .catch(() => toast.error('Erro ao carregar benfeitorias.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: morador acompanha avanços ao vivo
  useEffect(() => {
    chRef.current = supabase
      .channel('benfeitorias-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'benfeitorias' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'benfeitoria_etapas' }, payload => {
        const row = (payload.new ?? payload.old) as any;
        if (selected && row?.benfeitoria_id === selected.id) loadEtapas(selected.id);
      })
      .subscribe();
    return () => { chRef.current?.unsubscribe(); };
  }, [load, selected]);

  const loadEtapas = async (id: string) => {
    setEtapasLoading(true);
    try { setEtapas(await fetchBenfeitoriaEtapas(id)); }
    catch { toast.error('Erro ao carregar etapas.'); }
    finally { setEtapasLoading(false); }
  };

  // Progresso = soma dos percentuais das etapas concluídas (limitado a 100)
  const calcProgresso = (lista: DbBenfeitoriaEtapa[]) =>
    Math.min(100, lista.filter(e => e.status === 'concluida').reduce((s, e) => s + (e.percentual ?? 0), 0));

  const abrirDetalhe = (o: DbBenfeitoria) => {
    setSelected(o);
    setNovaEtapa('');
    loadEtapas(o.id);
  };

  const emAndamento = obras.filter(o => o.status === 'em_andamento').length;
  const concluidas  = obras.filter(o => o.status === 'concluida').length;
  const planejadas  = obras.filter(o => o.status === 'planejada').length;
  const orcamentoTotal = obras.reduce((s, o) => s + (o.orcamento ?? 0), 0);
  const progressoMedio = obras.length ? Math.round(obras.reduce((s, o) => s + o.progresso, 0) / obras.length) : 0;
  const porCategoria = (Object.keys(CATEGORIA) as (keyof typeof CATEGORIA)[])
    .map(k => ({ k, label: CATEGORIA[k].label, emoji: CATEGORIA[k].emoji, total: obras.filter(o => o.categoria === k).length }))
    .filter(c => c.total > 0);

  const somaFases = fases.reduce((s, f) => s + (parseInt(f.percentual) || 0), 0);

  const { user } = useAuth() as any; // full_name para autoria do PDF

  const exportarPDF = async () => {
    if (obras.length === 0) { toast.error('Nenhuma benfeitoria para exportar.'); return; }
    try {
      toast.loading('Gerando PDF...', { id: 'pdf-benf' });
      const { ReportBuilder, REPORT_COLORS, loadCondoLogo } = await import('@/lib/pdf-report');
      const logo = await loadCondoLogo();
      const rb = new ReportBuilder({
        title: 'Relatório de Benfeitorias',
        subtitle: 'Obras e melhorias — prestação de contas',
        period: `Posição em ${new Date().toLocaleDateString('pt-BR')}`,
        generatedBy: user?.full_name,
        logo,
      });
      rb.kpiRow([
        { label: 'Obras', value: String(obras.length), accent: REPORT_COLORS.cyan },
        { label: 'Em andamento', value: String(emAndamento), accent: REPORT_COLORS.cyan },
        { label: 'Concluídas', value: String(concluidas), accent: REPORT_COLORS.green },
        { label: 'Progresso médio', value: `${progressoMedio}%`, accent: REPORT_COLORS.blue },
      ]);
      rb.paragraph(`Orçamento total previsto: ${orcamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
      rb.sectionTitle('Benfeitorias');
      rb.table(
        ['Título', 'Categoria', 'Status', 'Progresso', 'Orçamento', 'Previsão'],
        obras.map(o => [
          o.titulo,
          CATEGORIA[o.categoria].label,
          STATUS[o.status].label,
          `${o.progresso}%`,
          fmtMoney(o.orcamento),
          fmtDate(o.data_prevista),
        ]),
        [3, 4],
      );
      rb.save(`benfeitorias-${TODAY}.pdf`);
      toast.success('Relatório PDF gerado!', { id: 'pdf-benf' });
    } catch {
      toast.error('Erro ao gerar o PDF.', { id: 'pdf-benf' });
    }
  };

  /* ── Gestor: criar obra ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitulo.trim()) { toast.error('Informe o título da obra.'); return; }
    setSaving(true);
    try {
      const nova = await insertBenfeitoria({
        titulo: fTitulo.trim(),
        descricao: fDesc.trim() || null,
        categoria: fCat,
        status: 'planejada',
        responsavel: fResp.trim() || null,
        orcamento: fOrc ? Number(fOrc.replace(',', '.')) : null,
        progresso: 0,
        data_inicio: fInicio || null,
        data_prevista: fPrev || null,
        data_conclusao: null,
        created_by: null,
      });
      // Grava as fases/etapas informadas no cadastro (com percentual)
      const fasesValidas = fases.filter(f => f.titulo.trim());
      for (let i = 0; i < fasesValidas.length; i++) {
        const f = fasesValidas[i];
        try {
          await insertBenfeitoriaEtapa({
            benfeitoria_id: nova.id,
            titulo: f.titulo.trim(),
            descricao: null,
            status: 'pendente',
            percentual: Math.max(0, Math.min(100, parseInt(f.percentual) || 0)),
            ordem: i,
          });
        } catch { /* segue para as demais */ }
      }
      setObras(prev => [nova, ...prev]);
      setFTitulo(''); setFDesc(''); setFResp(''); setFOrc(''); setFPrev('');
      setFases([{ titulo: '', percentual: '' }]);
      toast.success('Benfeitoria cadastrada!');
      gotoSlide(0);
    } catch { toast.error('Erro ao cadastrar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (o: DbBenfeitoria) => {
    try {
      await deleteBenfeitoria(o.id);
      setObras(prev => prev.filter(x => x.id !== o.id));
      setSelected(null);
      toast.success('Benfeitoria removida.');
    } catch { toast.error('Erro ao remover.'); }
  };

  const patchObra = async (patch: Partial<DbBenfeitoria>) => {
    if (!selected) return;
    try {
      await updateBenfeitoria(selected.id, patch);
      setObras(prev => prev.map(o => o.id === selected.id ? { ...o, ...patch } : o));
      setSelected(s => s ? { ...s, ...patch } : s);
    } catch { toast.error('Erro ao atualizar.'); }
  };

  /* ── Gestor: etapas ── */
  // Persiste o progresso recalculado a partir das etapas concluídas
  const sincronizarProgresso = async (lista: DbBenfeitoriaEtapa[]) => {
    if (!selected) return;
    const prog = calcProgresso(lista);
    if (prog === selected.progresso) return;
    try {
      await updateBenfeitoria(selected.id, { progresso: prog });
      setObras(prev => prev.map(o => o.id === selected.id ? { ...o, progresso: prog } : o));
      setSelected(s => s ? { ...s, progresso: prog } : s);
    } catch { /* silencioso */ }
  };

  const handleAddEtapa = async () => {
    if (!selected || !novaEtapa.trim()) return;
    try {
      const nova = await insertBenfeitoriaEtapa({
        benfeitoria_id: selected.id,
        titulo: novaEtapa.trim(),
        descricao: null,
        status: 'pendente',
        percentual: Math.max(0, Math.min(100, parseInt(novaEtapaPct) || 0)),
        ordem: etapas.length,
      });
      setEtapas(prev => [...prev, nova]);
      setNovaEtapa(''); setNovaEtapaPct('');
    } catch { toast.error('Erro ao adicionar etapa.'); }
  };

  const cycleEtapa = async (et: DbBenfeitoriaEtapa) => {
    const next = et.status === 'pendente' ? 'em_andamento' : et.status === 'em_andamento' ? 'concluida' : 'pendente';
    try {
      await updateBenfeitoriaEtapa(et.id, {
        status: next,
        concluida_at: next === 'concluida' ? new Date().toISOString() : null,
      });
      const novaLista = etapas.map(e => e.id === et.id ? { ...e, status: next as DbBenfeitoriaEtapa['status'], concluida_at: next === 'concluida' ? new Date().toISOString() : null } : e);
      setEtapas(novaLista);
      await sincronizarProgresso(novaLista);
    } catch { toast.error('Erro ao atualizar etapa.'); }
  };

  const handleDeleteEtapa = async (id: string) => {
    try {
      await deleteBenfeitoriaEtapa(id);
      const novaLista = etapas.filter(e => e.id !== id);
      setEtapas(novaLista);
      await sincronizarProgresso(novaLista);
    } catch { toast.error('Erro ao remover etapa.'); }
  };

  const slides: SlideItem[] = [
    {
      key: 'benf-lista',
      label: 'Acompanhamento',
      content: (
        <SlidePanel
          eyebrow="Obras & Benfeitorias"
          title={<>Acompanhe as <span className="grad-text">Obras</span></>}
          badges={[
            { icon: '🏗️', label: `${emAndamento} em andamento` },
            { icon: '✅', label: `${concluidas} concluídas` },
            { icon: '🔍', label: 'Transparência total' },
          ]}
          actions={
            <div className="flex gap-1.5">
              <button onClick={exportarPDF} title="Exportar relatório em PDF" className="py-1.5 px-3 text-xs gap-1 flex items-center rounded-xl font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <FileDown size={13} /> PDF
              </button>
              {isGestor && (
                <button onClick={() => gotoSlide(2)} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
                  <Plus size={13} /> Nova
                </button>
              )}
            </div>
          }
        >
          <div className="flex flex-col h-full gap-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Em andamento" value={String(emAndamento)} icon={Hammer} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Concluídas" value={String(concluidas)} icon={CheckCircle2} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
              <StatCard label="Planejadas" value={String(planejadas)} icon={CalendarDays} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-white/30 text-xs"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
              ) : obras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <HardHat size={28} style={{ color: 'rgba(87,216,255,0.4)' }} />
                  <p className="text-white/30 text-xs">Nenhuma benfeitoria cadastrada.</p>
                </div>
              ) : obras.map(o => {
                const cat = CATEGORIA[o.categoria];
                const st = STATUS[o.status];
                return (
                  <button key={o.id} onClick={() => abrirDetalhe(o)}
                    className="w-full text-left rounded-2xl p-3 cursor-pointer transition-all hover:bg-white/5"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: 'rgba(255,255,255,0.05)' }}>{cat.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.82rem' }} className="truncate">{o.titulo}</p>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: st.bg, color: st.color }}>{st.label.toUpperCase()}</span>
                        </div>
                        <p style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                          {cat.label}{o.responsavel ? ` · ${o.responsavel}` : ''}
                        </p>
                        {/* Barra de progresso */}
                        <div className="mt-2 flex items-center gap-2">
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${o.progresso}%`, background: `linear-gradient(90deg, ${st.color}, ${CYAN})`, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: st.color, minWidth: 32, textAlign: 'right' }}>{o.progresso}%</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SlidePanel>
      ),
    },

    {
      key: 'benf-painel',
      label: 'Painel',
      content: (
        <SlidePanel
          eyebrow="Gestão & Prestação de Contas"
          title={<>Painel de <span className="grad-text">Benfeitorias</span></>}
          badges={[
            { icon: '📊', label: `${obras.length} obras` },
            { icon: '💰', label: 'Orçamento total' },
            { icon: '📈', label: `${progressoMedio}% médio` },
          ]}
          actions={
            <button onClick={exportarPDF} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
              <FileDown size={13} /> PDF
            </button>
          }
        >
          <div className="flex flex-col h-full gap-3">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Orçamento total" value={orcamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} icon={Wallet} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Progresso médio" value={`${progressoMedio}%`} icon={TrendingUp} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
              <StatCard label="Em andamento" value={String(emAndamento)} icon={Hammer} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
              <StatCard label="Concluídas" value={String(concluidas)} icon={CheckCircle2} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
            </div>

            {/* Distribuição por status */}
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Por situação</p>
              <div className="space-y-2">
                {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map(k => {
                  const total = obras.filter(o => o.status === k).length;
                  const pct = obras.length ? Math.round(total / obras.length * 100) : 0;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: '0.7rem', color: '#fff' }}>{STATUS[k].label}</span>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>{total}</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: STATUS[k].color, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por categoria */}
            <div className="rounded-2xl p-3 flex-1 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                <PieChart size={11} style={{ display: 'inline', marginRight: 4 }} /> Por categoria
              </p>
              {porCategoria.length === 0 ? (
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Sem dados.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {porCategoria.map(c => (
                    <div key={c.k} className="flex items-center gap-2 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-base">{c.emoji}</span>
                      <div className="min-w-0">
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>{c.total}</p>
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }} className="truncate">{c.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SlidePanel>
      ),
    },

    ...(isGestor ? [{
      key: 'benf-nova',
      label: 'Nova Benfeitoria',
      content: (
        <SlidePanel
          eyebrow="Cadastro"
          title={<>Nova <span className="grad-text">Benfeitoria</span></>}
          badges={[{ icon: '🏗️', label: 'Obra ou melhoria' }, { icon: '📋', label: 'Com etapas' }]}
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-3 py-1 text-xs">
            <div>
              <label className="input-label text-[11px]">Título *</label>
              <input type="text" className="input" placeholder="Ex: Reforma da quadra" value={fTitulo} onChange={e => setFTitulo(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Descrição</label>
              <textarea className="input" rows={2} placeholder="Detalhes da obra..." value={fDesc} onChange={e => setFDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Categoria</label>
                <select className="input" value={fCat} onChange={e => setFCat(e.target.value as any)}>
                  {Object.entries(CATEGORIA).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label text-[11px]">Responsável / Empresa</label>
                <input type="text" className="input" placeholder="Ex: Construtora X" value={fResp} onChange={e => setFResp(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="input-label text-[11px]">Orçamento (R$)</label>
                <input type="tel" inputMode="decimal" className="input" placeholder="0,00" value={fOrc} onChange={e => setFOrc(e.target.value)} />
              </div>
              <div>
                <label className="input-label text-[11px]">Início</label>
                <input type="date" className="input" value={fInicio} onChange={e => setFInicio(e.target.value)} />
              </div>
              <div>
                <label className="input-label text-[11px]">Previsão</label>
                <input type="date" className="input" value={fPrev} onChange={e => setFPrev(e.target.value)} />
              </div>
            </div>
            {/* Fases / Etapas com percentual */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.15)' }}>
              <div className="flex items-center justify-between">
                <label className="input-label text-[11px] mb-0">Fases da obra (com % de cada)</label>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: somaFases === 100 ? GREEN : somaFases > 100 ? RED : YELLOW }}>
                  Soma: {somaFases}%
                </span>
              </div>
              {fases.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="text" className="input text-xs py-1.5 flex-1" placeholder={`Fase ${i + 1} (ex: Fundação)`}
                    value={f.titulo} onChange={e => setFases(prev => prev.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x))} />
                  <div className="relative" style={{ width: 70 }}>
                    <input type="tel" inputMode="numeric" className="input text-xs py-1.5 pr-5" placeholder="0"
                      value={f.percentual} onChange={e => setFases(prev => prev.map((x, j) => j === i ? { ...x, percentual: e.target.value.replace(/\D/g, '').slice(0, 3) } : x))} />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>%</span>
                  </div>
                  <button type="button" onClick={() => setFases(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : prev)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)' }}>
                    <X size={12} style={{ color: '#fca5a5' }} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setFases(prev => [...prev, { titulo: '', percentual: '' }])}
                className="w-full py-1.5 rounded-lg text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1" style={{ background: 'rgba(87,216,255,0.1)', color: CYAN, border: '1px dashed rgba(87,216,255,0.3)' }}>
                <Plus size={12} /> Adicionar fase
              </button>
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                O progresso da obra avança conforme as fases são concluídas (soma dos percentuais). Ideal somar 100%.
              </p>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Plus size={13} /> Cadastrar Benfeitoria</>}
            </button>
          </form>
        </SlidePanel>
      ),
    } as SlideItem] : []),
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />

      {/* ── Detalhe da obra (modal) ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={() => setSelected(null)}>
          <div className="rounded-3xl w-full max-w-md max-h-[88vh] overflow-y-auto"
            style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.99),rgba(7,16,28,.99))', border: '1px solid rgba(87,216,255,0.22)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 p-5 pb-3" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.99),rgba(7,16,28,.99))', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">{CATEGORIA[selected.categoria].emoji}</span>
                  <div className="min-w-0">
                    <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }} className="truncate">{selected.titulo}</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{CATEGORIA[selected.categoria].label}{selected.responsavel ? ` · ${selected.responsavel}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <X size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                </button>
              </div>

              {/* Progresso */}
              <div className="mt-3 flex items-center gap-2">
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${selected.progresso}%`, background: `linear-gradient(90deg, ${STATUS[selected.status].color}, ${CYAN})`, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: STATUS[selected.status].color }}>{selected.progresso}%</span>
              </div>
            </div>

            <div className="p-5 pt-3 space-y-4">
              {selected.descricao && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{selected.descricao}</p>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}><Wallet size={10} style={{ display: 'inline', marginRight: 3 }} />Orçamento</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{fmtMoney(selected.orcamento)}</p>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}><CalendarDays size={10} style={{ display: 'inline', marginRight: 3 }} />Previsão</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{fmtDate(selected.data_prevista)}</p>
                </div>
              </div>

              {/* Controles do gestor */}
              {isGestor && (
                <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.15)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="input-label text-[10px]">Status</label>
                      <select className="input text-xs py-1.5" value={selected.status} onChange={e => patchObra({ status: e.target.value as any, data_conclusao: e.target.value === 'concluida' ? TODAY : null })}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="input-label text-[10px]">Progresso: {selected.progresso}%</label>
                      <input type="range" min={0} max={100} step={5} value={selected.progresso}
                        onChange={e => patchObra({ progresso: Number(e.target.value) })} className="w-full mt-2" />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapas — linha do tempo */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  <ListChecks size={12} style={{ display: 'inline', marginRight: 4 }} /> Etapas da obra
                </p>
                {etapasLoading ? (
                  <div className="flex items-center gap-2 py-3 text-white/30 text-xs"><Loader2 size={13} className="animate-spin" /> Carregando...</div>
                ) : etapas.length === 0 ? (
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}>Nenhuma etapa registrada ainda.</p>
                ) : (
                  <div className="space-y-0">
                    {etapas.map((et, i) => {
                      const es = ETAPA_STATUS[et.status];
                      const last = i === etapas.length - 1;
                      return (
                        <div key={et.id} className="flex gap-2.5">
                          {/* Rail */}
                          <div className="flex flex-col items-center">
                            <button
                              onClick={() => isGestor && cycleEtapa(et)}
                              disabled={!isGestor}
                              className="flex items-center justify-center flex-shrink-0"
                              style={{ width: 24, height: 24, cursor: isGestor ? 'pointer' : 'default' }}
                              title={isGestor ? 'Clique para avançar o status' : es.label}>
                              <es.Icon size={18} style={{ color: es.color }} />
                            </button>
                            {!last && <div style={{ width: 2, flex: 1, minHeight: 16, background: 'rgba(255,255,255,0.1)' }} />}
                          </div>
                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-center justify-between gap-2">
                              <p style={{ fontSize: '0.76rem', fontWeight: 600, color: et.status === 'concluida' ? 'rgba(255,255,255,0.55)' : '#fff', textDecoration: et.status === 'concluida' ? 'line-through' : 'none' }}>
                                {et.titulo}
                                {et.percentual > 0 && <span style={{ marginLeft: 6, fontSize: '0.6rem', fontWeight: 800, color: CYAN, background: 'rgba(87,216,255,0.1)', padding: '1px 5px', borderRadius: 5 }}>{et.percentual}%</span>}
                              </p>
                              {isGestor && (
                                <button onClick={() => handleDeleteEtapa(et.id)} className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: 'rgba(239,68,68,0.08)' }}>
                                  <Trash2 size={10} style={{ color: '#fca5a5' }} />
                                </button>
                              )}
                            </div>
                            <p style={{ fontSize: '0.62rem', color: es.color }}>
                              {es.label}{et.concluida_at ? ` · ${new Date(et.concluida_at).toLocaleDateString('pt-BR')}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Gestor: adicionar etapa */}
                {isGestor && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" className="input text-xs py-1.5 flex-1" placeholder="Nova etapa..." value={novaEtapa}
                      onChange={e => setNovaEtapa(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEtapa(); } }} />
                    <div className="relative" style={{ width: 64 }}>
                      <input type="tel" inputMode="numeric" className="input text-xs py-1.5 pr-5" placeholder="0" value={novaEtapaPct}
                        onChange={e => setNovaEtapaPct(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                      <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>%</span>
                    </div>
                    <button onClick={handleAddEtapa} className="px-3 rounded-xl flex items-center cursor-pointer" style={{ background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.25)' }}>
                      <Plus size={14} style={{ color: CYAN }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Gestor: remover obra */}
              {isGestor && (
                <button onClick={() => handleDelete(selected)} className="w-full py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <Trash2 size={13} /> Remover benfeitoria
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
