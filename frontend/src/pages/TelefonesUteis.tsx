import React, { useEffect, useState, useCallback } from 'react';
import { maskPhone } from '../utils/format';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Mail, Phone as PhoneIcon } from 'lucide-react';
import {
  fetchTelefonesUteis, fetchTelefonesAdmin,
  insertTelefone, updateTelefone, deleteTelefone,
  insertSecretaria, updateSecretaria, deleteSecretaria,
  type DbTelefone, type DbSecretaria,
} from '../lib/supabase-queries';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

/* ── Constantes ────────────────────────────────────────────────── */

type Categoria = 'Emergência' | 'Saúde' | 'Utilidades' | 'Poder Público' | 'Condomínio' | 'Outros';

const CATEGORIAS: Categoria[] = [
  'Emergência', 'Saúde', 'Utilidades', 'Poder Público', 'Condomínio', 'Outros',
];

const CAT_COLOR: Record<Categoria, string> = {
  'Emergência':    '#ef4444',
  'Saúde':         '#10b981',
  'Utilidades':    '#f59e0b',
  'Poder Público': '#5a84ff',
  'Condomínio':    '#57d8ff',
  'Outros':        '#8b5cf6',
};

/* ── Estilos base reutilizáveis ────────────────────────────────── */

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  color: '#fff', padding: '8px 12px', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
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

const iconBtn = (danger = false): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
  display: 'grid', placeItems: 'center',
  border: danger ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.12)',
  background: danger ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.05)',
  color: danger ? '#ef4444' : 'rgba(255,255,255,0.6)',
});

/* ══════════════════════════════════════════════════════════════════
   FORMULÁRIO DE TELEFONE
══════════════════════════════════════════════════════════════════ */

const EMPTY_TEL = {
  nome: '', categoria: 'Outros' as string, telefone: '',
  telefone2: '', descricao: '', emoji: '📞', ordem: 0, is_active: true,
};

const TelefoneForm = ({
  initial, onSave, onCancel,
}: {
  initial: Partial<DbTelefone>;
  onSave: (data: Partial<DbTelefone>) => Promise<void>;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState({ ...EMPTY_TEL, ...initial });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handle} style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontWeight: 700, color: '#57d8ff', fontSize: 13, margin: 0 }}>
        {initial.id ? 'Editar contato' : 'Novo contato'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={labelStyle}>Nome *</span>
          <input style={inputStyle} value={form.nome} required
            onChange={e => f('nome', e.target.value)} placeholder="Ex: Prefeitura de Ibiporã" />
        </div>
        <div>
          <span style={labelStyle}>Categoria *</span>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.categoria}
            onChange={e => f('categoria', e.target.value)}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span style={labelStyle}>Emoji</span>
          <input style={{ ...inputStyle }} value={form.emoji} maxLength={4}
            onChange={e => f('emoji', e.target.value)} />
        </div>
        <div>
          <span style={labelStyle}>Telefone principal *</span>
          <input style={inputStyle} value={form.telefone} required type="tel" inputMode="numeric"
            onChange={e => f('telefone', maskPhone(e.target.value))} placeholder="Ex: (43) 3252-1500" />
        </div>
        <div>
          <span style={labelStyle}>Telefone alternativo</span>
          <input style={inputStyle} value={form.telefone2 ?? ''} type="tel" inputMode="numeric"
            onChange={e => f('telefone2', maskPhone(e.target.value))} placeholder="Opcional" />
        </div>
        <div>
          <span style={labelStyle}>Ordem</span>
          <input style={inputStyle} type="number" value={form.ordem}
            onChange={e => f('ordem', Number(e.target.value))} />
        </div>
      </div>

      <div>
        <span style={labelStyle}>Descrição</span>
        <input style={inputStyle} value={form.descricao ?? ''}
          onChange={e => f('descricao', e.target.value)}
          placeholder="Descrição breve (opcional)" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_active}
          onChange={e => f('is_active', e.target.checked)} />
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
          Ativo (visível publicamente)
        </span>
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

/* ══════════════════════════════════════════════════════════════════
   FORMULÁRIO DE SECRETARIA
══════════════════════════════════════════════════════════════════ */

const EMPTY_SEC: Partial<DbSecretaria> = {
  nome: '', email: '', telefone: '', ordem: 0,
};

const SecretariaForm = ({
  initial, onSave, onCancel,
}: {
  initial: Partial<DbSecretaria>;
  onSave: (data: Partial<DbSecretaria>) => Promise<void>;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState({ ...EMPTY_SEC, ...initial });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handle} style={{
      background: 'rgba(90,132,255,0.06)', border: '1px solid rgba(90,132,255,0.18)',
      borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <p style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>
        {initial.id ? 'Editar secretaria' : 'Nova secretaria'}
      </p>
      <div>
        <span style={labelStyle}>Nome da secretaria *</span>
        <input style={inputStyle} value={form.nome ?? ''} required
          onChange={e => f('nome', e.target.value)}
          placeholder="Ex: Secretaria de Tributação e Finanças" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <span style={labelStyle}>E-mail</span>
          <input style={inputStyle} type="email" value={form.email ?? ''}
            onChange={e => f('email', e.target.value)}
            placeholder="secretaria@prefeitura.gov.br" />
        </div>
        <div>
          <span style={labelStyle}>Telefone</span>
          <input style={inputStyle} value={form.telefone ?? ''} type="tel" inputMode="numeric"
            onChange={e => f('telefone', maskPhone(e.target.value))}
            placeholder="(43) 3252-1500" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, padding: '6px 16px', fontSize: 12 }}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

/* ══════════════════════════════════════════════════════════════════
   BLOCO DE SECRETARIAS (dentro de um card de telefone)
══════════════════════════════════════════════════════════════════ */

const SecretariasBloco = ({
  telefoneId, secretarias, isAdmin, onReload,
}: {
  telefoneId: string;
  secretarias: DbSecretaria[];
  isAdmin: boolean;
  onReload: () => void;
}) => {
  const [open, setOpen]         = useState(false);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);

  const sorted = [...secretarias].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));

  const handleCreate = async (form: Partial<DbSecretaria>) => {
    try {
      await insertSecretaria({ ...form, telefone_id: telefoneId } as any);
      toast.success('Secretaria adicionada');
      setCreating(false);
      onReload();
    } catch { toast.error('Erro ao adicionar secretaria'); }
  };

  const handleUpdate = async (id: string, form: Partial<DbSecretaria>) => {
    try {
      await updateSecretaria(id, form);
      toast.success('Secretaria atualizada');
      setEditId(null);
      onReload();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Remover "${nome}"?`)) return;
    try {
      await deleteSecretaria(id);
      toast.success('Removida');
      onReload();
    } catch { toast.error('Erro ao remover'); }
  };

  if (sorted.length === 0 && !isAdmin) return null;

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid rgba(90,132,255,0.15)', paddingTop: 10 }}>

      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 10 : 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#5a84ff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Secretarias / Setores
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>({sorted.length})</span>
        {open
          ? <ChevronUp size={12} style={{ color: '#5a84ff' }} />
          : <ChevronDown size={12} style={{ color: '#5a84ff' }} />
        }
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {sorted.map(sec => (
            editId === sec.id ? (
              <SecretariaForm
                key={sec.id}
                initial={sec}
                onSave={form => handleUpdate(sec.id, form)}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <div key={sec.id} style={{
                background: 'rgba(90,132,255,0.05)',
                border: '1px solid rgba(90,132,255,0.12)',
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 }}>
                    {sec.nome}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                    {sec.telefone && (
                      <a href={`tel:${sec.telefone.replace(/\D/g, '')}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#57d8ff', textDecoration: 'none' }}>
                        <PhoneIcon size={11} /> {sec.telefone}
                      </a>
                    )}
                    {sec.email && (
                      <a href={`mailto:${sec.email}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
                        <Mail size={11} /> {sec.email}
                      </a>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setEditId(sec.id)} style={iconBtn()} title="Editar">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => handleDelete(sec.id, sec.nome)} style={iconBtn(true)} title="Remover">
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            )
          ))}

          {isAdmin && !creating && (
            <button
              onClick={() => setCreating(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(90,132,255,0.08)', border: '1px dashed rgba(90,132,255,0.30)',
                borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                color: '#5a84ff', fontSize: 12, fontWeight: 600,
              }}
            >
              <Plus size={13} /> Adicionar secretaria
            </button>
          )}

          {creating && (
            <SecretariaForm
              initial={EMPTY_SEC}
              onSave={handleCreate}
              onCancel={() => setCreating(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   CARD DE TELEFONE
══════════════════════════════════════════════════════════════════ */

const TelefoneCard = ({
  tel, isAdmin, onEdit, onDelete, onReload,
}: {
  tel: DbTelefone;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReload: () => void;
}) => {
  const color = CAT_COLOR[tel.categoria as Categoria] ?? '#8b5cf6';
  const temSecretarias = (tel.secretarias?.length ?? 0) > 0 || isAdmin;

  return (
    <div style={{
      ...card,
      padding: '14px 16px',
      borderLeft: `3px solid ${color}`,
      opacity: tel.is_active ? 1 : 0.45,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{tel.emoji}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 2 }}>{tel.nome}</p>
          {tel.descricao && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginBottom: 4, lineHeight: 1.4 }}>
              {tel.descricao}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`tel:${tel.telefone.replace(/\D/g, '')}`}
              style={{ fontSize: 13, fontWeight: 700, color, textDecoration: 'none' }}>
              {tel.telefone}
            </a>
            {tel.telefone2 && (
              <a href={`tel:${tel.telefone2.replace(/\D/g, '')}`}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
                · {tel.telefone2}
              </a>
            )}
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button onClick={onEdit} style={iconBtn()} title="Editar"><Pencil size={12} /></button>
            <button onClick={onDelete} style={iconBtn(true)} title="Excluir"><Trash2 size={12} /></button>
          </div>
        )}
      </div>

      {/* Secretarias — somente para "Poder Público" ou quando já há secretarias cadastradas */}
      {(tel.categoria === 'Poder Público' || (tel.secretarias?.length ?? 0) > 0) && temSecretarias && (
        <SecretariasBloco
          telefoneId={tel.id}
          secretarias={tel.secretarias ?? []}
          isAdmin={isAdmin}
          onReload={onReload}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */

export const TelefonesUteis = () => {
  const { isAdmin }   = useAuth();
  const [items, setItems]         = useState<DbTelefone[]>([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = isAdmin ? await fetchTelefonesAdmin() : await fetchTelefonesUteis();
      setItems(data);
    } catch { toast.error('Erro ao carregar telefones'); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: Partial<DbTelefone>) => {
    try {
      await insertTelefone(form as any);
      toast.success('Contato adicionado');
      setCreating(false);
      load();
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleUpdate = async (id: string, form: Partial<DbTelefone>) => {
    try {
      await updateTelefone(id, form);
      toast.success('Contato atualizado');
      setEditId(null);
      load();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir "${nome}" e todas as suas secretarias?`)) return;
    try {
      await deleteTelefone(id);
      toast.success('Removido');
      load();
    } catch { toast.error('Erro ao excluir'); }
  };

  const grupos = CATEGORIAS.map(cat => ({
    cat, items: items.filter(t => t.categoria === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,28px) 60px' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#57d8ff', marginBottom: 8 }}>
            Área Free · Serviços Essenciais
          </p>
          <h1 style={{ fontSize: 'clamp(22px,5vw,36px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>
            Telefones Úteis
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Contatos essenciais para moradores e visitantes do Condomínio Itaúna.
          </p>
        </div>
        {isAdmin && !creating && (
          <button onClick={() => setCreating(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#72e3ff,#669dff)',
            color: '#07101c', fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            <Plus size={15} /> Adicionar contato
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {creating && (
        <div style={{ marginBottom: 24 }}>
          <TelefoneForm
            initial={EMPTY_TEL}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>Carregando…</p>
      ) : grupos.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>Nenhum telefone cadastrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {grupos.map(({ cat, items: catItems }) => {
            const color = CAT_COLOR[cat as Categoria] ?? '#8b5cf6';
            const isCollapsed = collapsed[cat];
            return (
              <section key={cat}>
                <button
                  onClick={() => setCollapsed(p => ({ ...p, [cat]: !p[cat] }))}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 0 10px', marginBottom: 10,
                    borderBottom: `1px solid ${color}30`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
                      {cat}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                      ({catItems.length})
                    </span>
                  </div>
                  {isCollapsed
                    ? <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    : <ChevronUp   size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  }
                </button>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {catItems.map(tel => (
                      editId === tel.id ? (
                        <TelefoneForm
                          key={tel.id}
                          initial={tel}
                          onSave={form => handleUpdate(tel.id, form)}
                          onCancel={() => setEditId(null)}
                        />
                      ) : (
                        <TelefoneCard
                          key={tel.id}
                          tel={tel}
                          isAdmin={isAdmin}
                          onEdit={() => setEditId(tel.id)}
                          onDelete={() => handleDelete(tel.id, tel.nome)}
                          onReload={load}
                        />
                      )
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: 40, lineHeight: 1.6 }}>
        Toque no número para ligar diretamente. Em caso de emergência, ligue para o número nacional.
      </p>
    </div>
  );
};
