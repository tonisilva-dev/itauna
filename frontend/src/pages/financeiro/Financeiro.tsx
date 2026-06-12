import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DollarSign, Plus, TrendingDown, Wallet, Search, RefreshCw, TrendingUp, CheckCircle2, Loader2, Calendar, Home, AlertTriangle, Eye, LockKeyhole, FileDown, CreditCard, ChevronDown } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, formatDate, gotoSlide, TODAY } from '../../utils/format';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchFinances, fetchFinanceSummary, fetchFinanceTrend, insertFinance, bulkInsertFinances, updateFinanceStatus, fetchUnitByNumber, type DbFinance, type DbUnit } from '../../lib/supabase-queries';
import { CobrancasSlide, MinhasCobrancasSlide } from './Cobrancas';
import { CATEGORIES } from './financeCategories';
import { downloadTemplate, parseFinanceFile, type FinanceRow } from '../../utils/financeImport';
import { useMemo } from 'react';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';
const BLUE   = '#5a84ff';


const DRE_GROUPS: { label: string; color: string; categories: readonly string[] }[] = [
  { label: 'Pessoal',            color: '#a855f7', categories: ['Despesas com Pessoal', 'Encargos Sociais', 'Fundo de Férias / 13º'] },
  { label: 'Administração',      color: BLUE,      categories: ['Despesas Administrativas', 'Despesas Bancárias', 'Custas Advocatícias', 'Seguros Obrigatórios'] },
  { label: 'Manutenção',         color: YELLOW,    categories: ['Manutenção', 'Reparos e Consertos', 'Serviços Terceirizados'] },
  { label: 'Consumo',            color: CYAN,      categories: ['Consumo Faturado', 'Material de Consumo'] },
  { label: 'Investimentos',      color: '#f97316', categories: ['Aquisição de Bens', 'Benfeitorias / Reformas'] },
  { label: 'Fundos & Provisões', color: '#6b7280', categories: ['Fundo de Reserva'] },
];

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

const DONUT_COLORS = [GREEN, RED, YELLOW, BLUE, CYAN, '#a855f7', '#f97316', '#06b6d4'];

const FinanceiroMorador = () => {
  const { user } = useAuth();
  const [unit, setUnit]       = useState<DbUnit | null>(null);
  const [rateios, setRateios] = useState<DbFinance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      user?.unit_number ? fetchUnitByNumber(user.unit_number) : Promise.resolve(null),
      fetchFinances({ limit: 1000 }),
    ]).then(([u, fins]) => {
      setUnit(u);
      setRateios(fins);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const ML = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const chartData = useMemo(() => {
    const map: Record<string, { receitas: number; despesas: number }> = {};
    rateios.forEach(f => {
      if (!map[f.reference_month]) map[f.reference_month] = { receitas: 0, despesas: 0 };
      if (f.type === 'receita') map[f.reference_month].receitas += Number(f.amount);
      else                      map[f.reference_month].despesas += Number(f.amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]) => {
        const [yr, mo] = ym.split('-');
        return { mes: `${ML[Number(mo) - 1]}/${yr.slice(2)}`, ...v };
      });
  }, [rateios]);

  const totalReceitas = useMemo(() => rateios.filter(f => f.type === 'receita').reduce((s, f) => s + Number(f.amount), 0), [rateios]);
  const totalDespesas = useMemo(() => rateios.filter(f => f.type === 'despesa').reduce((s, f) => s + Number(f.amount), 0), [rateios]);
  const saldo         = totalReceitas - totalDespesas;

  const byStatus = useMemo(() => ({
    pago:     { count: rateios.filter(f => f.status === 'pago').length,     value: rateios.filter(f => f.status === 'pago').reduce((s, f) => s + Number(f.amount), 0) },
    pendente: { count: rateios.filter(f => f.status === 'pendente').length, value: rateios.filter(f => f.status === 'pendente').reduce((s, f) => s + Number(f.amount), 0) },
    vencido:  { count: rateios.filter(f => f.status === 'vencido').length,  value: rateios.filter(f => f.status === 'vencido').reduce((s, f) => s + Number(f.amount), 0) },
  }), [rateios]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    rateios.filter(f => f.type === 'despesa').forEach(f => {
      map[f.category] = (map[f.category] ?? 0) + Number(f.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [rateios]);

  const donutData = [
    { name: 'Receitas', value: totalReceitas },
    { name: 'Despesas', value: totalDespesas },
  ];

  const statusColor = unit?.status === 'regular' ? GREEN : unit?.status === 'inadimplente' ? RED : YELLOW;
  const statusLabel = unit?.status === 'regular' ? 'Em dia' : unit?.status === 'inadimplente' ? 'Inadimplente' : 'Suspenso';

  const slideDashboard: SlideItem = {
    key: 'morador-dashboard',
    label: 'Dashboard',
    content: (
      <SlidePanel
        eyebrow="Transparência Financeira"
        title={<>Receitas <span className="grad-text">&amp; Despesas</span></>}
        badges={[
          { icon: '📊', label: 'Dados do condomínio' },
          { icon: '🔓', label: 'Transparência total' },
        ]}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-white/40 text-xs">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="flex flex-col gap-3 h-full">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-2.5 flex flex-col gap-1" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receitas</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: GREEN }}>{formatCurrency(totalReceitas)}</span>
              </div>
              <div className="rounded-xl p-2.5 flex flex-col gap-1" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Despesas</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: RED }}>{formatCurrency(totalDespesas)}</span>
              </div>
              <div className="rounded-xl p-2.5 flex flex-col gap-1" style={{ background: saldo >= 0 ? 'rgba(87,216,255,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${saldo >= 0 ? 'rgba(87,216,255,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: saldo >= 0 ? CYAN : YELLOW }}>{formatCurrency(Math.abs(saldo))}</span>
              </div>
            </div>

            {/* Donut + Status */}
            <div className="grid grid-cols-2 gap-3">
              {/* Donut */}
              <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>DISTRIBUIÇÃO</p>
                <div style={{ height: 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        <Cell fill={GREEN} fillOpacity={0.85} />
                        <Cell fill={RED} fillOpacity={0.85} />
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#0d1423', border: '1px solid rgba(87,216,255,0.2)', borderRadius: 10, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 mt-1">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? GREEN : RED }} />
                      <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>STATUS</p>
                {([
                  { key: 'pago', label: 'Pagos', color: GREEN },
                  { key: 'pendente', label: 'Pendentes', color: YELLOW },
                  { key: 'vencido', label: 'Vencidos', color: RED },
                ] as const).map(({ key, label, color }) => {
                  const { count, value } = byStatus[key];
                  const pct = totalReceitas + totalDespesas > 0 ? (value / (totalReceitas + totalDespesas)) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>{label} ({count})</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color }}>{formatCurrency(value)}</span>
                      </div>
                      <div className="w-full rounded-full h-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trend chart */}
            <div className="rounded-2xl p-3 flex-1 flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', minHeight: 100 }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>EVOLUÇÃO MENSAL</p>
              <div className="flex-1 min-h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: -22 }}>
                    <defs>
                      <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GREEN} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDesp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={RED} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={RED} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 7 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="receitas" stroke={GREEN} strokeWidth={1.5} fill="url(#gRec)" name="Receitas" />
                    <Area type="monotone" dataKey="despesas" stroke={RED} strokeWidth={1.5} fill="url(#gDesp)" name="Despesas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    ),
  };

  const slideCategorias: SlideItem = {
    key: 'morador-categorias',
    label: 'Por Categoria',
    content: (
      <SlidePanel
        eyebrow="Análise de Gastos"
        title={<>Despesas <span className="grad-text">por Categoria</span></>}
        badges={[{ icon: '📊', label: 'Top categorias' }]}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-white/40 text-xs">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : byCategory.length === 0 ? (
          <p className="text-center text-white/30 text-xs py-8">Nenhuma despesa registrada.</p>
        ) : (
          <div className="flex flex-col gap-3 h-full">
            {/* Donut por categoria */}
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} cx="50%" cy="50%" innerRadius={32} outerRadius={54} paddingAngle={2} dataKey="value" nameKey="name" strokeWidth={0}>
                      {byCategory.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} fillOpacity={0.85} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#0d1423', border: '1px solid rgba(87,216,255,0.2)', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Barras horizontais */}
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
              {byCategory.map((cat, i) => {
                const pct = totalDespesas > 0 ? (cat.value / totalDespesas) * 100 : 0;
                return (
                  <div key={cat.name} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600 }} className="truncate mr-2">{cat.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{pct.toFixed(1)}%</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: DONUT_COLORS[i % DONUT_COLORS.length] }}>{formatCurrency(cat.value)}</span>
                      </div>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: DONUT_COLORS[i % DONUT_COLORS.length], opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SlidePanel>
    ),
  };

  const slideSituacao: SlideItem = {
    key: 'morador-situacao',
    label: 'Minha Chácara',
    content: (
      <SlidePanel
        eyebrow="Portal do Condômino"
        title={<>Minha <span className="grad-text">Situação</span></>}
        badges={[
          { icon: '🏡', label: `Chácara ${user?.unit_number ?? '—'}` },
          { icon: '📅', label: 'Vencimento dia 10' },
          { icon: '🔒', label: 'Dados protegidos' },
        ]}
      >
        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-white/40 text-xs">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Status visual */}
            <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: `${statusColor}10`, border: `1px solid ${statusColor}30` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${statusColor}18` }}>
                {unit?.status === 'regular' ? <CheckCircle2 size={22} style={{ color: statusColor }} /> : <AlertTriangle size={22} style={{ color: statusColor }} />}
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>STATUS DA CHÁCARA {user?.unit_number}</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: statusColor }}>{statusLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <StatCard label="Taxa Mensal" value={formatCurrency(unit?.monthly_fee ?? 0)} icon={DollarSign} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Próx. Vencimento" value={nextDueDate()} icon={Calendar} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
              <StatCard label="Saldo" value={formatCurrency(Math.abs(unit?.balance ?? 0))} icon={(unit?.balance ?? 0) >= 0 ? Wallet : TrendingDown} iconColor={(unit?.balance ?? 0) >= 0 ? GREEN : RED} iconBg={`${(unit?.balance ?? 0) >= 0 ? GREEN : RED}18`} />
              <StatCard label="Área" value={unit?.area_m2 ? `${unit.area_m2.toLocaleString('pt-BR')} m²` : '—'} icon={Home} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
            </div>

            <div className="rounded-2xl p-3.5 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label: 'Proprietário', value: unit?.owner_name ?? '—' },
                { label: 'Situação', value: statusLabel },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-white/4">
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.75rem' }}>{row.value}</span>
                </div>
              ))}
              <p className="text-[10px] text-white/25 pt-1">Para pagamento via Pix ou boleto, acesse a seção Chácaras.</p>
            </div>
          </div>
        )}
      </SlidePanel>
    ),
  };

  const slideRateios: SlideItem = {
    key: 'morador-rateios',
    label: 'Histórico',
    content: (
      <SlidePanel
        eyebrow="Histórico de Lançamentos"
        title={<>Lançamentos <span className="grad-text">do Condomínio</span></>}
        badges={[
          { icon: '📋', label: 'Transparência' },
          { icon: '◈', label: 'Últimos 200' },
        ]}
      >
        <div className="space-y-1.5 overflow-y-auto max-h-[340px] pr-1">
          {loading ? (
            <p className="text-center text-white/30 text-xs py-8">Carregando...</p>
          ) : rateios.length === 0 ? (
            <p className="text-center text-white/30 text-xs py-8">Nenhum lançamento ainda.</p>
          ) : rateios.map(f => {
            const sc = f.status === 'pago' ? GREEN : f.status === 'vencido' ? RED : YELLOW;
            const sl = f.status === 'pago' ? 'Pago' : f.status === 'vencido' ? 'Vencido' : 'Pendente';
            return (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5 text-[11px]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: f.type === 'receita' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                  {f.type === 'receita' ? <TrendingUp size={13} style={{ color: GREEN }} /> : <TrendingDown size={13} style={{ color: RED }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white leading-none mb-1 truncate">{f.description}</p>
                  <div className="flex items-center gap-1.5 text-[9.5px] text-white/40">
                    <span>{f.category}</span>
                    <span>•</span>
                    <span>{formatDate(f.due_date)}</span>
                    <span className="font-bold" style={{ color: sc }}>• {sl}</span>
                  </div>
                </div>
                <span className="font-extrabold flex-shrink-0" style={{ color: f.type === 'receita' ? GREEN : RED }}>
                  {f.type === 'receita' ? '+' : '-'}{formatCurrency(f.amount)}
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
      <PageCarousel3D slides={[
        slideDashboard, slideCategorias, slideSituacao, slideRateios,
        { key: 'fin-m-cobrancas', label: 'Boletos', content: <div className="w-full h-full overflow-y-auto px-1"><MinhasCobrancasSlide /></div> },
      ]} />
    </div>
  );
};

/* ── Visão gestor ───────────────────────────────────────────────── */
const FinanceiroGestor = () => {
  const { user, isGestor } = useAuth();

  // Filtros
  const [filter, setFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const PAGE_SIZE = 30;

  // Dados
  const [lancamentos, setLancamentos] = useState<DbFinance[]>([]);
  const [summary, setSummary] = useState({ totalDespesas: 0, totalPendentes: 0, totalGeral: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [allRaw, setAllRaw] = useState<DbFinance[]>([]);
  const [dreRaw, setDreRaw] = useState<DbFinance[]>([]);
  const [dreExpanded, setDreExpanded] = useState<Set<string>>(new Set());
  const toggleDRE = (label: string) => setDreExpanded(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  // ── Import ──────────────────────────────────────────────────────────
  const importInputRef                          = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows]             = useState<FinanceRow[]>([]);
  const [importing, setImporting]               = useState(false);
  const [importDone, setImportDone]             = useState<number | null>(null);

  // Estados do Formulário Inline
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'receita' | 'despesa'>('despesa');
  const [formStatus, setFormStatus] = useState<'pago' | 'pendente'>('pendente');
  const [formCategory, setFormCategory] = useState<typeof CATEGORIES[number]>(CATEGORIES[3]);
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
      const [data, sum, dreAll, all] = await Promise.all([
        fetchFinances({ ...filterParams(), limit: PAGE_SIZE, offset: 0 }),
        fetchFinanceSummary(selectedMonth),
        fetchFinances({ referenceMonth: selectedMonth, limit: 1000, offset: 0 }),
        fetchFinances({ limit: 2000, offset: 0 }),
      ]);
      setLancamentos(data);
      setSummary(sum);
      setDreRaw(dreAll);
      setAllRaw(all);
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

  const MONTHS_LABEL = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const chartData = useMemo(() => {
    const map: Record<string, { receitas: number; despesas: number }> = {};
    allRaw.forEach(f => {
      if (!map[f.reference_month]) map[f.reference_month] = { receitas: 0, despesas: 0 };
      if (f.type === 'receita') map[f.reference_month].receitas += Number(f.amount);
      else                      map[f.reference_month].despesas += Number(f.amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]) => {
        const [yr, mo] = ym.split('-');
        return { mes: `${MONTHS_LABEL[Number(mo) - 1]}/${yr.slice(2)}`, ...v };
      });
  }, [allRaw]);

  // Filtragem já é server-side — "filtered" é apenas o estado atual
  const filtered = lancamentos;

  const totalReceitasGestor = useMemo(() => lancamentos.filter(f => f.type === 'receita').reduce((s, f) => s + Number(f.amount), 0), [lancamentos]);
  const totalDespesasGestor = useMemo(() => lancamentos.filter(f => f.type === 'despesa').reduce((s, f) => s + Number(f.amount), 0), [lancamentos]);

  const dreData = useMemo(() => {
    const receitas    = dreRaw.filter(f => f.type === 'receita').reduce((s, f) => s + Number(f.amount), 0);
    const mappedCats  = new Set(DRE_GROUPS.flatMap(g => [...g.categories]));
    const groups = DRE_GROUPS.map(g => {
      const items = [...g.categories]
        .map(cat => ({ label: cat, value: dreRaw.filter(f => f.type === 'despesa' && f.category === cat).reduce((s, f) => s + Number(f.amount), 0) }))
        .filter(i => i.value > 0);
      return { ...g, items, total: items.reduce((s, i) => s + i.value, 0) };
    }).filter(g => g.total > 0);
    const outros       = dreRaw.filter(f => f.type === 'despesa' && !mappedCats.has(f.category)).reduce((s, f) => s + Number(f.amount), 0);
    const totalDespesas = groups.reduce((s, g) => s + g.total, 0) + outros;
    return { receitas, groups, totalDespesas, resultado: receitas - totalDespesas, outros };
  }, [dreRaw]);

  const byCategoryGestor = useMemo(() => {
    const map: Record<string, number> = {};
    lancamentos.filter(f => f.type === 'despesa').forEach(f => {
      map[f.category] = (map[f.category] ?? 0) + Number(f.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [lancamentos]);

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

      gotoSlide(2); // vai para Lançamentos
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

  const monthOptions = [
    { value: '', label: 'TODOS OS MESES' },
    ...Array.from({ length: 24 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }).toUpperCase() };
    }),
  ];

  const STATUS_LABEL: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', vencido: 'Vencido' };

  const exportarPDF = async () => {
    try {
      toast.loading('Gerando PDF...', { id: 'pdf-fin' });
      const { ReportBuilder, REPORT_COLORS, loadCondoLogo } = await import('../../lib/pdf-report');
      const logo = await loadCondoLogo();
      const monthLabel = selectedMonth
        ? format(new Date(selectedMonth + '-02T12:00:00'), 'MMMM yyyy', { locale: ptBR })
        : 'Todos os meses';
      // Busca completa do período/filtros — relatório fiel, sem paginação
      const todos = await fetchFinances({ ...filterParams(), limit: 1000, offset: 0 });

      const rb = new ReportBuilder({
        title: 'Relatório Financeiro',
        subtitle: 'Prestação de contas aos condôminos',
        period: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        generatedBy: user?.full_name,
        logo,
      });

      rb.kpiRow([
        { label: 'Total Geral', value: formatCurrency(summary.totalGeral), accent: REPORT_COLORS.cyan },
        { label: 'Despesas Pagas', value: formatCurrency(summary.totalDespesas), accent: REPORT_COLORS.red },
        { label: 'Pendente', value: formatCurrency(summary.totalPendentes), accent: REPORT_COLORS.amber },
      ]);

      if (chartData.length > 0) {
        rb.sectionTitle('Evolução: Receitas x Despesas');
        rb.table(
          ['Período', 'Receitas', 'Despesas', 'Saldo'],
          chartData.map(c => [
            c.mes,
            formatCurrency(c.receitas),
            formatCurrency(c.despesas),
            formatCurrency(c.receitas - c.despesas),
          ]),
          [1, 2, 3],
        );
      }

      rb.sectionTitle(`Lançamentos${selectedMonth ? '' : ' (mais recentes)'}`);
      if (todos.length === 0) {
        rb.paragraph('Nenhum lançamento encontrado para o período/filtros selecionados.');
      } else {
        rb.table(
          ['Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor'],
          todos.map(f => [
            formatDate(f.due_date),
            f.description,
            f.category,
            f.type === 'receita' ? 'Receita' : 'Despesa',
            STATUS_LABEL[f.status] ?? f.status,
            formatCurrency(Number(f.amount)),
          ]),
          [5],
        );
      }

      rb.save(`relatorio-financeiro-${selectedMonth || 'geral'}.pdf`);
      toast.success('Relatório PDF gerado!', { id: 'pdf-fin' });
    } catch {
      toast.error('Erro ao gerar o PDF.', { id: 'pdf-fin' });
    }
  };

  const slideDRE = (
    <SlidePanel
      eyebrow="Demonstrativo de Resultado"
      title={<>DRE <span className="grad-text">{selectedMonth ? format(new Date(selectedMonth + '-02T12:00:00'), 'MMM/yyyy', { locale: ptBR }) : 'Geral'}</span></>}
      badges={[
        { icon: '📋', label: 'Por grupo' },
        { icon: '◈', label: selectedMonth || 'Todos os meses' },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full gap-2 text-white/40 text-xs">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 h-full overflow-y-auto pr-1">
          {/* Receitas */}
          <div className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={13} style={{ color: GREEN }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Receitas Operacionais</span>
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: GREEN }}>{formatCurrency(dreData.receitas)}</span>
          </div>

          <p style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', paddingLeft: 4 }}>DESPESAS</p>

          {/* Grupos */}
          {dreData.groups.map(g => {
            const pct      = dreData.totalDespesas > 0 ? (g.total / dreData.totalDespesas) * 100 : 0;
            const expanded = dreExpanded.has(g.label);
            return (
              <div key={g.label}>
                <button
                  onClick={() => toggleDRE(g.label)}
                  className="w-full rounded-xl px-3 py-2 text-left transition-all"
                  style={{ background: `${g.color}0a`, border: `1px solid ${g.color}22` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <ChevronDown size={11} style={{ color: g.color, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{g.label}</span>
                      <span style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.28)', fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: g.color }}>{formatCurrency(g.total)}</span>
                  </div>
                  <div className="w-full h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: g.color, opacity: 0.55, borderRadius: 9999 }} />
                  </div>
                </button>
                {expanded && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {g.items.map(item => (
                      <div key={item.label} className="flex justify-between items-center px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.61rem', color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: g.color }}>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {dreData.outros > 0 && (
            <div className="rounded-xl px-3 py-2 flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>Outras Despesas</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{formatCurrency(dreData.outros)}</span>
            </div>
          )}

          {dreData.groups.length === 0 && dreData.outros === 0 && dreData.receitas === 0 && (
            <p className="text-center text-white/25 text-xs py-8">Nenhum lançamento no período.</p>
          )}

          {/* Resultado */}
          <div className="rounded-xl px-3 py-3 flex items-center justify-between mt-auto" style={{
            background: dreData.resultado >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${dreData.resultado >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resultado do Período</p>
              <p style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.22)' }}>Receitas − Despesas</p>
            </div>
            <p style={{ fontSize: '1.15rem', fontWeight: 900, color: dreData.resultado >= 0 ? GREEN : RED }}>
              {dreData.resultado >= 0 ? '+' : ''}{formatCurrency(dreData.resultado)}
            </p>
          </div>
        </div>
      )}
    </SlidePanel>
  );

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
          <button onClick={exportarPDF} title="Exportar relatório em PDF" className="btn btn-ghost p-1.5 rounded-xl border border-white/8 bg-white/4 flex items-center gap-1 text-[10px] font-bold">
            <FileDown size={14} /> PDF
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

  const slideAnalise = (
    <SlidePanel
      eyebrow="Análise Financeira"
      title={<>Despesas <span className="grad-text">por Categoria</span></>}
      badges={[
        { icon: '📊', label: 'Breakdown' },
        { icon: '◈', label: selectedMonth || 'Todos os meses' },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full gap-2 text-white/40 text-xs">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 h-full">
          {/* Donut receitas vs despesas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>REC. vs DESP.</p>
              <div style={{ height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: 'Receitas', value: totalReceitasGestor }, { name: 'Despesas', value: totalDespesasGestor }]} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      <Cell fill={GREEN} fillOpacity={0.85} />
                      <Cell fill={RED} fillOpacity={0.85} />
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#0d1423', border: '1px solid rgba(87,216,255,0.2)', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-2 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>RECEITAS</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: GREEN }}>{formatCurrency(totalReceitasGestor)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>DESPESAS</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: RED }}>{formatCurrency(totalDespesasGestor)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>SALDO</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: totalReceitasGestor - totalDespesasGestor >= 0 ? CYAN : YELLOW }}>{formatCurrency(Math.abs(totalReceitasGestor - totalDespesasGestor))}</p>
              </div>
            </div>
          </div>

          {/* BarChart horizontal por categoria */}
          <div className="rounded-2xl p-3 flex-1 flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', minHeight: 120 }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>TOP CATEGORIAS (DESPESAS)</p>
            {byCategoryGestor.length === 0 ? (
              <p className="text-center text-white/30 text-xs py-4">Sem despesas no período.</p>
            ) : (
              <div className="flex-1 min-h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategoryGestor} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#0d1423', border: '1px solid rgba(87,216,255,0.2)', borderRadius: 10, fontSize: 11 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={12}>
                      {byCategoryGestor.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
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
            <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value as typeof CATEGORIES[number])}>
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

  const slideCobrancas = (
    <div className="w-full h-full overflow-y-auto px-1">
      <CobrancasSlide />
    </div>
  );

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportDone(null);
    const rows = await parseFinanceFile(file);
    setImportRows(rows);
  };

  const handleConfirmImport = async () => {
    const validas = importRows.filter(r => !r._erro || r._erro.startsWith('Categoria'));
    if (!validas.length) return;
    setImporting(true);
    try {
      const payload = validas.map(r => ({
        description:     r.descricao,
        category:        r.categoria,
        amount:          r.valor,
        type:            r.tipo,
        status:          r.status as 'pago' | 'pendente' | 'vencido',
        due_date:        r.vencimento,
        reference_month: r.vencimento.slice(0, 7),
        created_by:      user!.id,
        notes:           r.observacao || null,
      }));
      const n = await bulkInsertFinances(payload);
      setImportDone(n);
      setImportRows([]);
      toast.success(`${n} lançamento(s) importado(s) com sucesso!`);
      await loadLancamentos();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao importar lançamentos.');
    } finally {
      setImporting(false);
    }
  };

  const GREEN_IMP  = '#10b981';
  const RED_IMP    = '#ef4444';
  const YELL_IMP   = '#f59e0b';

  const validasCount  = importRows.filter(r => !r._erro || r._erro.startsWith('Categoria')).length;
  const errosCount    = importRows.filter(r => r._erro && !r._erro.startsWith('Categoria')).length;
  const alertasCount  = importRows.filter(r => r._erro?.startsWith('Categoria')).length;

  const slideImportar = (
    <SlidePanel
      eyebrow="Importação em Lote"
      title={<>Importar <span className="grad-text">Lançamentos</span></>}
      badges={[
        { icon: '📥', label: 'CSV ou JSON' },
        { icon: '⚡', label: 'Revisão antes de salvar' },
      ]}
    >
      <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">

        {/* Download de templates */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.15)' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>1. Baixe o modelo e preencha</p>
          <div className="flex gap-2">
            {(['csv', 'json'] as const).map(fmt => (
              <button key={fmt} onClick={() => downloadTemplate(fmt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{ background: 'rgba(87,216,255,0.1)', border: '1px solid rgba(87,216,255,0.25)', color: CYAN }}>
                <FileDown size={12} /> Template .{fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>2. Faça o upload do arquivo preenchido</p>
          <input ref={importInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleImportFile} />
          <button onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all w-full justify-center"
            style={{ background: 'rgba(90,132,255,0.1)', border: '1px solid rgba(90,132,255,0.3)', color: BLUE }}>
            <Plus size={13} /> Selecionar arquivo .CSV ou .JSON
          </button>
        </div>

        {/* Sucesso anterior */}
        {importDone !== null && importRows.length === 0 && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={14} style={{ color: GREEN_IMP }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: GREEN_IMP }}>{importDone} lançamento(s) importado(s) com sucesso.</span>
          </div>
        )}

        {/* Pré-visualização */}
        {importRows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>3. Revise e confirme</p>
              <div className="flex gap-2 text-[10px] font-bold">
                <span style={{ color: GREEN_IMP }}>{validasCount} válida{validasCount !== 1 ? 's' : ''}</span>
                {alertasCount > 0 && <span style={{ color: YELL_IMP }}>{alertasCount} aviso{alertasCount !== 1 ? 's' : ''}</span>}
                {errosCount   > 0 && <span style={{ color: RED_IMP }}>{errosCount} erro{errosCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>

            <div className="space-y-1 overflow-y-auto flex-1" style={{ maxHeight: 220 }}>
              {importRows.map(r => {
                const isErro   = r._erro && !r._erro.startsWith('Categoria');
                const isAviso  = r._erro?.startsWith('Categoria');
                const cor      = isErro ? RED_IMP : isAviso ? YELL_IMP : GREEN_IMP;
                return (
                  <div key={r._linha} className="rounded-lg px-2.5 py-1.5 flex items-start gap-2 text-[10px]"
                    style={{ background: `${cor}08`, border: `1px solid ${cor}20` }}>
                    <span style={{ color: cor, fontWeight: 800, flexShrink: 0, paddingTop: 1 }}>{isErro ? '✕' : isAviso ? '!' : '✓'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: isErro ? 'rgba(255,255,255,0.4)' : '#fff' }}>{r.descricao || <em>sem descrição</em>}</p>
                      {r._erro
                        ? <p style={{ color: cor, fontSize: '0.58rem' }}>{r._erro}</p>
                        : <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem' }}>{r.categoria} · {r.tipo} · {r.vencimento}</p>
                      }
                    </div>
                    <span className="font-extrabold flex-shrink-0" style={{ color: r.tipo === 'receita' ? GREEN_IMP : RED_IMP }}>
                      {r.tipo === 'receita' ? '+' : '-'}{r.valor > 0 ? formatCurrency(r.valor) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-auto">
              <button onClick={() => setImportRows([])}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                Cancelar
              </button>
              <button onClick={handleConfirmImport} disabled={importing || validasCount === 0}
                className="flex-1 btn-primary py-2 text-[11px] justify-center gap-1.5"
                style={{ opacity: validasCount === 0 ? 0.4 : 1 }}>
                {importing
                  ? <><Loader2 size={12} className="animate-spin" /> Importando...</>
                  : <><CheckCircle2 size={12} /> Confirmar {validasCount} lançamento{validasCount !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </SlidePanel>
  );

  const slides3D: SlideItem[] = [
    { key: 'financeiro-dre',     label: 'DRE',     content: slideDRE },
    { key: 'financeiro-resumo',  label: 'Painel',  content: slideResumo },
    { key: 'financeiro-analise', label: 'Análise', content: slideAnalise },
    ...(isGestor ? [{ key: 'financeiro-importar', label: 'Importar', content: slideImportar }] : []),
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
          height: '100%',
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
