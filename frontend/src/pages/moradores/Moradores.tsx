import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Search, Plus, Phone, Mail, Home, ChevronRight,
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Shield, Award, HelpCircle,
  Edit2, Save, X, Trash2
} from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { StatCard } from '../../components/ui/StatCard';
import { unitLabel, formatPhone, maskPhone, maskCPF } from '../../utils/format';
import { fetchResidents, toggleResidentActive, updateResident, type DbResident } from '../../lib/supabase-queries';
import { adminCreateUser, type NewUserPayload } from '../../lib/supabase-admin';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D } from '../../components/ui/PageCarousel3D';
import type { SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { useBackHandler } from '@/hooks/useBackHandler';

/* ── Helpers ─────────────────────────────────────────────────────── */
const ROLES = [
  { value: 'condominino', label: 'Condômino'   },
  { value: 'sindico',     label: 'Síndico'      },
  { value: 'admin',       label: 'Administrador' },
] as const;

const roleLabel = (role: string) =>
  ROLES.find(r => r.value === role)?.label ?? role;

const roleBadgeClass = (role: string) => {
  if (role === 'admin')   return 'badge-red';
  if (role === 'sindico') return 'badge-yellow';
  return 'badge-gray';
};

// Diretoria do condomínio — atualizar quando houver troca de mandato
const DIRETORIA = [
  { cargo: 'Síndico Geral',             nome: 'Chácara 18 · Cláudio L.',  icon: Award,      iconColor: '#f59e0b' },
  { cargo: 'Subsíndica Administrativa', nome: 'Chácara 42 · Patrícia M.', icon: Shield,     iconColor: '#5a84ff' },
  { cargo: 'Conselho Fiscal',           nome: 'Chácaras 09, 27 e 81',     icon: HelpCircle, iconColor: '#10b981' },
];

const EMPTY_FORM: NewUserPayload = {
  full_name: '', email: '', password: '',
  phone: '', unit_number: null, role: 'condominino', cpf: '',
};

export const Moradores = () => {
  const { isGestor } = useAuth();
  const [residents, setResidents]   = useState<DbResident[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [search,        setSearch]       = useState('');
  const [selected,      setSelected]     = useState<DbResident | null>(null);
  const [showInactive,  setShowInactive] = useState(false);
  const [togglingId,    setTogglingId]   = useState<string | null>(null);

  /* Cadastro Novo Morador */
  const [form,      setForm]        = useState<NewUserPayload>(EMPTY_FORM);
  const [showPass,  setShowPass]    = useState(false);
  const [saving,    setSaving]      = useState(false);
  const [feedback,  setFeedback]    = useState<{ ok: boolean; msg: string } | null>(null);
  const [fieldErr,  setFieldErr]    = useState<Partial<Record<keyof NewUserPayload, string>>>({});

  /* Edição de Morador */
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editForm, setEditForm]     = useState<Partial<DbResident>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  useBackHandler(editingId !== null ? () => setEditingId(null) : selected ? () => setSelected(null) : null);

  /* ── Carregar moradores ───────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchResidents(isGestor ? showInactive : false);
      setResidents(data);
    } catch { /* silencia */ }
    finally { setLoading(false); }
  }, [isGestor, showInactive]);

  useEffect(() => { load(); }, [load]);

  /* ── Filtro de busca ──────────────────────────────────────────── */
  const handleToggleActive = async (resident: DbResident) => {
    setTogglingId(resident.id);
    try {
      await toggleResidentActive(resident.id, !resident.is_active);
      setResidents(prev => prev.map(r =>
        r.id === resident.id ? { ...r, is_active: !r.is_active } : r
      ));
      if (selected?.id === resident.id)
        setSelected(s => s ? { ...s, is_active: !s.is_active } : null);
      toast.success(resident.is_active ? 'Morador inativado.' : 'Morador reativado!');
    } catch { toast.error('Erro ao alterar status.'); }
    finally { setTogglingId(null); }
  };

  const filtered = useMemo(() => residents.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) ||
      String(r.unit_number ?? '').includes(q) ||
      r.email.toLowerCase().includes(q)
    );
  }), [residents, search]);

  const ativos   = useMemo(() => residents.filter(r => r.is_active).length, [residents]);
  const inativos = residents.length - ativos;

  /* ── Validação ────────────────────────────────────────────────── */
  const validate = (): boolean => {
    const errs: typeof fieldErr = {};
    if (!form.full_name.trim())         errs.full_name = 'Nome obrigatório';
    if (!form.email.trim() || !form.email.includes('@'))
                                        errs.email     = 'E-mail inválido';
    if (form.password.length < 8)       errs.password  = 'Mínimo 8 caracteres';
    if (form.role !== 'admin' && !form.unit_number)
                                        errs.unit_number = 'Chácara obrigatória para condôminos e síndicos';
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Submeter cadastro ────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setFeedback(null);

    const result = await adminCreateUser(
      { ...form, unit_number: form.unit_number ?? null },
      supabase as any
    );

    setSaving(false);

    if (result.success) {
      setFeedback({ ok: true, msg: result.error
        ? result.error
        : 'Usuário cadastrado com sucesso! Um e-mail de confirmação foi enviado.' });
      toast.success('Morador cadastrado com sucesso!');
      setForm(EMPTY_FORM);
      setFieldErr({});
      load(); // recarrega lista
    } else {
      setFeedback({ ok: false, msg: result.error ?? 'Erro desconhecido.' });
      toast.error(result.error ?? 'Erro ao cadastrar.');
    }
  };

  const field = (key: keyof NewUserPayload, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleEditResident = (resident: DbResident) => {
    setEditingId(resident.id);
    setEditForm({
      full_name: resident.full_name,
      email: resident.email,
      phone: resident.phone ?? '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.full_name?.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateResident(editingId, {
        full_name: editForm.full_name.trim(),
        email: editForm.email?.trim() || '',
        phone: editForm.phone?.trim() || null,
      });
      setResidents(prev => prev.map(r => r.id === editingId ? updated : r));
      if (selected?.id === editingId) setSelected(updated);
      setEditingId(null);
      setEditForm({});
      toast.success('Morador atualizado com sucesso!');
    } catch { toast.error('Erro ao atualizar morador.'); }
    finally { setSavingEdit(false); }
  };

  const slides: SlideItem[] = [
    {
      key: 'censo-moradores',
      label: 'Censo de Moradores',
      content: (
        <SlidePanel
          eyebrow="Gestão de Pessoas"
          title={<>Censo de <span className="grad-text">Moradores</span></>}
          subtitle="Cadastro de condôminos, proprietários e inquilinos das 389 chácaras."
        >
          <div className="space-y-5 h-full flex flex-col justify-between relative">
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Cadastrados" value={loading ? '—' : String(residents.length)} icon={Users} iconColor="#3b82f6" iconBg="rgba(59,130,246,0.12)" />
                <StatCard label="Ativos"      value={loading ? '—' : String(ativos)}           icon={Users} iconColor="#10b981" iconBg="rgba(16,185,129,0.12)" />
                <StatCard label="Inativos"    value={loading ? '—' : String(inativos)}          icon={Users} iconColor="#ef4444" iconBg="rgba(239,68,68,0.12)" />
              </div>

              {/* Tabela de Moradores */}
              <div className="card overflow-hidden flex flex-col">
                <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      className="input pl-9"
                      placeholder="Buscar por nome, chácara ou e-mail…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  {isGestor && (
                    <button
                      onClick={() => setShowInactive(v => !v)}
                      className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 flex-shrink-0"
                      style={showInactive ? { background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' } : {}}
                    >
                      {showInactive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showInactive ? 'Ocultar inativos' : 'Ver inativos'}
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20 gap-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span style={{ fontSize: '0.875rem' }}>Carregando moradores…</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-20 text-center" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
                    Nenhum morador encontrado.
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[50svh] relative">
                    <table className="w-full">
                      <thead style={{ position: 'sticky', top: 0, background: '#0a0f1d', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['Morador', 'Chácara', 'Contato', 'Perfil', 'Status', ''].map(h => (
                            <th key={h} className="text-left px-4 py-2.5"
                              style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(r => (
                          <tr key={r.id} className="table-row"
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              cursor: 'pointer',
                              background: selected?.id === r.id ? 'rgba(0, 200, 200, 0.06)' : undefined,
                            }}
                            onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <Avatar name={r.full_name} size="xs" />
                                <div>
                                  <p style={{ fontWeight: 600, color: '#fff', fontSize: '0.813rem' }} className="truncate max-w-[120px]">{r.full_name}</p>
                                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }} className="truncate max-w-[120px]">{r.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              {r.unit_number ? (
                                <div className="flex items-center gap-1.5">
                                  <Home className="w-3.5 h-3.5" style={{ color: '#00c8c8' }} />
                                  <span style={{ fontSize: '0.813rem', color: '#fff' }}>{unitLabel(r.unit_number)}</span>
                                </div>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                              {r.phone ? formatPhone(r.phone) : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`badge ${roleBadgeClass(r.role)}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                {roleLabel(r.role)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`badge ${r.is_active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                {r.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* GAVETA LATERAL LOCAL INTERNA DE DETALHES DO MORADOR */}
            {selected && (
              <div
                className="absolute top-[65px] right-0 bottom-0 w-[300px] z-30 flex flex-col p-5 animate-slide-left"
                style={{
                  background: 'rgba(10, 15, 29, 0.95)',
                  backdropFilter: 'blur(16px)',
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                    Ficha do Morador
                  </h4>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div className="flex flex-col items-center text-center py-2">
                    <Avatar name={selected.full_name} size="lg" className="mb-2" />
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>
                      {selected.full_name}
                    </p>
                    {selected.unit_number && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Home className="w-3.5 h-3.5" style={{ color: '#00c8c8' }} />
                        <span style={{ fontSize: '0.78rem', color: '#00c8c8' }}>{unitLabel(selected.unit_number)}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <span className={`badge ${roleBadgeClass(selected.role)}`} style={{ fontSize: '0.65rem' }}>
                        {roleLabel(selected.role)}
                      </span>
                      <span className={`badge ${selected.is_active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                        {selected.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'E-mail', value: selected.email, icon: Mail },
                      { label: 'Telefone', value: selected.phone ? formatPhone(selected.phone) : '—', icon: Phone },
                      { label: 'Perfil Geral', value: roleLabel(selected.role), icon: ShieldCheck },
                    ].map(row => (
                      <div key={row.label} className="flex items-start gap-3 py-2"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <row.icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                        <div>
                          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>{row.label}</p>
                          <p style={{ fontSize: '0.813rem', color: '#fff', wordBreak: 'break-all' }}>{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${selected.email}`}
                      className="btn-primary flex-1 justify-center text-xs py-2"
                    >
                      <Mail className="w-3 h-3" /> E-mail
                    </a>
                    {selected.phone && (
                      <a
                        href={`https://wa.me/55${selected.phone.replace(/\D/g,'')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex-1 justify-center text-xs py-2"
                      >
                        <Phone className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                  {isGestor && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditResident(selected)}
                        className="flex-1 justify-center text-xs py-2 rounded-lg flex items-center gap-1.5 transition-all font-semibold"
                        style={{ background: 'rgba(87,216,255,0.12)', color: '#67e8f9', border: '1px solid rgba(87,216,255,0.25)' }}
                        title="Editar dados do morador"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(selected)}
                        disabled={togglingId === selected.id}
                        className="flex-1 justify-center text-xs py-2 rounded-lg flex items-center gap-1.5 transition-all font-semibold"
                        style={selected.is_active
                          ? { background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }
                          : { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }
                        }
                      >
                        {togglingId === selected.id
                          ? <><Loader2 className="w-3 h-3 animate-spin" /></>
                          : selected.is_active
                            ? <><EyeOff className="w-3 h-3" /></>
                            : <><Eye className="w-3 h-3" /></>
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SlidePanel>
      )
    },
    {
      key: 'cadastro-morador',
      label: editingId ? 'Editar Morador' : (isGestor ? 'Cadastrar Morador' : 'Canais Oficiais'),
      content: (
        <SlidePanel
          title={editingId ? 'Editar Morador' : (isGestor ? 'Cadastrar Morador' : 'Canais Oficiais')}
          eyebrow={editingId ? 'Atualização de dados pessoais' : (isGestor ? 'Criação de conta e atribuição de unidade' : 'Organização administrativa e contatos urgentes')}
        >
          <div className="space-y-4 h-full flex flex-col justify-between">
            {isGestor && editingId ? (
              <form onSubmit={handleSaveEdit} className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div>
                  <label className="input-label">Nome Completo *</label>
                  <input className="input w-full" placeholder="Ex: João da Silva"
                    value={editForm.full_name ?? ''} onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} required />
                </div>

                <div>
                  <label className="input-label">E-mail *</label>
                  <input className="input w-full" type="email" placeholder="morador@email.com"
                    value={editForm.email ?? ''} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} required />
                </div>

                <div>
                  <label className="input-label">Telefone</label>
                  <input className="input w-full" placeholder="(43) 99999-0000"
                    value={editForm.phone ?? ''} onChange={e => setEditForm(prev => ({ ...prev, phone: maskPhone(e.target.value) }))} />
                </div>

                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => { setEditingId(null); setEditForm({}); }}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 btn-primary justify-center py-2.5 text-xs" disabled={savingEdit}>
                    {savingEdit ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                    ) : (
                      <><Save className="w-4 h-4" /> Salvar Alterações</>
                    )}
                  </button>
                </div>
              </form>
            ) : isGestor ? (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {/* Feedback de cadastro */}
                {feedback && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: feedback.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      border: `1px solid ${feedback.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                    {feedback.ok
                      ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                      : <AlertCircle  className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />}
                    <p style={{ fontSize: '0.78rem', color: feedback.ok ? '#10b981' : '#ef4444', lineHeight: 1.4 }}>
                      {feedback.msg}
                    </p>
                  </div>
                )}

                {!feedback?.ok && (
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div>
                      <label className="input-label">Nome Completo *</label>
                      <input className="input w-full" placeholder="Ex: João da Silva"
                        value={form.full_name} onChange={e => field('full_name', e.target.value)} required />
                      {fieldErr.full_name && <p style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: 4 }}>{fieldErr.full_name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">E-mail *</label>
                        <input className="input w-full" type="email" placeholder="morador@email.com"
                          value={form.email} onChange={e => field('email', e.target.value)} required />
                        {fieldErr.email && <p style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: 4 }}>{fieldErr.email}</p>}
                      </div>
                      <div>
                        <label className="input-label">Senha Provisória *</label>
                        <div className="relative">
                          <input className="input w-full pr-8"
                            type={showPass ? 'text' : 'password'}
                            placeholder="Senha (mín. 8)"
                            value={form.password} onChange={e => field('password', e.target.value)} required />
                          <button type="button" onClick={() => setShowPass(p => !p)}
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                            {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {fieldErr.password && <p style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: 4 }}>{fieldErr.password}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">Telefone</label>
                        <input className="input w-full" placeholder="(43) 99999-0000"
                          value={form.phone ?? ''} onChange={e => field('phone', maskPhone(e.target.value))} />
                      </div>
                      <div>
                        <label className="input-label">Nº da Chácara {form.role !== 'admin' ? '*' : ''}</label>
                        <input className="input w-full" type="number" min={1} max={360} placeholder="Ex: 42"
                          value={form.unit_number ?? ''} onChange={e => field('unit_number', e.target.value ? Number(e.target.value) : null)}
                          style={fieldErr.unit_number ? { borderColor: '#ef4444' } : {}} />
                        {fieldErr.unit_number && <p style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: 4 }}>{fieldErr.unit_number}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">CPF</label>
                        <input className="input w-full" placeholder="000.000.000-00"
                          value={form.cpf ?? ''} onChange={e => field('cpf', maskCPF(e.target.value))} />
                      </div>
                      <div>
                        <label className="input-label">Perfil de Acesso *</label>
                        <select className="input w-full" value={form.role} onChange={e => field('role', e.target.value as any)}>
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={saving}>
                        {saving ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando…</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Cadastrar Morador</>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {feedback?.ok && (
                  <div className="pt-4">
                    <button className="btn-primary w-full justify-center" onClick={() => setFeedback(null)}>
                      <Plus className="w-4 h-4" /> Cadastrar Outro
                  </button>
                </div>
              )}
            </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="card p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Shield className="w-4 h-4" />
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>Administração do Condomínio</p>
                  </div>
                  <div className="space-y-3">
                    {DIRETORIA.map((d, i) => (
                      <div key={d.cargo}
                        className="flex items-center justify-between py-1.5"
                        style={{ borderBottom: i < DIRETORIA.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div className="flex items-center gap-2">
                          <d.icon className="w-3.5 h-3.5" style={{ color: d.iconColor }} />
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{d.cargo}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>{d.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contatos Emergência Cidade */}
                <div className="card p-4 space-y-3 bg-[#1c1212]/30 border-red-500/10">
                  <p style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.85rem' }}>Telefones de Emergência (Ibiporã)</p>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/10 flex flex-col">
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>SAMU</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ff5f5f', marginTop: 2 }}>192</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/10 flex flex-col">
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>Bombeiros</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ff5f5f', marginTop: 2 }}>193</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/10 flex flex-col">
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>Polícia Militar</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ff5f5f', marginTop: 2 }}>190</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/10 flex flex-col">
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>Defesa Civil</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ff5f5f', marginTop: 2 }}>199</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SlidePanel>
      )
    }
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />
    </div>
  );
};
