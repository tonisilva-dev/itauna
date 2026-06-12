import { useState, useEffect } from 'react';
import {
  Home, AlertCircle, TrendingUp, TrendingDown,
  Calendar, Wallet, CheckCircle2, Layers,
  ArrowUpRight, Shield, Image, Loader2, Users,
  DollarSign, Activity, Bell, ChevronRight, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { projetarFluxo, calcularIndiceSaude, type ChartPoint, type IndiceSaude } from '../../lib/analytics';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, formatDate, unitLabel } from '../../utils/format';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  fetchDashboardSummary, fetchFinanceTrend, fetchFinances, fetchIncidentsSummary,
  type DbFinance, type DbUnit, type DbAnnouncement, type DbIncident,
} from '@/lib/supabase-queries';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';
const BLUE   = '#5a84ff';
const PURPLE = '#8b5cf6';

const CURRENT_MONTH = format(new Date(), 'yyyy-MM');

// Próximo vencimento: dia 10 do mês atual se ainda não passou, senão mês seguinte
function nextDueDate() {
  const now = new Date();
  const d = new Date();
  if (now.getDate() >= 10) d.setMonth(d.getMonth() + 1);
  d.setDate(10);
  return `10/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 bg-[#0d1423]/95 border border-cyan/20 rounded-xl shadow-2xl backdrop-blur-md">
      <p className="text-[10px] text-white/40 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            <span className="text-white/60">{p.name}</span>
          </div>
          <span className="font-bold text-white">
            {typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const Dashboard = () => {
  const { user, isGestor } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading]               = useState(true);
  const [finances, setFinances]             = useState<{ totalDespesas: number; totalPendentes: number; totalGeral: number } | null>(null);
  const [trendData, setTrendData]           = useState<{ mes: string; receitas: number; despesas: number }[]>([]);
  const [recentFinances, setRecentFinances] = useState<DbFinance[]>([]);
  const [announcements, setAnnouncements]   = useState<DbAnnouncement[]>([]);
  const [units, setUnits]                   = useState<DbUnit[]>([]);
  const [moradorFinances, setMoradorFinances] = useState<DbFinance[]>([]);
  const [incidentsSummary, setIncidentsSummary] = useState<{
    totalAberto: number; emAndamento: number; urgentesAbertos: number; recentes: DbIncident[];
  }>({ totalAberto: 0, emAndamento: 0, urgentesAbertos: 0, recentes: [] });

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    if (isGestor) {
      Promise.all([
        fetchDashboardSummary(),
        fetchFinanceTrend(),
        fetchFinances({ limit: 6 }),
        fetchIncidentsSummary(),
      ]).then(([summary, trend, recent, incidents]) => {
        setFinances(summary.finances);
        setUnits(summary.units);
        setAnnouncements(summary.announcements);
        setTrendData(trend);
        setRecentFinances(recent);
        setIncidentsSummary(incidents);
      }).catch(() => toast.error('Erro ao carregar dashboard.'))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        fetchDashboardSummary(),
        fetchFinances({ type: 'receita', limit: 5 }),
      ]).then(([summary, recent]) => {
        setUnits(summary.units);
        setAnnouncements(summary.announcements);
        setMoradorFinances(recent);
      }).catch(() => toast.error('Erro ao carregar dashboard.'))
        .finally(() => setLoading(false));
    }
  }, [user, isGestor]);

  // KPIs derivados dos dados reais
  const totalDespesas  = finances?.totalDespesas  ?? 0;
  const totalPendentes = finances?.totalPendentes ?? 0;
  const totalReceitas  = (finances?.totalGeral ?? 0) - totalDespesas - totalPendentes;
  const saldo          = totalReceitas - totalDespesas;

  const regularCount  = units.filter(u => u.status === 'regular').length;
  const inadimplCount = units.filter(u => u.status === 'inadimplente').length;
  const suspCount     = units.filter(u => u.status === 'suspenso').length;
  const totalUnits    = units.length || 389;
  const adimplPct     = totalUnits > 0 ? Math.round((regularCount / totalUnits) * 100) : 0;

  const pieData = [
    { name: 'Em dia',       value: regularCount, color: GREEN  },
    { name: 'Inadimplente', value: inadimplCount, color: RED   },
    { name: 'Suspenso',     value: suspCount,     color: YELLOW },
  ];

  // Projeção de caixa: estende o histórico com 3 meses projetados
  const chartData: ChartPoint[] = trendData.length >= 2 ? projetarFluxo(trendData, 3) : trendData;
  const receitaMedia = trendData.length > 0
    ? trendData.reduce((s, p) => s + p.receitas, 0) / trendData.length
    : 0;

  // Índice de Saúde Condominial
  const indiceSaude: IndiceSaude | null = !loading ? calcularIndiceSaude({
    adimplenciaPct:  adimplPct,
    urgentesAbertos: incidentsSummary.urgentesAbertos,
    totalOcorrencias: incidentsSummary.totalAberto + incidentsSummary.emAndamento,
    saldoFinanceiro: saldo,
    receitaMedia,
  }) : null;

  const moradorUnit = units.find(u => u.unit_number === user?.unit_number);
  const moradorStatus = moradorUnit?.status === 'regular' ? 'Em dia' : moradorUnit?.status === 'inadimplente' ? 'Inadimplente' : moradorUnit?.status ?? '—';
  const moradorStatusColor = moradorUnit?.status === 'regular' ? GREEN : moradorUnit?.status === 'inadimplente' ? RED : YELLOW;

  const quickNav = (path: string) => {
    window.dispatchEvent(new CustomEvent('close-sidebar'));
    navigate(path);
  };

  const Spinner = () => (
    <div className="flex items-center justify-center gap-2 py-8 text-white/30 text-xs">
      <Loader2 size={14} className="animate-spin" /> Carregando...
    </div>
  );

  // ── Slides para Gestores ──
  const gestorSlides: SlideItem[] = [
    {
      key: 'gestor-caixa',
      label: 'Painel Executivo',
      content: (
        <SlidePanel
          eyebrow="Painel Executivo · Mês Atual"
          title={<>Caixa & <span className="grad-text">Fluxo Financeiro</span></>}
          badges={[
            { icon: '💰', label: 'Dados Reais' },
            { icon: '📊', label: 'Histórico Mensal' },
            { icon: '⚡', label: 'Supabase Live' },
          ]}
          actions={
            <button onClick={() => quickNav('/financeiro')} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
              <DollarSign size={12} /> Financeiro
            </button>
          }
        >
          <div className="flex flex-col h-full gap-3">

            {/* Saldo em destaque */}
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: saldo >= 0
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
                border: `1px solid ${saldo >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              <div>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  Saldo Disponível — {format(new Date(), 'MMMM yyyy', { locale: undefined }).toUpperCase().replace(/^\w/, c => c.toUpperCase())}
                </p>
                <p style={{ fontSize: '1.6rem', fontWeight: 900, color: saldo >= 0 ? GREEN : RED, lineHeight: 1.1, marginTop: 4, letterSpacing: '-0.02em' }}>
                  {loading ? '...' : formatCurrency(Math.abs(saldo))}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                  {saldo >= 0 ? 'Resultado positivo no mês' : 'Resultado negativo no mês'}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: saldo >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
              >
                {saldo >= 0
                  ? <TrendingUp className="w-6 h-6" style={{ color: GREEN }} />
                  : <TrendingDown className="w-6 h-6" style={{ color: RED }} />
                }
              </div>
            </div>

            {/* 3 KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Receitas" value={loading ? '...' : formatCurrency(totalReceitas)} icon={TrendingUp} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
              <StatCard label="Despesas Pagas" value={loading ? '...' : formatCurrency(totalDespesas)} icon={TrendingDown} iconColor={RED} iconBg="rgba(239,68,68,0.08)" />
              <StatCard
                label="Pendente/Vencido"
                value={loading ? '...' : formatCurrency(totalPendentes)}
                icon={AlertCircle}
                iconColor={totalPendentes > 0 ? YELLOW : GREEN}
                iconBg={totalPendentes > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)'}
              />
            </div>

            {/* Gráfico: histórico + projeção 3 meses */}
            <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 flex-1 flex flex-col min-h-[130px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-white text-xs font-bold">Evolução & Projeção de Caixa</h3>
                  <p className="text-[10px] text-white/30">Histórico + 3 meses projetados (regressão linear)</p>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-white/40">
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} /><span>Receitas</span></div>
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} /><span>Despesas</span></div>
                  <div className="flex items-center gap-1"><div className="w-4 h-px border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,0.3)' }} /><span>Proj.</span></div>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[100px]">
                {loading ? <Spinner /> : chartData.length === 0 ? (
                  <p className="text-center text-white/20 text-[10px] py-4">Sem dados históricos ainda.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: -22 }}>
                      <defs>
                        <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GREEN} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDesp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={RED} stopOpacity={0.14} />
                          <stop offset="95%" stopColor={RED} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* Histórico */}
                      <Area type="monotone" dataKey="receitas" name="Receitas" stroke={GREEN} strokeWidth={1.5} fill="url(#gRec)" dot={false} connectNulls />
                      <Area type="monotone" dataKey="despesas" name="Despesas" stroke={RED} strokeWidth={1.5} fill="url(#gDesp)" dot={false} connectNulls />
                      {/* Projeção (tracejado, sem fill) */}
                      <Area type="monotone" dataKey="receitas_proj" name="Rec. Proj." stroke={GREEN} strokeWidth={1} strokeDasharray="4 3" fill="none" dot={false} connectNulls />
                      <Area type="monotone" dataKey="despesas_proj" name="Desp. Proj." stroke={RED} strokeWidth={1} strokeDasharray="4 3" fill="none" dot={false} connectNulls />
                      {/* Linha divisória histórico/projeção */}
                      {trendData.length > 0 && (
                        <ReferenceLine x={trendData[trendData.length - 1].mes} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </SlidePanel>
      )
    },
    {
      key: 'gestor-saude',
      label: 'Saúde',
      content: (
        <SlidePanel
          eyebrow="Diagnóstico Automático"
          title={<>Índice de <span className="grad-text">Saúde</span></>}
          badges={[
            { icon: '🔬', label: 'Algoritmo determinístico' },
            { icon: '⚖️', label: '4 componentes' },
            { icon: '🔄', label: 'Atualizado agora' },
          ]}
        >
          {loading || !indiceSaude ? <div className="flex items-center justify-center gap-2 py-12 text-white/30 text-xs"><Loader2 size={14} className="animate-spin" /> Calculando...</div> : (
            <div className="flex flex-col gap-4">

              {/* Score principal */}
              <div className="rounded-2xl p-5 flex items-center gap-5"
                style={{ background: `${indiceSaude.cor}10`, border: `1px solid ${indiceSaude.cor}30` }}>
                {/* Círculo */}
                <div className="relative flex-shrink-0 w-20 h-20">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke={indiceSaude.cor} strokeWidth="8"
                      strokeDasharray={`${(indiceSaude.total / 100) * 213.6} 213.6`}
                      strokeLinecap="round" transform="rotate(-90 40 40)"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black" style={{ color: indiceSaude.cor, lineHeight: 1 }}>{indiceSaude.total}</span>
                    <span className="text-[0.5rem] text-white/40 font-bold">/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Nível</p>
                  <p className="text-2xl font-black" style={{ color: indiceSaude.cor }}>{indiceSaude.nivel}</p>
                  <p className="text-[0.65rem] text-white/40 mt-1">Calculado com base em adimplência, ocorrências e caixa</p>
                </div>
              </div>

              {/* Componentes */}
              <div className="space-y-2">
                {indiceSaude.componentes.map(c => (
                  <div key={c.label} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white/80">{c.label}</span>
                        <span className="text-xs font-black" style={{ color: c.score >= 70 ? GREEN : c.score >= 45 ? YELLOW : RED }}>{c.score}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${c.score}%`, background: c.score >= 70 ? GREEN : c.score >= 45 ? YELLOW : RED }} />
                      </div>
                      <p className="text-[0.6rem] text-white/35 mt-1">{c.detalhe} · peso {(c.peso * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </SlidePanel>
      ),
    },
    {
      key: 'gestor-adimplencia',
      label: 'Adimplência & Chamados',
      content: (
        <SlidePanel
          eyebrow="Saúde do Condomínio"
          title={<>Adimplência & <span className="grad-text">Ocorrências</span></>}
          badges={[
            { icon: '🏡', label: `${totalUnits} Chácaras` },
            { icon: '📊', label: `${adimplPct}% adimplentes` },
            { icon: incidentsSummary.urgentesAbertos > 0 ? '🚨' : '✅', label: incidentsSummary.urgentesAbertos > 0 ? `${incidentsSummary.urgentesAbertos} urgentes` : 'Sem urgências' },
          ]}
          actions={
            <button onClick={() => quickNav('/ocorrencias')} className="btn-ghost py-1.5 px-3 text-xs gap-1 flex items-center border border-white/10">
              <Activity size={12} /> Ocorrências
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">

            {/* Coluna esquerda: Adimplência */}
            <div className="flex flex-col gap-3">

              {/* Taxa em destaque */}
              <div
                className="rounded-2xl p-3.5 flex items-center gap-3"
                style={{
                  background: adimplPct >= 80
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.03))'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03))',
                  border: `1px solid ${adimplPct >= 80 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                <div>
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Taxa de Adimplência</p>
                  <p style={{ fontSize: '2rem', fontWeight: 900, color: adimplPct >= 80 ? GREEN : YELLOW, lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {loading ? '—' : `${adimplPct}%`}
                  </p>
                  <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{loading ? '' : `${regularCount} de ${totalUnits} unidades em dia`}</p>
                </div>
              </div>

              {/* PieChart */}
              <div className="rounded-2xl bg-white/3 border border-white/5 p-3 flex-1 flex flex-col">
                <p className="text-[10px] font-bold text-white mb-1">Composição</p>
                {loading ? <Spinner /> : (
                  <div className="flex items-center gap-3 flex-1">
                    <ResponsiveContainer width={80} height={80}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {pieData.map(item => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>{item.name}</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna direita: Ocorrências */}
            <div className="flex flex-col gap-3">

              {/* KPIs ocorrências */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Urgentes', value: incidentsSummary.urgentesAbertos, color: incidentsSummary.urgentesAbertos > 0 ? RED : GREEN, bg: incidentsSummary.urgentesAbertos > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)' },
                  { label: 'Andamento', value: incidentsSummary.emAndamento, color: YELLOW, bg: 'rgba(245,158,11,0.08)' },
                  { label: 'Em Aberto', value: incidentsSummary.totalAberto, color: BLUE, bg: 'rgba(90,132,255,0.08)' },
                ].map(k => (
                  <div key={k.label} className="rounded-xl p-2.5 flex flex-col items-center gap-1 text-center" style={{ background: k.bg, border: `1px solid ${k.color}22` }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: k.color, lineHeight: 1 }}>{loading ? '—' : k.value}</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{k.label}</span>
                  </div>
                ))}
              </div>

              {/* Lista de urgentes */}
              <div className="rounded-2xl bg-white/3 border border-white/5 p-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-white">Chamados Urgentes</p>
                  {incidentsSummary.urgentesAbertos > 0 && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.15)', color: RED, border: '1px solid rgba(239,68,68,0.3)' }}>
                      {incidentsSummary.urgentesAbertos} abertos
                    </span>
                  )}
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {loading ? <Spinner /> : incidentsSummary.recentes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                      <CheckCircle2 className="w-6 h-6" style={{ color: 'rgba(16,185,129,0.4)' }} />
                      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Nenhum chamado urgente em aberto</p>
                    </div>
                  ) : incidentsSummary.recentes.map(inc => (
                    <div key={inc.id} className="flex items-start gap-2 p-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <Zap size={11} className="flex-shrink-0 mt-0.5" style={{ color: RED }} />
                      <div className="min-w-0">
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }} className="truncate">{inc.title}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>{inc.category} · {formatDate(inc.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => quickNav('/ocorrencias')} className="btn-ghost w-full justify-center py-1.5 text-[10px] mt-2 gap-1 flex items-center border border-white/8">
                  Ver todas <ArrowUpRight size={11} />
                </button>
              </div>
            </div>
          </div>
        </SlidePanel>
      )
    },
    {
      key: 'gestor-atividades',
      label: 'Atividades Recentes',
      content: (
        <SlidePanel
          eyebrow="Linha do Tempo"
          title={<>Atividades & <span className="grad-text">Atalhos</span></>}
          badges={[
            { icon: '📋', label: 'Lançamentos' },
            { icon: '📣', label: 'Comunicados' },
            { icon: '⚡', label: 'Acesso Rápido' },
          ]}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-full">

            {/* Lançamentos recentes — col 3 */}
            <div className="lg:col-span-3 rounded-2xl bg-white/3 border border-white/5 p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-white text-xs font-bold">Últimos Lançamentos</h3>
                  <p className="text-[10px] text-white/30">Movimentos financeiros recentes</p>
                </div>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                {loading ? <Spinner /> : recentFinances.length === 0 ? (
                  <p className="text-white/25 text-[10px] text-center py-4">Nenhum lançamento encontrado.</p>
                ) : recentFinances.map(f => {
                  const isPending = f.status === 'pendente' || f.status === 'vencido';
                  const statusColor = f.status === 'pago' ? GREEN : f.status === 'vencido' ? RED : YELLOW;
                  return (
                    <div key={f.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/2 hover:bg-white/4 transition-colors">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: f.type === 'receita' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                        {f.type === 'receita'
                          ? <TrendingUp size={12} style={{ color: GREEN }} />
                          : <TrendingDown size={12} style={{ color: RED }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-white truncate leading-none mb-0.5">{f.description}</p>
                        <p className="text-[9px] text-white/40">{f.category} · {formatDate(f.due_date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-bold" style={{ color: f.type === 'receita' ? GREEN : RED }}>
                          {f.type === 'receita' ? '+' : '-'}{formatCurrency(f.amount)}
                        </p>
                        {isPending && <p style={{ fontSize: '0.58rem', color: statusColor, fontWeight: 700 }}>{f.status === 'vencido' ? 'VENCIDO' : 'Pendente'}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => quickNav('/financeiro')} className="btn-secondary w-full justify-center py-1.5 text-[10px] mt-2 gap-1.5 flex items-center">
                Ver todos os lançamentos <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Comunicados + Atalhos — col 2 */}
            <div className="lg:col-span-2 flex flex-col gap-3">

              {/* Comunicados */}
              <div className="rounded-2xl bg-white/3 border border-white/5 p-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white text-xs font-bold">Comunicados</h3>
                  <button onClick={() => quickNav('/comunicados')} className="text-[9px] text-cyan/70 hover:text-cyan flex items-center gap-0.5">
                    ver todos <ChevronRight size={10} />
                  </button>
                </div>
                <div className="space-y-2 flex-1">
                  {loading ? <Spinner /> : announcements.length === 0 ? (
                    <p className="text-white/25 text-[10px] text-center py-3">Nenhum comunicado.</p>
                  ) : announcements.slice(0, 3).map(a => (
                    <div key={a.id} className="p-2 rounded-xl text-[10px]"
                      style={{
                        background: a.priority === 'urgente' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                        border: a.priority === 'urgente' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.05)',
                      }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Bell size={9} style={{ color: a.priority === 'urgente' ? RED : YELLOW, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: a.priority === 'urgente' ? RED : YELLOW, textTransform: 'uppercase', letterSpacing: '.05em' }}>{a.priority}</span>
                      </div>
                      <p className="text-white font-semibold truncate">{a.title}</p>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{formatDate(a.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Atalhos rápidos */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Moradores',   path: '/moradores',   icon: Users,     color: CYAN   },
                  { label: 'Portaria',    path: '/portaria',    icon: Shield,    color: GREEN  },
                  { label: 'Ocorrências', path: '/ocorrencias', icon: Activity,  color: RED    },
                  { label: 'Acessos',     path: '/acessos',     icon: Layers,    color: PURPLE },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => quickNav(btn.path)}
                    className="p-2.5 rounded-xl border border-white/8 hover:border-cyan/30 hover:bg-cyan/8 text-white transition-all text-left flex flex-col gap-2 cursor-pointer group"
                    style={{ background: 'rgba(255,255,255,0.025)' }}
                  >
                    <btn.icon size={14} style={{ color: btn.color }} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-white/75 group-hover:text-white/95 transition-colors leading-none">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SlidePanel>
      )
    }
  ];

  // ── Slides para Moradores ──
  const moradorSlides: SlideItem[] = [
    {
      key: 'morador-resumo',
      label: 'Visão Geral',
      content: (
        <SlidePanel
          eyebrow="Portal do Condômino"
          title={<>Olá, <span className="grad-text">{user?.full_name?.split(' ')[0] || 'Morador'} 👋</span></>}
          badges={[
            { icon: '🏠', label: unitLabel(user?.unit_number || 0) },
            {
              icon: loading ? '⏳' : moradorUnit?.status === 'regular' ? '🟢' : moradorUnit?.status === 'inadimplente' ? '🔴' : '🟡',
              label: loading ? 'Carregando...' : moradorUnit?.status === 'regular' ? 'Financeiro em Dia' : moradorUnit?.status === 'inadimplente' ? 'Inadimplente' : moradorStatus,
            },
            { icon: '📅', label: format(new Date(), 'MMMM yyyy').replace(/^\w/, c => c.toUpperCase()) }
          ]}
        >
          <div className="flex flex-col h-full gap-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Minha Chácara" value={unitLabel(user?.unit_number || 0)} icon={Home} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard
                label="Situação"
                value={loading ? '...' : moradorStatus}
                icon={CheckCircle2}
                iconColor={moradorStatusColor}
                iconBg={`${moradorStatusColor}18`}
              />
              <StatCard label="Próx. Vencimento" value={nextDueDate()} icon={Calendar} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
            </div>

            {/* Taxa mensal + saldo */}
            <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 flex-1 flex flex-col justify-between min-h-[160px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-white text-xs font-bold">Situação Financeira da Unidade</h3>
                  <p className="text-[10px] text-white/30">Taxa condominial e saldo atual</p>
                </div>
              </div>
              {loading ? <Spinner /> : (
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/3 border border-white/5 text-xs">
                  <span className="text-white/50">Taxa Mensal</span>
                  <span className="font-bold text-white">{formatCurrency(moradorUnit?.monthly_fee ?? 135)}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/3 border border-white/5 text-xs">
                  <span className="text-white/50">Saldo Atual</span>
                  <span className="font-bold" style={{ color: (moradorUnit?.balance ?? 0) >= 0 ? GREEN : RED }}>
                    {(moradorUnit?.balance ?? 0) >= 0 ? '' : '-'}{formatCurrency(Math.abs(moradorUnit?.balance ?? 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/3 border border-white/5 text-xs">
                  <span className="text-white/50">Próximo vencimento</span>
                  <span className="font-bold text-white">{nextDueDate()}</span>
                </div>
              </div>
              )}
            </div>
          </div>
        </SlidePanel>
      )
    },
    {
      key: 'morador-atividades',
      label: 'Avisos & Lançamentos',
      content: (
        <SlidePanel
          eyebrow="Minha Chácara"
          title={<>Atividades & <span className="grad-text">Lançamentos</span></>}
          badges={[
            { icon: '📣', label: 'Comunicados' },
            { icon: '💰', label: 'Financeiro' },
            { icon: '🔒', label: 'Portal Seguro' }
          ]}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            {/* Lançamentos específicos */}
            <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-white text-xs font-bold">Últimos Pagamentos</h3>
                <p className="text-[10px] text-white/30 mb-2">Movimentações da minha unidade</p>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1 flex-1">
                {loading ? <Spinner /> : moradorFinances.length === 0 ? (
                  <p className="text-white/25 text-[10px] text-center py-4">Nenhum lançamento registrado.</p>
                ) : moradorFinances.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-xl bg-white/2 border border-white/5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: f.type === 'receita' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                        <CheckCircle2 size={12} style={{ color: f.type === 'receita' ? GREEN : RED }} />
                      </div>
                      <div>
                        <p className="text-white font-bold leading-none mb-0.5 truncate max-w-[140px]">{f.description}</p>
                        <p className="text-[9px] text-white/40">{formatDate(f.due_date)}</p>
                      </div>
                    </div>
                    <span className="font-extrabold" style={{ color: f.type === 'receita' ? GREEN : RED }}>
                      {formatCurrency(f.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comunicados Recentes */}
            <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-white text-xs font-bold">Comunicados & Avisos</h3>
                <p className="text-[10px] text-white/30 mb-2">Importante para a comunidade</p>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1 flex-1">
                {loading ? <Spinner /> : announcements.slice(0, 3).map(a => (
                  <div key={a.id} className="p-2.5 rounded-xl bg-white/3 border border-white/5 text-[10.5px]">
                    <span className={`badge py-0.5 px-1.5 text-[8px] uppercase font-extrabold ${a.priority === 'urgente' ? 'badge-red' : 'badge-yellow'}`}>
                      {a.priority}
                    </span>
                    <h4 className="text-white font-bold mt-1 leading-snug">{a.title}</h4>
                    <span className="text-[9px] text-white/40 mt-1 block">{formatDate(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlidePanel>
      )
    },
    {
      key: 'morador-atalhos',
      label: 'Ações Rápidas',
      content: (
        <SlidePanel
          eyebrow="Menu de Serviços"
          title={<>Atalhos & <span className="grad-text">Ações Rápidas</span></>}
          badges={[
            { icon: '📅', label: 'Agendamentos' },
            { icon: '🔒', label: 'Portaria' },
            { icon: '📣', label: 'Mural Geral' }
          ]}
        >
          <div className="flex flex-col h-full gap-4 justify-center">
            <p className="text-white/60 text-sm leading-relaxed text-center mb-1">
              Acesse os principais módulos do portal de forma rápida e segura:
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
              {[
                { label: 'Agendamentos', path: '/agendamentos', icon: Calendar, color: CYAN, desc: 'Reserve espaços comuns.' },
                { label: 'Portaria Digital', path: '/portaria', icon: Shield, color: GREEN, desc: 'Autorize visitas online.' },
                { label: 'Registrar Ocorrência', path: '/ocorrencias', icon: AlertCircle, color: RED, desc: 'Notifique a gestão.' },
                { label: 'Galeria Condomínio', path: '/galeria', icon: Image, color: BLUE, desc: 'Fotos dos lagos e vias.' }
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={() => quickNav(btn.path)}
                  className="p-3 rounded-2xl bg-white/3 border border-white/8 hover:bg-cyan/10 hover:border-cyan/30 text-white transition-all text-left flex flex-col gap-2 cursor-pointer group"
                >
                  <btn.icon size={16} style={{ color: btn.color }} className="group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none mb-0.5">{btn.label}</h4>
                    <p className="text-[9px] text-white/40 leading-snug mt-0.5">{btn.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </SlidePanel>
      )
    }
  ];

  return (
    <div
      className="w-full h-full"
      style={{
        backgroundImage: 'url(/bg-dashboard.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'local',
      }}
    >
      <div style={{ width: '100%', height: '100%', background: 'rgba(5,10,22,0.55)', backdropFilter: 'none' }}>
        <PageCarousel3D slides={isGestor ? gestorSlides : moradorSlides} />
      </div>
    </div>
  );
};
