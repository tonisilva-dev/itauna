/**
 * Checklist do Tomador de Serviço
 * Controla a contratação de prestadores com itens de verificação obrigatória.
 * Acesso: admin + síndico.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, Pencil, Trash2, CheckSquare, Square,
  ChevronDown, ChevronUp, Circle,
} from 'lucide-react';
import {
  fetchChecklists, insertChecklist, updateChecklist, deleteChecklist,
  insertChecklistItem, toggleChecklistItem, deleteChecklistItem,
  type DbChecklist, type DbChecklistItem,
} from '../../lib/supabase-queries';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const RED   = '#ef4444';

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  aberto:       { label: 'Aberto',        color: AMBER },
  em_andamento: { label: 'Em andamento',  color: CYAN  },
  concluido:    { label: 'Concluído',     color: GREEN },
  cancelado:    { label: 'Cancelado',     color: 'rgba(255,255,255,0.3)' },
};

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
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: 4,
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ── Formulário de checklist ── */
const EMPTY_CL: Partial<DbChecklist> = {
  servico: '', prestador: '', contato: '',
  data_inicio: '', data_fim: '', valor: undefined,
  status: 'aberto', observacoes: '',
};

const ChecklistForm = ({
  initial, onSave, onCancel,
}: {
  initial: Partial<DbChecklist>;
  onSave: (d: Partial<DbChecklist>) => Promise<void>;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState({ ...EMPTY_CL, ...initial });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handle} style={{ ...card, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontWeight: 700, color: CYAN, fontSize: 14, margin: 0 }}>
        {initial.id ? 'Editar serviço' : 'Novo checklist de serviço'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <span style={lbl}>Serviço / Objeto *</span>
          <input style={inp} required value={form.servico ?? ''}
            onChange={e => f('servico', e.target.value)}
            placeholder="Ex: Manutenção das bombas d'água" />
        </div>
        <div>
          <span style={lbl}>Prestador / Empresa</span>
          <input style={inp} value={form.prestador ?? ''}
            onChange={e => f('prestador', e.target.value)}
            placeholder="Nome ou razão social" />
        </div>
        <div>
          <span style={lbl}>Contato</span>
          <input style={inp} value={form.contato ?? ''}
            onChange={e => f('contato', e.target.value)}
            placeholder="Telefone ou e-mail" />
        </div>
        <div>
          <span style={lbl}>Valor contratado (R$)</span>
          <input style={inp} type="number" min={0} step={0.01}
            value={form.valor ?? ''}
            onChange={e => f('valor', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="0,00" />
        </div>
        <div>
          <span style={lbl}>Status</span>
          <select style={{ ...inp, cursor: 'pointer' }} value={form.status ?? 'aberto'}
            onChange={e => f('status', e.target.value)}>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={lbl}>Data início</span>
          <input style={inp} type="date" value={form.data_inicio ?? ''}
            onChange={e => f('data_inicio', e.target.value || null)} />
        </div>
        <div>
          <span style={lbl}>Data fim prevista</span>
          <input style={inp} type="date" value={form.data_fim ?? ''}
            onChange={e => f('data_fim', e.target.value || null)} />
        </div>
      </div>
      <div>
        <span style={lbl}>Observações</span>
        <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }}
          value={form.observacoes ?? ''}
          onChange={e => f('observacoes', e.target.value)}
          placeholder="Notas adicionais sobre o serviço..." />
      </div>
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
        }}>{saving ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  );
};

/* ── Card de checklist expandível ── */
const ChecklistCard = ({
  cl, onEdit, onDelete, onReload,
}: {
  cl: DbChecklist;
  onEdit: () => void;
  onDelete: () => void;
  onReload: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem]   = useState('');
  const [adding, setAdding]     = useState(false);

  const st      = STATUS_CFG[cl.status] ?? STATUS_CFG.aberto;
  const itens   = (cl.itens ?? []).sort((a, b) => a.ordem - b.ordem);
  const total   = itens.length;
  const feitos  = itens.filter(i => i.concluido).length;
  const pct     = total > 0 ? Math.round((feitos / total) * 100) : 0;

  const handleToggle = async (item: DbChecklistItem) => {
    try { await toggleChecklistItem(item.id, !item.concluido); onReload(); }
    catch { toast.error('Erro ao atualizar item'); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      await insertChecklistItem({
        checklist_id: cl.id,
        descricao: newItem.trim(),
        concluido: false,
        ordem: itens.length,
      });
      setNewItem('');
      onReload();
    } catch { toast.error('Erro ao adicionar item'); }
  };

  const handleDeleteItem = async (id: string) => {
    try { await deleteChecklistItem(id); onReload(); }
    catch { toast.error('Erro ao remover item'); }
  };

  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      {/* Cabeçalho */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <ClipboardList size={18} style={{ color: st.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{cl.servico}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}30`,
            }}>{st.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {cl.prestador && <span>🏢 {cl.prestador}</span>}
            {cl.valor     && <span>💰 {fmt(cl.valor)}</span>}
            {cl.data_inicio && <span>📅 {new Date(cl.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
            {total > 0 && (
              <span style={{ color: pct === 100 ? GREEN : CYAN }}>
                ✓ {feitos}/{total} itens ({pct}%)
              </span>
            )}
          </div>
          {/* Barra de progresso */}
          {total > 0 && (
            <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${pct}%`,
                background: pct === 100 ? GREEN : CYAN,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={onEdit} style={{ width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'grid', placeItems: 'center', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: RED }}>
            <Trash2 size={11} />
          </button>
          <button onClick={() => setExpanded(o => !o)} style={{ width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Lista de itens */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {itens.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
              Nenhum item ainda. Adicione abaixo.
            </p>
          )}
          {itens.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 9,
              background: item.concluido ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${item.concluido ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
            }}>
              <button onClick={() => handleToggle(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                {item.concluido
                  ? <CheckSquare size={16} style={{ color: GREEN }} />
                  : <Square size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                }
              </button>
              <span style={{
                flex: 1, fontSize: 13, lineHeight: 1.4,
                color: item.concluido ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)',
                textDecoration: item.concluido ? 'line-through' : 'none',
              }}>{item.descricao}</span>
              <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.4, color: RED }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          {/* Adicionar item */}
          <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input
              style={{ ...inp, flex: 1, padding: '6px 10px', fontSize: 12 }}
              value={newItem} onChange={e => setNewItem(e.target.value)}
              placeholder="Adicionar item de verificação..." />
            <button type="submit" disabled={!newItem.trim()} style={{
              padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: newItem.trim() ? CYAN : 'rgba(255,255,255,0.08)',
              color: newItem.trim() ? '#07101c' : 'rgba(255,255,255,0.3)',
              fontWeight: 700, fontSize: 12,
            }}>
              <Plus size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export const ChecklistServicos = () => {
  const { user } = useAuth();
  const [items, setItems]       = useState<DbChecklist[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [filtro, setFiltro]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchChecklists()); }
    catch { toast.error('Erro ao carregar checklists'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: Partial<DbChecklist>) => {
    try {
      await insertChecklist({ ...form, created_by: user?.id } as any);
      toast.success('Checklist criado');
      setCreating(false); load();
    } catch { toast.error('Erro ao criar'); }
  };

  const handleUpdate = async (id: string, form: Partial<DbChecklist>) => {
    try {
      await updateChecklist(id, form);
      toast.success('Atualizado');
      setEditId(null); load();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este checklist e todos os seus itens?')) return;
    try { await deleteChecklist(id); toast.success('Removido'); load(); }
    catch { toast.error('Erro ao excluir'); }
  };

  const filtrados = filtro ? items.filter(c => c.status === filtro) : items;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,3vw,32px) clamp(16px,4vw,28px) 60px' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: AMBER, marginBottom: 8 }}>
            Gestão · Contratações
          </p>
          <h1 style={{ fontSize: 'clamp(20px,4vw,32px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
            Checklist do Tomador de Serviço
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
            Garanta que cada contratação siga todos os requisitos legais e técnicos antes da aprovação.
          </p>
        </div>
        {!creating && !editId && (
          <button onClick={() => setCreating(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#72e3ff,#669dff)',
            color: '#07101c', fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            <Plus size={15} /> Novo checklist
          </button>
        )}
      </div>

      {creating && (
        <ChecklistForm initial={EMPTY_CL} onSave={handleCreate} onCancel={() => setCreating(false)} />
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ v: '', l: 'Todos' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ v: k, l: v.label }))].map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', border: 'none',
            background: filtro === f.v ? AMBER : 'rgba(255,255,255,0.07)',
            color: filtro === f.v ? '#07101c' : 'rgba(255,255,255,0.55)',
          }}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <ClipboardList size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Nenhum checklist encontrado.</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4 }}>
            Use o modelo padrão já cadastrado no banco como referência.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(cl => (
            editId === cl.id ? (
              <ChecklistForm key={cl.id} initial={cl}
                onSave={form => handleUpdate(cl.id, form)}
                onCancel={() => setEditId(null)} />
            ) : (
              <ChecklistCard key={cl.id} cl={cl}
                onEdit={() => setEditId(cl.id)}
                onDelete={() => handleDelete(cl.id)}
                onReload={load}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};
