import { gotoSlide } from '../../utils/format';
import { useState, useEffect } from 'react';
import {
  Shield, Car, User, Clock, CheckCircle2, Plus, Loader2,
  Trash2, UserPlus, AlertTriangle, History, Package, Wrench,
  ChevronRight, CalendarDays,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPortariaHoje, fetchPortariaByDate, fetchPortariaByChacara,
  fetchPortariaAutorizados, fetchPortariaAutorizadosByChacara,
  insertPortariaEntrada, registerPortariaSaida,
  insertPortariaAutorizado, removePortariaAutorizado,
  type DbPortariaRegistro, type DbPortariaAutorizado,
} from '@/lib/supabase-queries';

const GREEN  = '#10b981';
const CYAN   = '#57d8ff';
const BLUE   = '#5a84ff';
const YELLOW = '#f59e0b';
const RED    = '#ef4444';
const TODAY  = new Date().toISOString().slice(0, 10);

const TIPO_CONFIG = {
  visitante: { icon: User,    color: CYAN,   label: 'Visitante',  bg: 'rgba(87,216,255,0.08)'  },
  entrega:   { icon: Package, color: YELLOW, label: 'Entrega',    bg: 'rgba(245,158,11,0.08)'  },
  servico:   { icon: Wrench,  color: BLUE,   label: 'Prestador',  bg: 'rgba(90,132,255,0.08)'  },
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const isVencido = (validade: string | null) => {
  if (!validade) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return validade < hoje;
};

export const Portaria = () => {
  const { user, isGestor } = useAuth();
  const [visitas, setVisitas]         = useState<DbPortariaRegistro[]>([]);
  const [histVisitas, setHistVisitas] = useState<DbPortariaRegistro[]>([]);
  const [autorizados, setAutorizados] = useState<DbPortariaAutorizado[]>([]);
  const [loading, setLoading]         = useState(true);
  const [histDate, setHistDate]       = useState(TODAY);
  const [histLoading, setHistLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState<'movimento' | 'autorizados'>('movimento');
  const [tipoFilter, setTipoFilter]   = useState('');
  const [removeId, setRemoveId]     = useState<string | null>(null);
  const [removeName, setRemoveName] = useState('');

  // Form entrada
  const [nome, setNome]       = useState('');
  const [veiculo, setVeiculo] = useState('');
  const [tipo, setTipo]       = useState<DbPortariaRegistro['tipo']>('visitante');
  const [destino, setDestino] = useState('chacara');
  const [chacara, setChacara] = useState('');
  const [areaComum, setAreaComum] = useState('Portaria');
  const [submitting, setSubmitting] = useState(false);

  // Form autorizado
  const [autNome, setAutNome]     = useState('');
  const [autChacara, setAutChacara] = useState('');
  const [autDias, setAutDias]     = useState('');
  const [autValidade, setAutValidade] = useState('');
  const [submittingAut, setSubmittingAut] = useState(false);

  useEffect(() => {
    if (!user) return;
    const chacaraNum = user.unit_number ? String(user.unit_number).padStart(3, '0') : null;
    Promise.all([
      isGestor ? fetchPortariaHoje() : (chacaraNum ? fetchPortariaByChacara(chacaraNum) : Promise.resolve([])),
      isGestor ? fetchPortariaAutorizados() : (chacaraNum ? fetchPortariaAutorizadosByChacara(chacaraNum) : Promise.resolve([])),
    ]).then(([vis, aut]) => { setVisitas(vis); setHistVisitas(vis); setAutorizados(aut); })
      .catch(() => toast.error('Erro ao carregar dados da portaria.'))
      .finally(() => setLoading(false));
  }, [user, isGestor]);

  // Histórico por data — usa estado separado para não apagar dados ao vivo
  const loadHistDate = async (date: string) => {
    setHistDate(date);
    setHistLoading(true);
    try {
      const data = date === TODAY
        ? visitas  // volta aos dados ao vivo sem nova query
        : await fetchPortariaByDate(date);
      setHistVisitas(data);
    } catch { toast.error('Erro ao carregar histórico.'); }
    finally { setHistLoading(false); }
  };

  const dentroCount   = visitas.filter(v => v.status === 'dentro').length;
  const vencidosCount = autorizados.filter(a => isVencido(a.validade)).length;

  const filteredVisitas = (tipoFilter
    ? histVisitas.filter(v => v.tipo === tipoFilter)
    : histVisitas);

  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    if (destino === 'chacara' && !chacara.trim()) { toast.error('Informe o número da chácara.'); return; }
    const destinoStr =
      destino === 'chacara' ? `Chácara ${chacara.padStart(3, '0')}` :
      destino === 'portaria' ? 'Portaria' : areaComum;
    setSubmitting(true);
    try {
      const entry = await insertPortariaEntrada({
        nome: nome.trim(), veiculo: veiculo.trim() || null,
        tipo, destino: destinoStr, registrado_por: user!.id,
      });
      setVisitas(prev => [entry, ...prev]);
      if (histDate === TODAY) setHistVisitas(prev => [entry, ...prev]);
      setNome(''); setVeiculo(''); setChacara('');
      toast.success('Entrada registrada com sucesso!');
    } catch { toast.error('Erro ao registrar entrada.'); }
    finally { setSubmitting(false); }
  };

  const handleRegisterExit = async (id: string) => {
    try {
      await registerPortariaSaida(id);
      const patch = (v: DbPortariaRegistro) =>
        v.id === id ? { ...v, status: 'saiu' as const, saida_at: new Date().toISOString() } : v;
      setVisitas(prev => prev.map(patch));
      setHistVisitas(prev => prev.map(patch));
      toast.success('Saída registrada.');
    } catch { toast.error('Erro ao registrar saída.'); }
  };

  const handleCreateAutorizado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autNome.trim()) { toast.error('Informe o nome do autorizado.'); return; }
    setSubmittingAut(true);
    try {
      const novo = await insertPortariaAutorizado({
        nome: autNome.trim(), chacara: autChacara.trim() || null,
        dias: autDias.trim() || null, validade: autValidade || null, created_by: user!.id,
      });
      setAutorizados(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setAutNome(''); setAutChacara(''); setAutDias(''); setAutValidade('');
      toast.success('Autorizado cadastrado com sucesso!');
      gotoSlide(1);
    } catch { toast.error('Erro ao cadastrar autorizado.'); }
    finally { setSubmittingAut(false); }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    try {
      await removePortariaAutorizado(removeId);
      setAutorizados(prev => prev.filter(a => a.id !== removeId));
      toast.success('Autorização revogada.');
    } catch { toast.error('Erro ao revogar autorização.'); }
    finally { setRemoveId(null); setRemoveName(''); }
  };

  // ─────────────────────────────────────────────────────────────────
  const slides: SlideItem[] = [

    /* ── Slide 1: Dashboard / Dentro agora ── */
    {
      key: 'portaria-controle',
      label: 'Controle',
      content: (
        <SlidePanel
          eyebrow={isGestor ? 'Central de Segurança' : 'Minha Chácara'}
          title={<>Controle de <span className="grad-text">Acesso</span></>}
          badges={[
            { icon: '🛡️', label: 'Monitoramento 24h' },
            { icon: dentroCount > 0 ? '🟡' : '🟢', label: `${dentroCount} dentro agora` },
            { icon: '⚡', label: 'Tempo Real' },
          ]}
          actions={
            isGestor ? (
              <button
                onClick={() => { gotoSlide(2); }}
                className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
              >
                <Plus size={13} /> Entrada
              </button>
            ) : undefined
          }
        >
          <div className="flex flex-col h-full gap-3">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Dentro agora"   value={String(dentroCount)}         icon={User}         iconColor={GREEN}  iconBg="rgba(16,185,129,0.08)" />
              <StatCard label="Entradas hoje"  value={String(visitas.length)}       icon={Car}          iconColor={CYAN}   iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Autorizados"    value={String(autorizados.length)}   icon={CheckCircle2} iconColor={BLUE}   iconBg="rgba(90,132,255,0.08)" />
              <StatCard
                label="Aut. Vencidos"
                value={String(vencidosCount)}
                icon={Clock}
                iconColor={vencidosCount > 0 ? YELLOW : GREEN}
                iconBg={vencidosCount > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'}
              />
            </div>

            {/* Quem está dentro agora */}
            <div className="rounded-2xl bg-white/3 border border-white/5 p-3.5 flex-1 flex flex-col min-h-[120px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-white text-xs font-bold">
                    {isGestor ? 'Atualmente no Condomínio' : 'Visitantes na Minha Chácara'}
                  </h3>
                  <p className="text-[10px] text-white/30">Entradas com saída pendente</p>
                </div>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-white/30 text-[10px]">
                    <Loader2 size={13} className="animate-spin" /> Carregando...
                  </div>
                ) : visitas.filter(v => v.status === 'dentro').length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'rgba(16,185,129,0.4)' }} />
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                      {isGestor ? 'Nenhum visitante ativo no momento.' : 'Nenhuma visita registrada hoje.'}
                    </p>
                  </div>
                ) : visitas.filter(v => v.status === 'dentro').map(v => {
                  const tc = TIPO_CONFIG[v.tipo];
                  return (
                    <div key={v.id}
                      className="flex items-center gap-2.5 p-2 rounded-xl transition-all"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                        <tc.icon size={13} style={{ color: tc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{v.nome}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                          {v.veiculo ?? 'Sem veículo'} · {v.destino} · desde {fmtTime(v.entrada_at)}
                        </p>
                      </div>
                      {isGestor && (
                        <button
                          onClick={() => handleRegisterExit(v.id)}
                          className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer flex-shrink-0"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          Saída
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SlidePanel>
      ),
    },

    /* ── Slide 2: Histórico + Autorizados ── */
    {
      key: 'portaria-historico',
      label: 'Histórico',
      content: (
        <SlidePanel
          eyebrow="Logs & Autorizados"
          title={<>Registros de <span className="grad-text">Acesso</span></>}
          badges={[
            { icon: '📋', label: 'Auditável' },
            { icon: '◈', label: 'Por data' },
            { icon: '✅', label: 'Autorizados fixos' },
          ]}
        >
          <div className="flex flex-col h-full gap-2.5">
            {/* Tabs */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-0.5 p-0.5 rounded-xl bg-white/5 w-fit">
                {([
                  { v: 'movimento',   l: '🚗 Movimentação' },
                  { v: 'autorizados', l: '✅ Autorizados'  },
                ] as const).map(t => (
                  <button key={t.v}
                    onClick={() => { setActiveTab(t.v); setTipoFilter(''); }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                    style={{
                      background: activeTab === t.v ? 'rgba(87,216,255,0.15)' : 'transparent',
                      color: activeTab === t.v ? '#57d8ff' : 'rgba(255,255,255,0.45)',
                      border: activeTab === t.v ? '1px solid rgba(87,216,255,0.25)' : '1px solid transparent',
                    }}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
              {isGestor && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input
                    type="date" className="input py-1 px-2 text-[10px]" style={{ width: 130 }}
                    value={histDate} max={TODAY}
                    onChange={e => loadHistDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Filtro por tipo — só na tab movimentação */}
            {isGestor && activeTab === 'movimento' && (
              <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 w-fit">
                {[
                  { v: '',          l: 'Todos' },
                  { v: 'visitante', l: '👤 Visitante' },
                  { v: 'entrega',   l: '📦 Entrega' },
                  { v: 'servico',   l: '🔧 Serviço' },
                ].map(f => (
                  <button key={f.v} onClick={() => setTipoFilter(f.v)}
                    className={`px-2 py-1 rounded text-[9.5px] cursor-pointer font-bold whitespace-nowrap transition-all ${
                      tipoFilter === f.v ? 'bg-cyan text-[#07101c] font-extrabold' : 'bg-transparent text-white/50'
                    }`}>{f.l}</button>
                ))}
              </div>
            )}

            {/* Lista de registros — tab movimentação */}
            {activeTab === 'movimento' && <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {(loading || histLoading) ? (
                <div className="flex items-center justify-center gap-2 py-8 text-white/30 text-xs">
                  <Loader2 size={14} className="animate-spin" />
                </div>
              ) : filteredVisitas.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8">
                  {histDate !== TODAY ? `Sem registros em ${format(parseISO(histDate), 'dd/MM/yyyy')}` : 'Nenhum registro hoje.'}
                </p>
              ) : filteredVisitas.map(v => {
                const tc = TIPO_CONFIG[v.tipo];
                return (
                  <div key={v.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border transition-all"
                    style={{
                      background: v.status === 'dentro' ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                      borderColor: v.status === 'dentro' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)',
                    }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                      <tc.icon size={12} style={{ color: tc.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{v.nome}</p>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                        {v.veiculo ?? 'Sem veículo'} · {v.destino}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end mb-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.status === 'dentro' ? GREEN : 'rgba(255,255,255,0.25)' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: v.status === 'dentro' ? GREEN : 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                          {v.status === 'dentro' ? 'Dentro' : 'Saiu'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)' }}>
                        {fmtTime(v.entrada_at)}{v.saida_at ? ` → ${fmtTime(v.saida_at)}` : ''}
                      </p>
                    </div>
                    {isGestor && v.status === 'dentro' && (
                      <button
                        onClick={() => handleRegisterExit(v.id)}
                        className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer flex-shrink-0 ml-1"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        Saída
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            }

            {/* Tab autorizados — lista completa com espaço */}
            {activeTab === 'autorizados' && (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {autorizados.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8">Nenhum autorizado fixo cadastrado.</p>
              ) : autorizados.map(a => {
                const vencido = isVencido(a.validade);
                return (
                  <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: vencido ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${vencido ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">{a.nome}</p>
                      <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {a.chacara && <span>{a.chacara}</span>}
                        {a.dias && <><span>·</span><span>{a.dias}</span></>}
                        {a.validade && (
                          <span style={{ color: vencido ? YELLOW : 'rgba(255,255,255,0.35)' }}>
                            · {vencido ? '⚠ Vencido ' : 'até '}
                            {new Date(a.validade + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: vencido ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: vencido ? YELLOW : GREEN, border: `1px solid ${vencido ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
                      {vencido ? 'Vencido' : 'Ativo'}
                    </span>
                    {isGestor && (
                      <button onClick={() => { setRemoveId(a.id); setRemoveName(a.nome); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <Trash2 size={10} style={{ color: '#fca5a5' }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {/* Autorizados fixos — resumo compacto na tab movimento */}
            {activeTab === 'movimento' && <div className="rounded-2xl bg-white/3 border border-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>Autorizados Fixos</p>
                {isGestor && (
                  <button
                    onClick={() => setActiveTab('autorizados')}
                    className="flex items-center gap-1 text-[9.5px] font-bold cursor-pointer"
                    style={{ color: CYAN }}
                  >
                    <UserPlus size={11} /> Novo
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-[100px] overflow-y-auto pr-0.5">
                {autorizados.length === 0 ? (
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
                    Nenhum autorizado fixo cadastrado.
                  </p>
                ) : autorizados.map(a => {
                  const vencido = isVencido(a.validade);
                  return (
                    <div key={a.id} className="flex items-center gap-2 p-2 rounded-xl"
                      style={{ background: vencido ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${vencido ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)'}` }}>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.72rem' }} className="truncate">{a.nome}</p>
                        <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {a.chacara && <span>{a.chacara}</span>}
                          {a.dias && <><span>·</span><span>{a.dias}</span></>}
                          {a.validade && (
                            <span style={{ color: vencido ? YELLOW : 'rgba(255,255,255,0.35)' }}>
                              · {vencido ? '⚠ Vencido ' : 'até '}
                              {new Date(a.validade).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                        style={{
                          background: vencido ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                          color: vencido ? YELLOW : GREEN,
                          border: `1px solid ${vencido ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                        }}
                      >
                        {vencido ? 'Vencido' : 'Ativo'}
                      </span>
                      {isGestor && (
                        <button
                          onClick={() => { setRemoveId(a.id); setRemoveName(a.nome); }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                        >
                          <Trash2 size={10} style={{ color: '#fca5a5' }} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>}
          </div>

          {/* Modal revogar */}
          {removeId && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
              <div className="rounded-2xl p-5 max-w-xs w-full mx-4 space-y-4" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: YELLOW }} />
                  </div>
                  <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Revogar Autorização?</h4>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{removeName}</strong> perderá o acesso fixo ao condomínio.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setRemoveId(null); setRemoveName(''); }} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                  <button onClick={handleRemove} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>Revogar</button>
                </div>
              </div>
            </div>
          )}
        </SlidePanel>
      ),
    },

    /* ── Slide 3: Registrar entrada (gestor/porteiro) ── */
    ...(isGestor ? [{
      key: 'portaria-cadastro',
      label: 'Registrar',
      content: (
        <SlidePanel
          eyebrow="Registrar Visitante"
          title={<>Autorizar <span className="grad-text">Nova Entrada</span></>}
          badges={[
            { icon: '✦', label: 'Cadastro Expresso' },
            { icon: '🔒', label: 'Log Auditável' },
            { icon: '⌘', label: 'Verificar Documento' },
          ]}
        >
          <form onSubmit={handleRegisterEntry} className="flex flex-col gap-3 py-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Nome Completo *</label>
                <input type="text" className="input" placeholder="Ex: Lucas Santana"
                  value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">Veículo & Placa</label>
                <input type="text" className="input" placeholder="Ex: Corolla Preto — ABC-1234"
                  value={veiculo} onChange={e => setVeiculo(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Tipo</label>
                <select className="input" value={tipo} onChange={e => setTipo(e.target.value as DbPortariaRegistro['tipo'])}>
                  <option value="visitante">👤 Visitante</option>
                  <option value="entrega">📦 Entrega / Encomenda</option>
                  <option value="servico">🔧 Prestador de Serviço</option>
                </select>
              </div>
              <div>
                <label className="input-label text-[11px]">Destino</label>
                <select className="input" value={destino} onChange={e => setDestino(e.target.value)}>
                  <option value="chacara">🏡 Chácara</option>
                  <option value="portaria">🛡️ Portaria</option>
                  <option value="comum">🌿 Área Comum</option>
                </select>
              </div>
            </div>

            {destino === 'chacara' && (
              <div>
                <label className="input-label text-[11px]">Número da Chácara *</label>
                <input type="text" className="input" placeholder="Ex: 042"
                  value={chacara} onChange={e => setChacara(e.target.value.replace(/\D/g, ''))} maxLength={3} required />
              </div>
            )}
            {destino === 'comum' && (
              <div>
                <label className="input-label text-[11px]">Área de Destino</label>
                <select className="input" value={areaComum} onChange={e => setAreaComum(e.target.value)}>
                  <option>Salão de Festas</option>
                  <option>Quadra Poliesportiva</option>
                  <option>Piscina</option>
                  <option>Quiosque</option>
                  <option>Campo de Futebol</option>
                </select>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
              {submitting ? <><Loader2 size={13} className="animate-spin" /> Registrando...</> : '✓ Confirmar e Liberar Entrada'}
            </button>
          </form>
        </SlidePanel>
      ),
    } as SlideItem] : []),

    /* ── Slide 4: Novo autorizado (gestor) ── */
    ...(isGestor ? [{
      key: 'portaria-autorizado',
      label: 'Novo Autorizado',
      content: (
        <SlidePanel
          eyebrow="Acesso Fixo Recorrente"
          title={<>Cadastrar <span className="grad-text">Autorizado Fixo</span></>}
          badges={[
            { icon: '✦', label: 'Prestador Recorrente' },
            { icon: '🔒', label: 'Acesso Controlado' },
            { icon: '📅', label: 'Validade Definida' },
          ]}
        >
          <form onSubmit={handleCreateAutorizado} className="flex flex-col gap-3.5 py-1 text-xs">
            <div>
              <label className="input-label text-[11px]">Nome do Prestador / Empresa *</label>
              <input type="text" className="input" placeholder="Ex: Ana Paula — Faxina Semanal"
                value={autNome} onChange={e => setAutNome(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Chácara de Destino</label>
                <input type="text" className="input" placeholder="Ex: Chácara 045"
                  value={autChacara} onChange={e => setAutChacara(e.target.value)} />
              </div>
              <div>
                <label className="input-label text-[11px]">Dias de Acesso</label>
                <input type="text" className="input" placeholder="Ex: Seg, Qua, Sex"
                  value={autDias} onChange={e => setAutDias(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="input-label text-[11px]">Validade da Autorização</label>
              <input type="date" className="input" min={TODAY}
                value={autValidade} onChange={e => setAutValidade(e.target.value)} />
            </div>
            <button type="submit" disabled={submittingAut}
              className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
              {submittingAut
                ? <><Loader2 size={13} className="animate-spin" /> Cadastrando...</>
                : <><UserPlus size={13} /> Cadastrar Autorizado Fixo</>
              }
            </button>
          </form>
        </SlidePanel>
      ),
    } as SlideItem] : []),
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />
    </div>
  );
};
