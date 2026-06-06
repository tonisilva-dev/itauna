import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Clock, Activity, MapPin, AlertCircle,
  Download, Filter, ArrowUp, ArrowDown,
} from 'lucide-react';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import {
  fetchAnalyticsSummary, fetchAccessByType, fetchAccessByHour,
  fetchTopDestinos, fetchTopVisitantes, fetchDailyFlowSeries,
  type AnalyticsSummary, type AccessByType, type AccessByHour,
  type TopDestino, type TopVisitante, type DailyFlowPoint,
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
  const [periodo, setPeriodo] = useState(7);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [byType, setByType] = useState<AccessByType[]>([]);
  const [byHour, setByHour] = useState<AccessByHour[]>([]);
  const [topDestinos, setTopDestinos] = useState<TopDestino[]>([]);
  const [topVisitantes, setTopVisitantes] = useState<TopVisitante[]>([]);
  const [dailyFlow, setDailyFlow] = useState<DailyFlowPoint[]>([]);

  const [dataInicio, dataFim] = getPeriod(periodo);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAnalyticsSummary(dataInicio, dataFim),
      fetchAccessByType(dataInicio, dataFim),
      fetchAccessByHour(dataInicio, dataFim),
      fetchTopDestinos(dataInicio, dataFim),
      fetchTopVisitantes(dataInicio, dataFim),
      fetchDailyFlowSeries(dataInicio, dataFim),
    ]).then(([s, t, h, d, v, f]) => {
      setSummary(s);
      setByType(t);
      setByHour(h);
      setTopDestinos(d);
      setTopVisitantes(v);
      setDailyFlow(f);
    }).catch(() => toast.error('Erro ao carregar análises.'))
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  const chartHeight = 200;
  const maxHour = Math.max(...byHour.map(h => h.acessos), 1);
  const maxFlow = Math.max(...dailyFlow.map(d => d.acessos), 1);

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
      key: 'analise-destinos',
      label: 'Por Destino',
      content: (
        <SlidePanel
          eyebrow="Localização"
          title={<>Chácaras Mais <span className="grad-text">Visitadas</span></>}
          badges={[
            { icon: '🏡', label: `${topDestinos.length} destinos` },
            { icon: '👥', label: `${topDestinos.reduce((a, b) => a + b.acessos, 0)} acessos` },
          ]}
        >
          <div className="flex flex-col h-full gap-2">
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-white/30">Carregando...</div>
            ) : (
              <>
                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                  {topDestinos.slice(0, 12).map((d, i) => (
                    <div key={i} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }} className="truncate">
                          {d.destino}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: CYAN, fontWeight: 600 }}>{d.acessos}</span>
                      </div>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                        Tempo médio: {d.tempo_medio_minutos}m
                      </p>
                    </div>
                  ))}
                </div>

                {topDestinos.length === 0 && (
                  <div className="flex items-center justify-center flex-1 text-white/30 text-xs">
                    Sem dados no período
                  </div>
                )}
              </>
            )}
          </div>
        </SlidePanel>
      ),
    },

    {
      key: 'analise-visitantes',
      label: 'Top Visitantes',
      content: (
        <SlidePanel
          eyebrow="Frequência"
          title={<>Visitantes Mais <span className="grad-text">Assíduos</span></>}
          badges={[
            { icon: '🔁', label: 'Reincidências' },
            { icon: '👥', label: `Top ${topVisitantes.length}` },
          ]}
        >
          <div className="flex flex-col h-full gap-2">
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-white/30">Carregando...</div>
            ) : (
              <>
                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                  {topVisitantes.slice(0, 10).map((v, i) => {
                    const icon = v.tipo === 'visitante' ? '👤' : v.tipo === 'entrega' ? '📦' : '🔧';
                    return (
                      <div key={i} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span>{icon}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }} className="flex-1 truncate">
                            {v.nome}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: CYAN, fontWeight: 600 }}>{v.acessos}x</span>
                        </div>
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                          Última: {new Date(v.ultima_visita).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {topVisitantes.length === 0 && (
                  <div className="flex items-center justify-center flex-1 text-white/30 text-xs">
                    Sem dados no período
                  </div>
                )}
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
