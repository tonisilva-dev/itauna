/**
 * Análise de Cenários — Simulador de impacto orçamentário.
 * Responde: "Se aprovarmos X, quanto aumenta a taxa por unidade?"
 * Acesso: admin + síndico.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  BarChart3, Users, DollarSign, CheckCircle2, Clock,
  AlertTriangle, XCircle, Zap,
} from 'lucide-react';
import {
  fetchCenarios, insertCenario, updateCenario, deleteCenario,
  type DbCenario,
} from '../../lib/supabase-queries';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

/* ── Constantes ────────────────────────────────────────────────── */
const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const AMBER  = '#f59e0b';
const BLUE   = '#5a84ff';
const RED    = '#ef4444';
const PURPLE = '#8b5cf6';

const TIPO_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  contratacao:    { label: 'Contratação de Funcionário', emoji: '👤', color: BLUE   },
  terceirizacao:  { label: 'Terceirização de Serviço',   emoji: '🔧', color: CYAN   },
  obra:           { label: 'Obra / Reforma',             emoji: '🏗️', color: AMBER  },
  equipamento:    { label: 'Compra de Equipamento',      emoji: '📦', color: PURPLE },
  seguranca:      { label: 'Investimento em Segurança',  emoji: '🛡️', color: GREEN  },
  financiamento:  { label: 'Financiamento',              emoji: '🏦', color: RED    },
  reajuste:       { label: 'Reajuste de Contrato',       emoji: '📋', color: AMBER  },
  outro:          { label: 'Outro',                      emoji: '📌', color: CYAN   },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  rascunho:   { label: 'Rascunho',    color: 'rgba(255,255,255,0.35)', Icon: Clock         },
  em_analise: { label: 'Em análise',  color: AMBER,                    Icon: AlertTriangle  },
  aprovado:   { label: 'Aprovado',    color: GREEN,                    Icon: CheckCircle2   },
  rejeitado:  { label: 'Rejeitado',   color: RED,                      Icon: XCircle        },
};

const TODOS_TIPOS = Object.entries(TIPO_CONFIG);
const TODOS_STATUS = Object.keys(STATUS_CONFIG);

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

/* ── Cálculo de impacto mensal de um cenário ── */
function impactoMensal(c: DbCenario): number {
  const recorrente = c.custo_mensal;
  const amortizado = c.periodo_meses && c.periodo_meses > 0
    ? c.custo_unico / c.periodo_meses
    : c.custo_unico; // custo único lançado no 1º mês
  return recorrente + amortizado;
}

function impactoPorUnidade(c: DbCenario): number {
  return impactoMensal(c) / (c.num_unidades || 389);
}

/* ── Estilos base ──────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
};
const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  color: '#fff', padding: '8px 12px', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};
const sel: React.CSSProperties = {
  ...inp,
  cursor: 'pointer',
  appearance: 'none' as React.CSSProperties['appearance'],
  WebkitAppearance: 'none' as React.CSSProperties['WebkitAppearance'],
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2300e5e5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 32,
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function parseBRL(display: string): number {
  const digits = display.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
}
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: 4,
};

/* ══════════════════════════════════════════════════════════════════
   FORMULÁRIO DE CENÁRIO
══════════════════════════════════════════════════════════════════ */
const EMPTY: Partial<DbCenario> = {
  titulo: '', tipo: 'contratacao', descricao: '',
  custo_mensal: 0, custo_unico: 0, periodo_meses: undefined,
  data_inicio: '', status: 'rascunho', num_unidades: 389,
};

const CenarioForm = ({
  initial, onSave, onCancel,
}: {
  initial: Partial<DbCenario>;
  onSave: (d: Partial<DbCenario>) => Promise<void>;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [displayMensal, setDisplayMensal] = useState(formatBRL(Math.round((initial.custo_mensal ?? 0) * 100)));
  const [displayUnico, setDisplayUnico] = useState(formatBRL(Math.round((initial.custo_unico ?? 0) * 100)));
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const total = (form.custo_mensal ?? 0) +
    ((form.custo_unico ?? 0) / (form.periodo_meses || 1));
  const porUnidade = total / (form.num_unidades || 389);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handle} style={{ ...card, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontWeight: 700, color: CYAN, fontSize: 14, margin: 0 }}>
        {initial.id ? 'Editar cenário' : 'Novo cenário'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <span style={lbl}>Título *</span>
          <input style={inp} required value={form.titulo ?? ''}
            onChange={e => f('titulo', e.target.value)}
            placeholder="Ex: Contratação de porteiro noturno" />
        </div>
        <div>
          <span style={lbl}>Tipo *</span>
          <select style={sel} value={form.tipo ?? 'outro'}
            onChange={e => f('tipo', e.target.value)}>
            {TODOS_TIPOS.map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#0d1b2a', color: '#fff' }}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={lbl}>Status</span>
          <select style={sel} value={form.status ?? 'rascunho'}
            onChange={e => f('status', e.target.value)}>
            {TODOS_STATUS.map(s => (
              <option key={s} value={s} style={{ background: '#0d1b2a', color: '#fff' }}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={lbl}>Custo mensal recorrente (R$)</span>
          <input style={inp} type="text" inputMode="numeric"
            value={displayMensal}
            onChange={e => {
              const fmt = formatBRL(parseInt(e.target.value.replace(/\D/g, '') || '0', 10));
              setDisplayMensal(fmt);
              f('custo_mensal', parseBRL(fmt));
            }}
            placeholder="R$ 0,00" />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            Salário, contrato recorrente, prestação...
          </p>
        </div>
        <div>
          <span style={lbl}>Custo único / obra (R$)</span>
          <input style={inp} type="text" inputMode="numeric"
            value={displayUnico}
            onChange={e => {
              const fmt = formatBRL(parseInt(e.target.value.replace(/\D/g, '') || '0', 10));
              setDisplayUnico(fmt);
              f('custo_unico', parseBRL(fmt));
            }}
            placeholder="R$ 0,00" />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            Equipamento, obra, compra pontual...
          </p>
        </div>
        <div>
          <span style={lbl}>Amortizar em (meses)</span>
          <input style={inp} type="number" min={1}
            value={form.periodo_meses ?? ''}
            onChange={e => f('periodo_meses', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Ex: 24" />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            Deixe vazio para lançar de uma vez
          </p>
        </div>
        <div>
          <span style={lbl}>Nº de unidades</span>
          <input style={inp} type="number" min={1}
            value={form.num_unidades ?? 360}
            onChange={e => f('num_unidades', parseInt(e.target.value) || 389)} />
        </div>
        <div>
          <span style={lbl}>Data de início prevista</span>
          <input style={inp} type="date"
            value={form.data_inicio ?? ''}
            onChange={e => f('data_inicio', e.target.value || null)} />
        </div>
      </div>

      <div>
        <span style={lbl}>Descrição / justificativa</span>
        <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }}
          value={form.descricao ?? ''}
          onChange={e => f('descricao', e.target.value)}
          placeholder="Descreva a necessidade, benefícios esperados, fornecedores considerados..." />
      </div>

      {/* Preview do impacto em tempo real */}
      {(form.custo_mensal! > 0 || form.custo_unico! > 0) && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'linear-gradient(135deg,rgba(87,216,255,0.08),rgba(90,132,255,0.06))',
          border: '1px solid rgba(87,216,255,0.2)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: CYAN, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            ⚡ Preview do impacto
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { l: 'Custo mensal total', v: fmt(total) },
              { l: 'Por unidade/mês',    v: fmt(porUnidade) },
              { l: 'Por unidade/ano',    v: fmt(porUnidade * 12) },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 'clamp(13px,2vw,16px)', fontWeight: 900, color: CYAN }}>{s.v}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '8px 16px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'transparent', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', fontSize: 13,
        }}>Cancelar</button>
        <button type="submit" disabled={saving} style={{
          padding: '8px 20px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg,#72e3ff,#669dff)',
          color: '#07101c', fontWeight: 700, cursor: 'pointer', fontSize: 13,
        }}>{saving ? 'Salvando…' : 'Salvar cenário'}</button>
      </div>
    </form>
  );
};

/* ── Card de cenário ── */
const CenarioCard = ({
  c, onEdit, onDelete, onStatusChange, selecionado, onToggleSelect,
}: {
  c: DbCenario;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  selecionado: boolean;
  onToggleSelect: () => void;
}) => {
  const t   = TIPO_CONFIG[c.tipo]   ?? TIPO_CONFIG.outro;
  const st  = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.rascunho;
  const imp = impactoMensal(c);
  const pu  = impactoPorUnidade(c);

  return (
    <div style={{
      ...card, padding: '16px 18px',
      borderLeft: `3px solid ${t.color}`,
      opacity: c.status === 'rejeitado' ? 0.55 : 1,
      outline: selecionado ? `2px solid ${CYAN}` : 'none',
      outlineOffset: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Checkbox seleção */}
        <button onClick={onToggleSelect} title="Incluir na simulação" style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
          border: `2px solid ${selecionado ? CYAN : 'rgba(255,255,255,0.2)'}`,
          background: selecionado ? CYAN : 'transparent',
          cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          {selecionado && <span style={{ color: '#07101c', fontSize: 11, fontWeight: 900 }}>✓</span>}
        </button>

        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{t.emoji}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{c.titulo}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: `${st.color}18`, border: `1px solid ${st.color}30` }}>
              <st.Icon size={10} style={{ color: st.color }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: st.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{st.label}</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{t.label}</p>
          {c.descricao && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, marginBottom: 8 }}>{c.descricao}</p>
          )}

          {/* Impacto financeiro */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { l: 'Custo/mês',       v: fmt(imp),      color: t.color },
              { l: 'Por unidade/mês', v: fmt(pu),       color: CYAN   },
              { l: 'Por unidade/ano', v: fmt(pu * 12),  color: CYAN   },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: s.color }}>{s.v}</p>
                <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Quick status change */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {TODOS_STATUS.map(s => (
              <button key={s} onClick={() => onStatusChange(s)}
                disabled={c.status === s}
                style={{
                  fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                  cursor: c.status === s ? 'default' : 'pointer',
                  background: c.status === s ? `${STATUS_CONFIG[s].color}22` : 'rgba(255,255,255,0.04)',
                  color: c.status === s ? STATUS_CONFIG[s].color : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${c.status === s ? STATUS_CONFIG[s].color + '40' : 'rgba(255,255,255,0.08)'}`,
                }}
              >{STATUS_CONFIG[s].label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={onEdit} title="Editar" style={{ width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} title="Excluir" style={{ width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: RED }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export const AnaliseCenarios = () => {
  const { user } = useAuth();
  const [cenarios, setCenarios] = useState<DbCenario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try { setCenarios(await fetchCenarios()); }
    catch { toast.error('Erro ao carregar cenários'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: Partial<DbCenario>) => {
    try {
      await insertCenario({ ...form, created_by: user?.id } as any);
      toast.success('Cenário criado');
      setCreating(false); load();
    } catch { toast.error('Erro ao criar'); }
  };

  const handleUpdate = async (id: string, form: Partial<DbCenario>) => {
    try {
      await updateCenario(id, form);
      toast.success('Atualizado');
      setEditId(null); load();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este cenário?')) return;
    try { await deleteCenario(id); toast.success('Removido'); load(); }
    catch { toast.error('Erro ao excluir'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await updateCenario(id, { status: status as any }); load(); }
    catch { toast.error('Erro ao atualizar status'); }
  };

  const toggleSelect = (id: string) => {
    setSelecionados(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtrados = filtroStatus ? cenarios.filter(c => c.status === filtroStatus) : cenarios;

  // Simulação com cenários selecionados
  const simulados = useMemo(() =>
    cenarios.filter(c => selecionados.has(c.id)),
    [cenarios, selecionados]
  );

  const totalSim     = simulados.reduce((s, c) => s + impactoMensal(c), 0);
  const porUnidSim   = simulados.length > 0
    ? simulados.reduce((s, c) => s + impactoPorUnidade(c), 0)
    : 0;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(16px,3vw,32px) clamp(16px,4vw,28px) 60px' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
            Gestão Financeira · Simulador
          </p>
          <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
            Análise de Cenários
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 520 }}>
            Simule o impacto financeiro de qualquer decisão antes de levá-la à assembleia.
            <em style={{ color: 'rgba(255,255,255,0.35)' }}> "Se contratarmos mais um porteiro, quanto aumenta a taxa por chácara?"</em>
          </p>
        </div>
        {!creating && !editId && (
          <button onClick={() => setCreating(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#72e3ff,#669dff)',
            color: '#07101c', fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            <Plus size={15} /> Novo cenário
          </button>
        )}
      </div>

      {/* Formulário novo */}
      {creating && (
        <CenarioForm initial={EMPTY} onSave={handleCreate} onCancel={() => setCreating(false)} />
      )}

      {/* Painel de simulação (quando há selecionados) */}
      {selecionados.size > 0 && (
        <div style={{
          padding: '16px 20px', borderRadius: 16, marginBottom: 24,
          background: 'linear-gradient(135deg,rgba(87,216,255,0.10),rgba(90,132,255,0.06))',
          border: `1px solid ${CYAN}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={14} style={{ color: CYAN }} />
            <p style={{ fontWeight: 800, color: CYAN, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Simulação — {selecionados.size} cenário{selecionados.size > 1 ? 's' : ''} selecionado{selecionados.size > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { l: 'Custo total/mês',    v: fmt(totalSim),          color: RED    },
              { l: 'Por unidade/mês',    v: fmt(porUnidSim),        color: CYAN   },
              { l: 'Por unidade/ano',    v: fmt(porUnidSim * 12),   color: CYAN   },
              { l: 'Total em 5 anos',    v: fmt(totalSim * 60),     color: AMBER  },
            ].map(s => (
              <div key={s.l} style={{ ...card, padding: '12px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 'clamp(14px,2vw,18px)', fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.v}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s.l}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setSelecionados(new Set())}
            style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Limpar seleção
          </button>
        </div>
      )}

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ v: '', l: 'Todos' }, ...TODOS_STATUS.map(s => ({ v: s, l: STATUS_CONFIG[s].label }))].map(f => (
          <button key={f.v} onClick={() => setFiltroStatus(f.v)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', border: 'none',
              background: filtroStatus === f.v ? CYAN : 'rgba(255,255,255,0.07)',
              color: filtroStatus === f.v ? '#07101c' : 'rgba(255,255,255,0.55)',
            }}>{f.l}</button>
        ))}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginLeft: 4 }}>
          Clique nos cenários para incluí-los na simulação
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <BarChart3 size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Nenhum cenário cadastrado.</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4 }}>
            Crie cenários para simular o impacto de decisões financeiras.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(c => (
            editId === c.id ? (
              <CenarioForm key={c.id} initial={c}
                onSave={form => handleUpdate(c.id, form)}
                onCancel={() => setEditId(null)} />
            ) : (
              <CenarioCard key={c.id} c={c}
                onEdit={() => setEditId(c.id)}
                onDelete={() => handleDelete(c.id)}
                onStatusChange={s => handleStatusChange(c.id, s)}
                selecionado={selecionados.has(c.id)}
                onToggleSelect={() => toggleSelect(c.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};
