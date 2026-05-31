import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { DollarSign, Plus, TrendingDown, Wallet, Search, RefreshCw, TrendingUp, CheckCircle2, Loader2, Calendar, Home, AlertTriangle, Eye, LockKeyhole } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, formatDate } from '../../utils/format';
import { gotoSlide } from '../../utils/format';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchFinances, fetchFinanceSummary, fetchFinanceTrend, insertFinance, updateFinanceStatus, fetchUnitByNumber, type DbFinance, type DbUnit } from '../../lib/supabase-queries';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';
const BLUE   = '#5a84ff';

const CATEGORIES = [
  'Despesas com Pessoal', 'Encargos Sociais', 'Despesas Administrativas',
  'Manutenção', 'Consumo Faturado', 'Material de Consumo',
  'Seguros Obrigatórios', 'Custas Advocatícias', 'Aquisição de Bens',
  'Benfeitorias / Reformas', 'Reparos e Consertos', 'Serviços Terceirizados',
  'Rateio Individual', 'Fundo de Reserva', 'Fundo de Férias / 13º', 'Despesas Bancárias',
];

const TODAY = new Date().toISOString().slice(0, 10);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 bg-[#0d1423]/95 border border-cyan/20 rounded-xl shadow-2xl backdrop-blur-md">
      <p className="text-[10px] text-white/40 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs font-bold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

/* ── Visão morador ─────────────────────────────────────────────── */
const nextDueDate = () => {
  const d = new Date();
  d.setDate(10);
  if (d <= new Date()) d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('pt-BR');
};

const FinanceiroMorador = () => {
  const { user } = useAuth();
  const [unit, setUnit] = useState<DbUnit | null>(null);
  const [rateios, setRateios] = useState<DbFinance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.unit_number) { setLoading(false); return; }
    Promise.all([
      fetchUnitByNumber(user.unit_number),
      fetchFinances({ category: 'Rateio Individual', limit: 24 }),
    ]).then(([u, fins]) => {
      setUnit(u);
      setRateios(fins);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const statusColor = unit?.status === 'regular' ? GREEN : unit?.status === 'inadimplente' ? RED : YELLOW;
  const statusLabel = unit?.status === 'regular' ? 'Em dia' : unit?.status === 'inadimplente' ? 'Inadimplente' : 'Suspenso';

  const slideSituacao: SlideItem = {
    key: 'morador-situacao',
    label: 'Minha Situação',
    content: (
      <SlidePanel
        eyebrow="Portal Financeiro"
        title={<>Minha <span className="grad-text">Situação Financeira</span></>}
        badges={[
          { icon: '🏡', label: `Chácara ${user?.unit_number ?? '—'}` },
          { icon: '📅', label: 'Vencimento dia 10' },
          { icon: '🔒', label: 'Dados protegidos' },
        ]}
      >
        <div className="flex flex-col h-full gap-4">
          {loading ? (
            <div className="flex items-center justify-center flex-1 gap-2 text-white/40 text-xs">
              <Loader2 size={16} className="animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard label="Status" value={loading ? '...' : statusLabel} icon={unit?.status === 'regular' ? CheckCircle2 : AlertTriangle} iconColor={statusColor} iconBg={`${statusColor}18`} />
                <StatCard label="Próx. Vencimento" value={nextDueDate()} icon={Calendar} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
                <StatCard label="Taxa Mensal" value={formatCurrency(unit?.monthly_fee ?? 0)} icon={DollarSign} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
                <StatCard label="Saldo" value={formatCurrency(Math.abs(unit?.balance ?? 0))} icon={(unit?.balance ?? 0) >= 0 ? Wallet : TrendingDown} iconColor={(unit?.balance ?? 0) >= 0 ? GREEN : RED} iconBg={`${(unit?.balance ?? 0) >= 0 ? GREEN : RED}18`} />
              </div>

              <div className="card p-4 space-y-2 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Home className="w-4 h-4" style={{ color: CYAN }} />
                  <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>Detalhes da Chácara</h4>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Número', value: unit?.unit_number ? `Chácara ${unit.unit_number}` : '—' },
                    { label: 'Proprietário', value: unit?.owner_name ?? '—' },
                    { label: 'Área', value: unit?.area_m2 ? `${unit.area_m2.toLocaleString('pt-BR')} m²` : '—' },
                    { label: 'Situação', value: statusLabel },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-white/4">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/25 pt-1">Para pagamento via Pix ou boleto, acesse a seção Chácaras.</p>
              </div>
            </>
          )}
        </div>
      </SlidePanel>
    ),
  };

  const slideRateios: SlideItem = {
    key: 'morador-rateios',
    label: 'Meus Rateios',
    content: (
      <SlidePanel
        eyebrow="Histórico de Rateios"
        title={<>Rateios <span className="grad-text">Aprovados</span></>}
        badges={[
          { icon: '📋', label: 'Histórico pessoal' },
          { icon: '◈', label: 'Últimas cobranças' },
        ]}
      >
        <div className="space-y-1.5 overflow-y-auto max-h-[340px] pr-1">
          {loading ? (
            <p className="text-center text-white/30 text-xs py-8">Carregando rateios...</p>
          ) : rateios.length === 0 ? (
            <p className="text-center text-white/30 text-xs py-8">Nenhum rateio lançado ainda.</p>
          ) : rateios.map(f => {
            const statusColor = f.status === 'pago' ? GREEN : f.status === 'vencido' ? RED : YELLOW;
            const statusLabel = f.status === 'pago' ? 'Pago' : f.status === 'vencido' ? 'Vencido' : 'Pendente';
            return (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5 text-[11px]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(87,216,255,0.08)' }}>
                  <DollarSign size={13} style={{ color: CYAN }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white leading-none mb-1 truncate">{f.description}</p>
                  <div className="flex items-center gap-1.5 text-[9.5px] text-white/40">
                    <span>{formatDate(f.due_date)}</span>
                    <span className="font-bold" style={{ color: statusColor }}>• {statusLabel}</span>
                  </div>
                </div>
                <span className="font-extrabold flex-shrink-0" style={{ color: CYAN }}>
                  {formatCurrency(f.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </SlidePanel>
    ),
  };

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={[slideSituacao, slideRateios]} />
    </div>
  );
};

/* ── Visão gestor ───────────────────────────────────────────────── */
const FinanceiroGestor = () => {
  const { user } = useAuth();

  // Filtros
  const [filter, setFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const PAGE_SIZE = 30;

  // Dados
  const [lancamentos, setLancamentos] = useState<DbFinance[]>([]);
  const [summary, setSummary] = useState({ totalDespesas: 0, totalPendentes: 0, totalGeral: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [chartData, setChartData] = useState<{ mes: string; receitas: number; despesas: number }[]>([]);

  // Estados do Formulário Inline
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'receita' | 'despesa'>('despesa');
  const [formStatus, setFormStatus] = useState<'pago' | 'pendente'>('pendente');
  const [formCategory, setFormCategory] = useState(CATEGORIES[3]);
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState(TODAY);
  const [submitting, setSubmitting] = useState(false);

  // Parâmetros dos filtros server-side
  const filterParams = useCallback(() => ({
    referenceMonth: selectedMonth,
    type:     filter !== 'todos' ? filter : undefined,
    category: selectedCategory || undefined,
    search:   searchTerm.trim() || undefined,
  }), [selectedMonth, filter, selectedCategory, searchTerm]);

  // Carga inicial / reset (quando filtros mudam)
  const loadLancamentos = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOffset(0);
    try {
      const [data, sum] = await Promise.all([
        fetchFinances({ ...filterParams(), limit: PAGE_SIZE, offset: 0 }),
        fetchFinanceSummary(selectedMonth),
      ]);
      setLancamentos(data);
      setSummary(sum);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, filterParams]);

  useEffect(() => { loadLancamentos(); }, [loadLancamentos]);

  // Carga incremental — "Carregar mais"
  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await fetchFinances({ ...filterParams(), limit: PAGE_SIZE, offset: nextOffset });
      setLancamentos(prev => [...prev, ...data]);
      setOffset(nextOffset);
      setHasMore(data.length === PAGE_SIZE);
    } catch { toast.error('Erro ao carregar mais.'); }
    finally { setLoadingMore(false); }
  };

  // Gráfico: carrega uma única vez (histórico real de receitas vs despesas por mês)
  useEffect(() => {
    fetchFinanceTrend().then(setChartData).catch(() => {});
  }, []);

  // Filtragem já é server-side — "filtered" é apenas o estado atual
  const filtered = lancamentos;

  const handleCreateFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim() || !formAmount.trim()) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    const amt = Number(formAmount.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) {
      toast.error('Valor inválido. Use o formato: 1850.00');
      return;
    }
    setSubmitting(true);
    try {
      await insertFinance({
        description:     formDesc.trim(),
        category:        formCategory,
        amount:          amt,
        type:            formType,
        status:          formStatus,
        due_date:        formDueDate,
        reference_month: formDueDate.slice(0, 7), // deriva do vencimento
        created_by:      user!.id,
      });

      setFormDesc(''); setFormAmount(''); setFormDueDate(TODAY);
      toast.success('Lançamento registrado com sucesso!');

      // Recarrega dados do mês atual para refletir o novo lançamento
      await loadLancamentos();

      gotoSlide(1); // vai para Lançamentos
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao registrar lançamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateFinanceStatus(id, 'pago');
      setLancamentos(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'pago', payment_date: new Date().toISOString().slice(0, 10) } : f
      ));
      // Recarrega KPIs do resumo
      fetchFinanceSummary(selectedMonth).then(setSummary).catch(() => {});
      toast.success('Lançamento marcado como pago!');
    } catch { toast.error('Erro ao atualizar status.'); }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }).toUpperCase() };
  });

  const slideResumo = (
    <SlidePanel
      eyebrow="Painel Financeiro"
      title={<>Prestação de <span className="grad-text">Contas Itaúna</span></>}
      badges={[
        { icon: '💰', label: 'Rateio Mensal' },
        { icon: '📊', label: 'Evolução Caixa' },
        { icon: '⚡', label: 'Sincronizado Supabase' }
      ]}
      actions={
        <div className="flex gap-1.5 mr-2">
          <select
            className="input py-1 px-2.5 text-[10px] bg-white/5 border border-white/10 text-white rounded-xl"
            style={{ width: 'auto' }}
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button onClick={loadLancamentos} className="btn btn-ghost p-1.5 rounded-xl border border-white/8 bg-white/4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Total Geral" value={loading ? '...' : formatCurrency(summary.totalGeral)} icon={DollarSign} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
          <StatCard label="Despesas Pagas" value={loading ? '...' : formatCurrency(summary.totalDespesas)} icon={TrendingDown} iconColor={RED} iconBg="rgba(239,68,68,0.08)" />
          <StatCard label="Pendente" value={loading ? '...' : formatCurrency(summary.totalPendentes)} icon={Wallet} iconColor={YELLOW} iconBg="rgba(245,158,11,0.08)" />
        </div>

        {/* Gráfico evolution */}
        <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 flex-1 flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-white text-xs font-bold">Evolução Quinzenal</h3>
              <p className="text-[10px] text-white/30">Valores em reais</p>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-white/40">
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} /><span>Receitas (Rateio)</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} /><span>Despesas (Rateio)</span></div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RED} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="receitas" stroke={GREEN} strokeWidth={1.5} fill="url(#colorReceitas)" name="Receitas" />
                <Area type="monotone" dataKey="despesas" stroke={RED} strokeWidth={1.5} fill="url(#colorDespesas)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </SlidePanel>
  );

  const slideMovimentacoes = (
    <SlidePanel
      eyebrow="Tabela Geral"
      title={<>Movimentações <span className="grad-text">do Mês</span></>}
      badges={[
        { icon: '📋', label: 'Auditoria Interna' },
        { icon: '◈', label: 'Rateio Chácaras' },
        { icon: '⌘', label: 'Balanço Conciliado' }
      ]}
      actions={
        <button
          onClick={() => {
            gotoSlide(2);
          }}
          className="btn-primary py-1.5 px-3 text-xs gap-1"
        >
          <Plus size={13} /> Lançar
        </button>
      }
    >
      <div className="flex flex-col h-full gap-3 py-1">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text" className="input pl-8 py-1.5 text-xs"
              placeholder="Buscar descrição..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 p-0.5 rounded-lg bg-white/5 w-fit self-end overflow-x-auto">
            {(['todos', 'receita', 'despesa'] as const).map(f => (
              <button
                key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded text-[10px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                  filter === f ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'receita' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Lançamentos Compacta e Rolável */}
        <div className="space-y-1.5 overflow-y-auto max-h-[240px] pr-1 flex-1">
          {loading ? (
            <p className="text-center text-white/30 text-xs py-8">Carregando lançamentos...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/30 text-xs py-8">Nenhum lançamento no mês selecionado.</p>
          ) : (
            filtered.map(f => {
              const isPending = f.status === 'pendente' || f.status === 'vencido';
              const statusColor = f.status === 'pago' ? GREEN : f.status === 'vencido' ? RED : YELLOW;
              const statusLabel = f.status === 'pago' ? 'Pago' : f.status === 'vencido' ? 'Vencido' : 'Pendente';
              return (
              <div key={f.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all text-[11px]"
                style={{ borderColor: isPending ? `${statusColor}20` : undefined }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: f.type === 'receita' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                  {f.type === 'receita'
                    ? <TrendingUp size={14} className="text-green" />
                    : <TrendingDown size={14} className="text-red" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white leading-none mb-1 truncate">{f.description}</p>
                  <div className="flex items-center gap-1.5 text-[9.5px] text-white/40">
                    <span>{f.category}</span>
                    <span>•</span>
                    <span>{formatDate(f.due_date)}</span>
                    <span className="font-bold" style={{ color: statusColor }}>• {statusLabel}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <span className="font-extrabold" style={{ color: f.type === 'receita' ? GREEN : RED }}>
                    {f.type === 'receita' ? '+' : '-'}{formatCurrency(f.amount)}
                  </span>
                  {isPending && (
                    <button
                      onClick={() => handleMarkAsPaid(f.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.12)', color: GREEN, border: '1px solid rgba(16,185,129,0.25)' }}
                      title="Marcar como pago"
                    >
                      <CheckCircle2 size={10} /> Pagar
                    </button>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-1.5 rounded-xl text-[10px] font-bold text-white/50 hover:text-white border border-white/8 hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.025)' }}
          >
            {loadingMore
              ? <><Loader2 size={11} className="animate-spin" /> Carregando...</>
              : 'Carregar mais lançamentos'}
          </button>
        )}
      </div>
    </SlidePanel>
  );

  const slideRegistrar = (
    <SlidePanel
      eyebrow="Novo Lançamento"
      title={<>Lançar <span className="grad-text">Receita ou Despesa</span></>}
      badges={[
        { icon: '✦', label: 'Lançamento Rápido' },
        { icon: '🔒', label: 'Balanço Conciliado' },
        { icon: '⌘', label: 'Auditoria Garantida' }
      ]}
    >
      <form onSubmit={handleCreateFinance} className="flex flex-col gap-3.5 py-1 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label text-[11px]">Descrição do Lançamento</label>
            <input
              type="text" className="input" placeholder="Ex: Manutenção da bomba d'água"
              value={formDesc} onChange={e => setFormDesc(e.target.value)} required
            />
          </div>

          <div>
            <label className="input-label text-[11px]">Valor (R$)</label>
            <input
              type="text" className="input" placeholder="Ex: 1850.00"
              value={formAmount} onChange={e => setFormAmount(e.target.value)} required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label text-[11px]">Tipo</label>
            <select className="input" value={formType} onChange={e => setFormType(e.target.value as 'receita' | 'despesa')}>
              <option value="despesa">🚨 Despesa (Saída)</option>
              <option value="receita">🟢 Receita (Entrada)</option>
            </select>
          </div>

          <div>
            <label className="input-label text-[11px]">Status</label>
            <select className="input" value={formStatus} onChange={e => setFormStatus(e.target.value as 'pago' | 'pendente')}>
              <option value="pendente">⏳ Pendente</option>
              <option value="pago">✅ Pago</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label text-[11px]">Categoria</label>
            <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label text-[11px]">Vencimento</label>
            <input
              type="date" className="input"
              value={formDueDate} onChange={e => setFormDueDate(e.target.value)} required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1"
          disabled={submitting}
        >
          {submitting
          ? <><span className="animate-spin inline-block mr-1">⏳</span> Salvando no banco...</>
          : '✓ Confirmar e Salvar Lançamento Financeiro'
        }
        </button>
      </form>
    </SlidePanel>
  );

  const slides3D: SlideItem[] = [
    {
      key: 'financeiro-resumo',
      label: 'Painel',
      content: slideResumo
    },
    {
      key: 'financeiro-movimentacoes',
      label: 'Lançamentos',
      content: slideMovimentacoes
    },
    {
      key: 'financeiro-registrar',
      label: 'Lançar',
      content: slideRegistrar
    }
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides3D} />
    </div>
  );
};

/* ── Roteador inteligente baseado na URL ─────────────────────────── */
export const Financeiro = () => {
  const { isGestor } = useAuth();
  const location = useLocation();
  const isGestaoMode = location.pathname === '/gestao-financeira';

  return (
    <div className="relative w-full h-full">
      {/* Indicador visual do modo (estado da arte) */}
      <div
        className="absolute top-0 left-0 right-0 h-1 z-40 transition-all duration-300"
        style={{
          background: isGestaoMode
            ? 'linear-gradient(90deg, rgba(239,68,68,0.6) 0%, rgba(239,68,68,0.3) 100%)'
            : 'linear-gradient(90deg, rgba(16,185,129,0.6) 0%, rgba(16,185,129,0.3) 100%)',
        }}
      />

      {/* Badge de modo flutuante (canto superior direito) */}
      <div
        className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300"
        style={{
          background: isGestaoMode
            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))'
            : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
          border: `1px solid ${isGestaoMode ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {isGestaoMode ? (
          <>
            <LockKeyhole size={11} style={{ color: '#ef4444' }} />
            <span style={{ color: '#fca5a5' }}>GESTÃO FINANCEIRA</span>
          </>
        ) : (
          <>
            <Eye size={11} style={{ color: '#6ee7b7' }} />
            <span style={{ color: '#a7f3d0' }}>TRANSPARÊNCIA</span>
          </>
        )}
      </div>

      {/* Componente renderizado com transição suave */}
      <div
        style={{
          animation: 'fadeIn 0.3s ease-out forwards',
          opacity: 0,
        }}
      >
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        {isGestaoMode ? <FinanceiroGestor /> : <FinanceiroMorador />}
      </div>
    </div>
  );
};
