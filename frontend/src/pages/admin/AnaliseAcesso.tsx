import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Clock, AlertCircle, ArrowUp, ArrowDown, FileDown,
} from 'lucide-react';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  fetchAnalyticsSummary, fetchAccessByType, fetchAccessByHour,
  fetchDailyFlowSeries,
  type AnalyticsSummary, type AccessByType, type AccessByHour,
  type DailyFlowPoint,
} from '@/lib/supabase-queries';

const GREEN = '#10b981';
const CYAN = '#57d8ff';
const BLUE = '#5a84ff';
const YELLOW = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a78bfa';

const TODAY = new Date().toISOString().slice(0, 10);

const getPeriod = (dias: number): [string, string] => {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - dias * 86400000);
  return [inicio.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)];
};

export const AnaliseAcesso = () => {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState(7);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [byType, setByType] = useState<AccessByType[]>([]);
  const [byHour, setByHour] = useState<AccessByHour[]>([]);
  const [dailyFlow, setDailyFlow] = useState<DailyFlowPoint[]>([]);

  const [dataInicio, dataFim] = getPeriod(periodo);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAnalyticsSummary(dataInicio, dataFim),
      fetchAccessByType(dataInicio, dataFim),
      fetchAccessByHour(dataInicio, dataFim),
      fetchDailyFlowSeries(dataInicio, dataFim),
    ]).then(([s, t, h, f]) => {
      setSummary(s);
      setByType(t);
      setByHour(h);
      setDailyFlow(f);
    }).catch(() => toast.error('Erro ao carregar análises.'))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  const chartHeight = 200;
  const maxHour = Math.max(...byHour.map(h => h.acessos), 1);
  const maxFlow = Math.max(...dailyFlow.map(d => d.acessos), 1);

  const TIPO_LABEL: Record<string, string> = { visitante: 'Visitante', entrega: 'Entrega', servico: 'Prestador' };

  const exportarPDF = async () => {
    if (loading || !summary) { toast.error('Aguarde o carregamento dos dados.'); return; }
    try {
      toast.loading('Gerando PDF...', { id: 'pdf-acesso' });
      const { ReportBuilder, REPORT_COLORS, loadCondoLogo } = await import('@/lib/pdf-report');
      const logo = await loadCondoLogo();
      const periodoLabel = periodo === 1 ? 'Hoje' : `Últimos ${periodo} dias`;
      const rb = new ReportBuilder({
        title: 'Relatório de Análise de Acesso',
        subtitle: 'Raio-X da dinâmica de acesso ao condomínio',
        period: `${periodoLabel} (${dataInicio} a ${dataFim})`,
        generatedBy: user?.full_name,
        logo,
      });

      // KPIs
      rb.kpiRow([
        { label: 'Total de acessos', value: String(summary.total_acessos_hoje), accent: REPORT_COLORS.cyan },
        { label: 'Dentro agora', value: String(summary.dentro_agora), accent: REPORT_COLORS.green },
        { label: 'Tempo médio', value: `${summary.tempo_medio_minutos}m`, accent: REPORT_COLORS.blue },
        { label: 'Sem saída', value: String(summary.sem_saida), accent: REPORT_COLORS.amber },
      ]);

      // Comparativo
      const delta = summary.total_acessos_hoje - summary.acessos_ontem;
      rb.paragraph(
        `Comparativo com o dia anterior: ${delta >= 0 ? '+' : ''}${delta} acessos ` +
        `(${summary.total_acessos_hoje} no período recente vs ${summary.acessos_ontem} ontem).`
      );

      // Distribuição por tipo
      rb.sectionTitle('Distribuição por Tipo de Acesso');
      rb.table(
        ['Tipo', 'Acessos', 'Participação'],
        byType.map(t => [TIPO_LABEL[t.tipo] ?? t.tipo, t.total, `${t.porcentagem}%`]),
      );

      // Fluxo por hora
      rb.sectionTitle('Fluxo por Hora do Dia');
      rb.barChart(
        byHour.map(h => ({ label: `${h.hora}h`, value: h.acessos })),
        { color: REPORT_COLORS.cyan, labelEvery: 2 },
      );
      const horaPico = byHour.reduce((a, b) => b.acessos > a.acessos ? b : a, byHour[0]);
      rb.paragraph(`Horário de maior fluxo: ${horaPico.hora}h, com ${horaPico.acessos} acessos.`);

      // Evolução diária
      if (dailyFlow.length > 0) {
        rb.sectionTitle('Evolução Diária');
        rb.barChart(
          dailyFlow.map(d => ({
            label: new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            value: d.acessos,
          })),
          { color: REPORT_COLORS.teal, labelEvery: dailyFlow.length > 14 ? 3 : 1 },
        );
        rb.table(
          ['Data', 'Acessos', 'Permanência média'],
          dailyFlow.map(d => [
            new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR'),
            d.acessos,
            `${d.media_permanencia}m`,
          ]),
        );
      }

      rb.save(`analise-acesso-${dataInicio}_a_${dataFim}.pdf`);
      toast.success('Relatório PDF gerado!', { id: 'pdf-acesso' });
    } catch {
      toast.error('Erro ao gerar o PDF.', { id: 'pdf-acesso' });
    }
  };

  const exportarExecutivo = async () => {
    try {
      toast.loading('Gerando relatório executivo...', { id: 'pdf-exec' });
      const { generateExecutiveReport } = await import('@/lib/pdf-report');
      const rb = await generateExecutiveReport({ periodoDias: periodo === 1 ? 7 : periodo, generatedBy: user?.full_name });
      rb.save(`relatorio-executivo-${dataFim}.pdf`);
      toast.success('Relatório executivo gerado!', { id: 'pdf-exec' });
    } catch {
      toast.error('Erro ao gerar o relatório executivo.', { id: 'pdf-exec' });
    }
  };

  const slides: SlideItem[] = [
    {
      key: 'analise-overview',
      label: 'Visão Geral',
      content: (
        <SlidePanel
          eyebrow="Analytics de Acesso"
          title={<>Dinâmica de <span className="grad-text">Acesso</span></>}
          badges={[
            { icon: '📊', label: `${periodo}d selecionado` },
            { icon: summary && summary.total_acessos_hoje > summary.acessos_ontem ? '📈' : '📉', label: 'Comparativo' },
            { icon: '🔍', label: 'Raio-X do condomínio' },
          ]}
          actions={
            <div className="flex gap-1.5">
              <button onClick={exportarPDF} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
                <FileDown size={13} /> PDF
              </button>
              <button onClick={exportarExecutivo} title="Relatório consolidado: Acesso + Finanças" className="py-1.5 px-3 text-xs gap-1 flex items-center rounded-xl font-bold cursor-pointer" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
                <FileDown size={13} /> Executivo
              </button>
            </div>
          }
        >
          <div className="flex flex-col h-full gap-3">
            {/* Período selector */}
            <div className="flex gap-1 p-0.5 rounded-xl bg-white/5">
              {[1, 7, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setPeriodo(d)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                  style={{
                    background: periodo === d ? 'rgba(87,216,255,0.15)' : 'transparent',
                    color: periodo === d ? CYAN : 'rgba(255,255,255,0.45)',
                    border: periodo === d ? '1px solid rgba(87,216,255,0.25)' : '1px solid transparent',
                  }}
                >
                  {d === 1 ? 'Hoje' : d === 7 ? '7 dias' : '30 dias'}
                </button>
              ))}
            </div>

            {/* StatCards */}
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-white/30 text-xs">Carregando...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="Total acessos"
                    value={String(summary?.total_acessos_hoje ?? 0)}
                    icon={TrendingUp}
                    iconColor={CYAN}
                    iconBg="rgba(87,216,255,0.08)"
                  />
                  <StatCard
                    label="Agora dentro"
                    value={String(summary?.dentro_agora ?? 0)}
                    icon={Users}
                    iconColor={GREEN}
                    iconBg="rgba(16,185,129,0.08)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="Tempo médio"
                    value={`${summary?.tempo_medio_minutos ?? 0}m`}
                    icon={Clock}
                    iconColor={BLUE}
                    iconBg="rgba(90,132,255,0.08)"
                  />
                  <StatCard
                    label="Sem saída"
                    value={String(summary?.sem_saida ?? 0)}
                    icon={AlertCircle}
                    iconColor={YELLOW}
                    iconBg="rgba(245,158,11,0.08)"
                  />
                </div>

                {/* Comparativo */}
                <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>COMPARATIVO vs ONTEM</p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{summary?.total_acessos_hoje ?? 0}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem' }}>
                      {(summary?.total_acessos_hoje ?? 0) > (summary?.acessos_ontem ?? 0) ? (
                        <>
                          <ArrowUp size={12} style={{ color: GREEN }} />
                          <span style={{ color: GREEN, fontWeight: 600 }}>+{(summary?.total_acessos_hoje ?? 0) - (summary?.acessos_ontem ?? 0)}</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown size={12} style={{ color: RED }} />
                          <span style={{ color: RED, fontWeight: 600 }}>{(summary?.total_acessos_hoje ?? 0) - (summary?.acessos_ontem ?? 0)}</span>
                        </>
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>vs ontem</span>
                    </div>
                  </div>
                </div>

                <div className="text-[0.65rem] text-center text-white/25 mt-auto">
                  Período: {dataInicio} a {dataFim}
                </div>
              </>
            )}
          </div>
        </SlidePanel>
      ),
    },

    {
      key: 'analise-tipos',
      label: 'Por Tipo',
      content: (
        <SlidePanel
          eyebrow="Segmentação"
          title={<>Acessos por <span className="grad-text">Tipo</span></>}
          badges={[
            { icon: '📊', label: `${byType.reduce((a, b) => a + b.total, 0)} total` },
            { icon: '👤', label: 'Moradores, visitantes...' },
          ]}
        >
          <div className="flex flex-col h-full gap-2">
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-white/30">Carregando...</div>
            ) : (
              <>
                <div className="space-y-2 flex-1">
                  {byType.map(t => {
                    const icon = t.tipo === 'visitante' ? '👤' : t.tipo === 'entrega' ? '📦' : '🔧';
                    const cores: Record<string, string> = {
                      visitante: CYAN,
                      entrega: YELLOW,
                      servico: BLUE,
                    };
                    return (
                      <div key={t.tipo}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                            {icon} {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{t.total} ({t.porcentagem}%)</span>
                        </div>
                        <div
                          style={{
                            height: 24,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${t.porcentagem}%`,
                              background: cores[t.tipo],
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl p-2.5 text-[0.65rem] text-center text-white/25">
                  Distribuição percentual de acessos por tipo
                </div>
              </>
            )}
          </div>
        </SlidePanel>
      ),
    },

    {
      key: 'analise-horas',
      label: 'Por Hora',
      content: (
        <SlidePanel
          eyebrow="Padrão Temporal"
          title={<>Fluxo por <span className="grad-text">Hora do Dia</span></>}
          badges={[
            { icon: '⏰', label: 'Picos identificados' },
            { icon: '📈', label: `Max: ${maxHour}` },
          ]}
        >
          <div className="flex flex-col h-full gap-3">
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-white/30">Carregando...</div>
            ) : (
              <>
                <div
                  style={{
                    height: chartHeight,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2,
                    padding: '8px 4px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {byHour.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${(h.acessos / maxHour) * 100}%`,
                        minHeight: 4,
                        background: `linear-gradient(180deg, ${CYAN} 0%, ${BLUE} 100%)`,
                        borderRadius: 3,
                        cursor: 'pointer',
                        opacity: h.acessos === 0 ? 0.2 : 1,
                      }}
                      title={`${h.hora}h: ${h.acessos} acessos`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1 text-[0.6rem] text-white/30">
                  {[0, 6, 12, 18, 23].map(h => (
                    <div key={h} style={{ textAlign: h === 23 ? 'right' : 'left' }}>
                      {h}h
                    </div>
                  ))}
                </div>

                <div className="rounded-xl p-2.5 text-[0.65rem] text-center text-white/25">
                  Hora com maior fluxo: {byHour.reduce((a, b) => b.acessos > a.acessos ? b : a, byHour[0]).hora}h
                </div>
              </>
            )}
          </div>
        </SlidePanel>
      ),
    },

    {
      key: 'analise-series',
      label: 'Série Temporal',
      content: (
        <SlidePanel
          eyebrow="Evolução"
          title={<>Fluxo <span className="grad-text">Por Dia</span></>}
          badges={[
            { icon: '📈', label: `${dailyFlow.length} dias` },
            { icon: '📊', label: 'Tendência' },
          ]}
        >
          <div className="flex flex-col h-full gap-3">
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-white/30">Carregando...</div>
            ) : (
              <>
                <div
                  style={{
                    height: chartHeight,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2,
                    padding: '8px 4px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'auto',
                  }}
                >
                  {dailyFlow.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        minWidth: 12,
                        height: `${(d.acessos / maxFlow) * 100}%`,
                        minHeight: 4,
                        background: `linear-gradient(180deg, ${PURPLE} 0%, ${CYAN} 100%)`,
                        borderRadius: 2,
                        cursor: 'pointer',
                        opacity: d.acessos === 0 ? 0.2 : 1,
                      }}
                      title={`${d.data}: ${d.acessos} acessos, ${d.media_permanencia}m média`}
                    />
                  ))}
                </div>

                <div className="text-[0.65rem] text-center text-white/25">
                  Permanência média série: {Math.round(dailyFlow.reduce((a, b) => a + b.media_permanencia, 0) / (dailyFlow.length || 1))}m
                </div>
              </>
            )}
          </div>
        </SlidePanel>
      ),
    },
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />
    </div>
  );
};
