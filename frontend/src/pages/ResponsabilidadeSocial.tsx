import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Leaf, Recycle } from 'lucide-react';
import {
  fetchCampanhas, fetchCampanhasAdmin,
  insertCampanha, updateCampanha, deleteCampanha,
  type DbCampanha,
} from '../lib/supabase-queries';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

/* ── Paleta ────────────────────────────────────────────────────── */
const GREEN  = '#10b981';
const CYAN   = '#57d8ff';
const AMBER  = '#f59e0b';
const BLUE   = '#5a84ff';
const RED    = '#ef4444';

const STATUS_COLOR: Record<string, string> = {
  ativa:      GREEN,
  planejada:  AMBER,
  encerrada:  'rgba(255,255,255,0.28)',
};
const STATUS_LABEL: Record<string, string> = {
  ativa: 'Em andamento', planejada: 'Em breve', encerrada: 'Encerrada',
};

const CATEGORIAS = ['Solidariedade','Sazonais','Saúde','Educação','Meio Ambiente','Geral'];
const STATUSES   = ['ativa','planejada','encerrada'];

/* ── Estilos base ──────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
};
const inputSt: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  color: '#fff', padding: '8px 12px', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: 4,
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg,#72e3ff,#669dff)',
  color: '#07101c', fontWeight: 700, cursor: 'pointer', fontSize: 13,
};
const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent', color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer', fontSize: 13,
};

/* ══════════════════════════════════════════════════════════════════
   SEÇÃO 1 — GUIA DE RESÍDUOS (conteúdo editorial estático)
══════════════════════════════════════════════════════════════════ */

const ORGANICOS = [
  'Restos de frutas, verduras e legumes',
  'Cascas, sementes e caroços',
  'Borra de café e filtros de papel',
  'Guardanapos e papel toalha usados',
  'Restos de pão, arroz, feijão e massas',
  'Podas de plantas, grama e folhas secas',
];

const RECICLAVEIS = [
  { grupo: 'Papel / Papelão', exemplos: 'caixas, jornais, revistas, papel de escritório (secos e limpos)', cor: BLUE },
  { grupo: 'Plásticos',       exemplos: 'garrafas PET, embalagens, sacolas, potes, tampas',               cor: CYAN },
  { grupo: 'Vidro',           exemplos: 'garrafas, frascos, potes — exceto espelhos e cerâmica',          cor: GREEN },
  { grupo: 'Metais',          exemplos: 'latas de alumínio, latas de aço, tampas metálicas, panelas velhas', cor: AMBER },
];

const REJEITOS = [
  'Fraldas, absorventes e papel higiênico',
  'Isopor sujo ou contaminado',
  'Cerâmicas, louças e espelhos quebrados',
  'Cabos e mangueiras de borracha',
  'Bitucas de cigarro',
  'Resíduos de varrição e pó de aspirador',
];

const GuiaResiduos = () => (
  <section style={{ marginBottom: 48 }}>
    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginBottom: 10 }}>
      Gestão de Resíduos
    </p>
    <h2 style={{ fontSize: 'clamp(20px,4vw,32px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>
      Separar é cuidar do lugar<br />
      <span style={{ background: 'linear-gradient(135deg,#72e3ff,#10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
        que chamamos de lar.
      </span>
    </h2>
    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 28, maxWidth: 620 }}>
      No Itaúna, a separação correta dos resíduos protege o lago central, mantém o microclima e sustenta nossa coleta seletiva. É simples — e faz toda a diferença.
    </p>

    {/* Orgânicos */}
    <div style={{ ...card, padding: 'clamp(18px,3vw,24px)', marginBottom: 14, borderLeft: `3px solid ${GREEN}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${GREEN}18`, border: `1px solid ${GREEN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Leaf size={18} style={{ color: GREEN }} />
        </div>
        <div>
          <p style={{ fontWeight: 800, color: GREEN, fontSize: 15 }}>Orgânicos</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Lixeira marrom · compostagem ou coleta municipal</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6 }}>
        {ORGANICOS.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: GREEN, fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '10px 14px', background: `${GREEN}0a`, borderRadius: 10, border: `1px solid ${GREEN}20` }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
          💡 <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Dica Itaúna:</strong> Resíduos orgânicos representam ~50% do lixo doméstico. Uma composteira em sua chácara transforma sobras em adubo para o jardim — fechando o ciclo da natureza.
        </p>
      </div>
    </div>

    {/* Recicláveis */}
    <div style={{ ...card, padding: 'clamp(18px,3vw,24px)', marginBottom: 14, borderLeft: `3px solid ${CYAN}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${CYAN}18`, border: `1px solid ${CYAN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Recycle size={18} style={{ color: CYAN }} />
        </div>
        <div>
          <p style={{ fontWeight: 800, color: CYAN, fontSize: 15 }}>Recicláveis</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Lixeira colorida · coleta seletiva / cooperativa</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RECICLAVEIS.map(r => (
          <div key={r.grupo} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', background: `${r.cor}08`, borderRadius: 10, border: `1px solid ${r.cor}18` }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: r.cor, minWidth: 80, flexShrink: 0, marginTop: 1 }}>{r.grupo}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{r.exemplos}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 12, lineHeight: 1.6 }}>
        ⚠️ Lave e seque as embalagens antes de descartar. Material sujo contamina toda a carga e vai parar no aterro.
      </p>
    </div>

    {/* Rejeitos */}
    <div style={{ ...card, padding: 'clamp(16px,2.5vw,20px)', borderLeft: `3px solid ${RED}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: '1.4rem' }}>🗑️</span>
        <div>
          <p style={{ fontWeight: 800, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Rejeitos — lixo comum</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Não têm aproveitamento — vão para o aterro sanitário</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 5 }}>
        {REJEITOS.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <span style={{ color: RED, fontSize: 11, marginTop: 2, flexShrink: 0 }}>✕</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Ponto de entrega */}
    <div style={{ marginTop: 14, ...card, padding: 'clamp(14px,2.5vw,18px)', background: 'linear-gradient(135deg,rgba(87,216,255,0.06),rgba(13,20,35,0.95))', border: '1px solid rgba(87,216,255,0.15)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>📍</span>
      <div>
        <p style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 4 }}>Ponto de Coleta Seletiva — Portaria</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
          Leve seus recicláveis ao ponto de coleta próximo à portaria. A coleta municipal de recicláveis passa regularmente — consulte a portaria para os dias e horários atualizados.
        </p>
      </div>
    </div>
  </section>
);

/* ══════════════════════════════════════════════════════════════════
   SEÇÃO 2 — CAMPANHAS SOCIAIS
══════════════════════════════════════════════════════════════════ */

const EMPTY_FORM: Partial<DbCampanha> = {
  titulo: '', descricao: '', categoria: 'Solidariedade',
  emoji: '🌟', data_inicio: '', data_fim: '', status: 'planejada', is_active: true,
};

const CampanhaForm = ({
  initial, onSave, onCancel,
}: {
  initial: Partial<DbCampanha>;
  onSave: (d: Partial<DbCampanha>) => Promise<void>;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handle} style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
      <p style={{ fontWeight: 700, color: CYAN, fontSize: 13, margin: 0 }}>
        {initial.id ? 'Editar campanha' : 'Nova campanha'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={labelSt}>Título *</span>
          <input style={inputSt} value={form.titulo ?? ''} required
            onChange={e => f('titulo', e.target.value)} placeholder="Ex: Campanha do Agasalho" />
        </div>
        <div>
          <span style={labelSt}>Categoria</span>
          <select style={{ ...inputSt, cursor: 'pointer' }} value={form.categoria ?? 'Geral'}
            onChange={e => f('categoria', e.target.value)}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span style={labelSt}>Status</span>
          <select style={{ ...inputSt, cursor: 'pointer' }} value={form.status ?? 'planejada'}
            onChange={e => f('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <span style={labelSt}>Emoji</span>
          <input style={inputSt} value={form.emoji ?? '🌟'} maxLength={4}
            onChange={e => f('emoji', e.target.value)} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={labelSt}>Descrição</span>
          <textarea style={{ ...inputSt, resize: 'vertical', minHeight: 72 }}
            value={form.descricao ?? ''}
            onChange={e => f('descricao', e.target.value)}
            placeholder="Descreva a campanha, o que é arrecadado, onde entregar..." />
        </div>
        <div>
          <span style={labelSt}>Início</span>
          <input type="date" style={inputSt} value={form.data_inicio ?? ''}
            onChange={e => f('data_inicio', e.target.value || null)} />
        </div>
        <div>
          <span style={labelSt}>Encerramento</span>
          <input type="date" style={inputSt} value={form.data_fim ?? ''}
            onChange={e => f('data_fim', e.target.value || null)} />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_active ?? true}
          onChange={e => f('is_active', e.target.checked)} />
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Visível publicamente</span>
      </label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={btnSecondary}>Cancelar</button>
        <button type="submit" disabled={saving} style={btnPrimary}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

const CampanhaCard = ({
  c, isGestor, onEdit, onDelete,
}: {
  c: DbCampanha;
  isGestor: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const statusColor = STATUS_COLOR[c.status] ?? CYAN;
  const fmtDate = (d: string | null) => d
    ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div style={{
      ...card, padding: 'clamp(14px,2.5vw,18px)',
      borderLeft: `3px solid ${statusColor}`,
      opacity: c.is_active ? 1 : 0.45,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: '1.8rem', flexShrink: 0, lineHeight: 1 }}>{c.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>{c.titulo}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: `${statusColor}18`, color: statusColor,
              border: `1px solid ${statusColor}30`, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>{STATUS_LABEL[c.status]}</span>
          </div>
          {c.descricao && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 8 }}>
              {c.descricao}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {c.categoria}
            </span>
            {(c.data_inicio || c.data_fim) && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                {fmtDate(c.data_inicio)}{c.data_fim ? ` → ${fmtDate(c.data_fim)}` : ''}
              </span>
            )}
          </div>
        </div>
        {isGestor && (
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button onClick={onEdit} title="Editar" style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center',
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
            }}><Pencil size={12} /></button>
            <button onClick={onDelete} title="Excluir" style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center',
              border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: RED,
            }}><Trash2 size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

const CampanhasSection = ({ isGestor }: { isGestor: boolean }) => {
  const [items, setItems]       = useState<DbCampanha[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = isGestor ? await fetchCampanhasAdmin() : await fetchCampanhas();
      setItems(data);
    } catch { toast.error('Erro ao carregar campanhas'); }
    finally { setLoading(false); }
  }, [isGestor]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: Partial<DbCampanha>) => {
    try { await insertCampanha(form as any); toast.success('Campanha criada'); setCreating(false); load(); }
    catch { toast.error('Erro ao criar'); }
  };

  const handleUpdate = async (id: string, form: Partial<DbCampanha>) => {
    try { await updateCampanha(id, form); toast.success('Atualizada'); setEditId(null); load(); }
    catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!window.confirm(`Excluir campanha "${titulo}"?`)) return;
    try { await deleteCampanha(id); toast.success('Removida'); load(); }
    catch { toast.error('Erro ao excluir'); }
  };

  const ativas    = items.filter(c => c.status === 'ativa');
  const planej    = items.filter(c => c.status === 'planejada');
  const encerradas = items.filter(c => c.status === 'encerrada');

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: AMBER, marginBottom: 8 }}>
            Ação Solidária
          </p>
          <h2 style={{ fontSize: 'clamp(20px,4vw,32px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
            Campanhas Sociais
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
            Iniciativas que conectam a comunidade Itaúna ao entorno — uma doação de cada vez.
          </p>
        </div>
        {isGestor && !creating && !editId && (
          <button onClick={() => setCreating(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#72e3ff,#669dff)', color: '#07101c',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            <Plus size={15} /> Nova campanha
          </button>
        )}
      </div>

      {creating && (
        <CampanhaForm initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setCreating(false)} />
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: 32 }}>Carregando…</p>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding: 32, textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}>🤝</span>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Nenhuma campanha cadastrada ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {ativas.length > 0 && (
            <GrupoCampanhas titulo="Em andamento" cor={GREEN} itens={ativas} isGestor={isGestor} editId={editId} setEditId={setEditId} onUpdate={handleUpdate} onDelete={handleDelete} />
          )}
          {planej.length > 0 && (
            <GrupoCampanhas titulo="Em breve" cor={AMBER} itens={planej} isGestor={isGestor} editId={editId} setEditId={setEditId} onUpdate={handleUpdate} onDelete={handleDelete} />
          )}
          {encerradas.length > 0 && (
            <GrupoCampanhasColapsavel titulo="Encerradas" itens={encerradas} isGestor={isGestor} editId={editId} setEditId={setEditId} onUpdate={handleUpdate} onDelete={handleDelete} />
          )}
        </div>
      )}
    </section>
  );
};

const GrupoCampanhas = ({ titulo, cor, itens, isGestor, editId, setEditId, onUpdate, onDelete }: {
  titulo: string; cor: string; itens: DbCampanha[]; isGestor: boolean;
  editId: string | null; setEditId: (id: string | null) => void;
  onUpdate: (id: string, form: Partial<DbCampanha>) => Promise<void>;
  onDelete: (id: string, titulo: string) => void;
}) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${cor}25` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, display: 'inline-block' }} />
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: cor }}>{titulo}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>({itens.length})</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {itens.map(c => (
        editId === c.id ? (
          <CampanhaForm key={c.id} initial={c} onSave={form => onUpdate(c.id, form)} onCancel={() => setEditId(null)} />
        ) : (
          <CampanhaCard key={c.id} c={c} isGestor={isGestor} onEdit={() => setEditId(c.id)} onDelete={() => onDelete(c.id, c.titulo)} />
        )
      ))}
    </div>
  </div>
);

const GrupoCampanhasColapsavel = (props: {
  titulo: string; itens: DbCampanha[]; isGestor: boolean;
  editId: string | null; setEditId: (id: string | null) => void;
  onUpdate: (id: string, form: Partial<DbCampanha>) => Promise<void>;
  onDelete: (id: string, titulo: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const cor = 'rgba(255,255,255,0.28)';
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
        cursor: 'pointer', padding: '0 0 8px', marginBottom: open ? 10 : 0,
        borderBottom: `1px solid rgba(255,255,255,0.07)`, width: '100%',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: cor }}>{props.titulo}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>({props.itens.length})</span>
        <span style={{ marginLeft: 'auto' }}>{open ? <ChevronUp size={13} style={{ color: cor }} /> : <ChevronDown size={13} style={{ color: cor }} />}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {props.itens.map(c => (
            props.editId === c.id ? (
              <CampanhaForm key={c.id} initial={c} onSave={form => props.onUpdate(c.id, form)} onCancel={() => props.setEditId(null)} />
            ) : (
              <CampanhaCard key={c.id} c={c} isGestor={props.isGestor} onEdit={() => props.setEditId(c.id)} onDelete={() => props.onDelete(c.id, c.titulo)} />
            )
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */

export const ResponsabilidadeSocial = () => {
  const { isGestor } = useAuth();
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,28px) 60px' }}>

      {/* Header da página */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginBottom: 10 }}>
          Itaúna · Ativo Social
        </p>
        <h1 style={{ fontSize: 'clamp(24px,5.5vw,42px)', fontWeight: 900, color: '#fff', lineHeight: 1.08, marginBottom: 12 }}>
          Responsabilidade<br />
          <span style={{ background: 'linear-gradient(135deg,#10b981,#57d8ff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Social &amp; Ambiental
          </span>
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560 }}>
          O Itaúna vai além das fronteiras do condomínio. Cuidamos do lugar onde vivemos e das pessoas que nos rodeiam — com ações concretas, todos os dias.
        </p>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 36 }} />

      <GuiaResiduos />

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 36 }} />

      <CampanhasSection isGestor={isGestor} />
    </div>
  );
};
