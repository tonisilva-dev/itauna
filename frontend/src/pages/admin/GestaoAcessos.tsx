import { useState, useEffect, useMemo } from 'react';
import { gotoSlide } from '../../utils/format';
import {
  Shield, UserPlus, Check, X, Save, ChevronDown, ChevronUp,
  Users, Zap, Loader2, Trash2, AlertTriangle, Lock, Settings,
  DollarSign, Home, Bell, FileText, Calendar, AlertCircle,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D } from '../../components/ui/PageCarousel3D';
import type { SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import {
  fetchAssistentes, fetchAllProfiles, upsertPermissoes, revokeAssistente,
  type DbAssistente, type DbPermissao, type DbResident,
} from '@/lib/supabase-queries';
import { adminCreateUser } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const RED    = '#ef4444';
const YELLOW = '#f59e0b';
const BLUE   = '#5a84ff';
const PURPLE = '#8b5cf6';

type Modulo = 'financeiro'|'unidades'|'moradores'|'eventos'|'parceiros'|'ocorrencias'|'comunicados'|'documentos'|'agendamentos';

const MODULOS: { key: Modulo; label: string; Icon: typeof Shield; color: string }[] = [
  { key: 'financeiro',   label: 'Financeiro',   Icon: DollarSign,    color: GREEN  },
  { key: 'unidades',     label: 'Chácaras',     Icon: Home,          color: BLUE   },
  { key: 'moradores',    label: 'Moradores',    Icon: Users,         color: CYAN   },
  { key: 'eventos',      label: 'Eventos',      Icon: Calendar,      color: PURPLE },
  { key: 'parceiros',    label: 'Parceiros',    Icon: Building2,     color: YELLOW },
  { key: 'ocorrencias',  label: 'Ocorrências',  Icon: AlertCircle,   color: RED    },
  { key: 'comunicados',  label: 'Comunicados',  Icon: Bell,          color: CYAN   },
  { key: 'documentos',   label: 'Documentos',   Icon: FileText,      color: BLUE   },
  { key: 'agendamentos', label: 'Agendamentos', Icon: Calendar,      color: GREEN  },
];

const emptyPermissoes = (): DbPermissao[] =>
  MODULOS.map(m => ({ modulo: m.key, pode_inserir: false, pode_alterar: false, pode_excluir: false }));

const applyPreset = (preset: string): DbPermissao[] => {
  const p = emptyPermissoes();
  if (preset === 'full')       return p.map(x => ({ ...x, pode_inserir: true, pode_alterar: true, pode_excluir: true }));
  if (preset === 'portaria')   return p.map(x => ['agendamentos','ocorrencias','moradores'].includes(x.modulo) ? { ...x, pode_inserir: true, pode_alterar: true } : x);
  if (preset === 'financeiro') return p.map(x => ['financeiro','unidades'].includes(x.modulo) ? { ...x, pode_inserir: true, pode_alterar: true } : x);
  return p;
};

/* ── Linha de permissão ── */
const PermRow = ({ perm, onChange }: { perm: DbPermissao; onChange: (p: DbPermissao) => void }) => {
  const mod = MODULOS.find(m => m.key === perm.modulo)!;
  const toggle = (k: keyof Omit<DbPermissao,'modulo'>) => onChange({ ...perm, [k]: !perm[k] });
  const any = perm.pode_inserir || perm.pode_alterar || perm.pode_excluir;

  return (
    <div className="flex items-center justify-between gap-2 py-2 px-2.5 rounded-xl transition-all"
      style={{ background: any ? `${mod.color}06` : 'rgba(255,255,255,0.01)', border: `1px solid ${any ? mod.color + '18' : 'rgba(255,255,255,0.04)'}` }}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: any ? `${mod.color}15` : 'rgba(255,255,255,0.04)' }}>
          <mod.Icon size={11} style={{ color: any ? mod.color : 'rgba(255,255,255,0.25)' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: any ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: any ? 600 : 400 }} className="truncate">
          {mod.label}
        </span>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {([
          { k: 'pode_inserir' as const, l: 'Criar'   },
          { k: 'pode_alterar' as const, l: 'Editar'  },
          { k: 'pode_excluir' as const, l: 'Excluir' },
        ]).map(({ k, l }) => (
          <button key={k} onClick={() => toggle(k)}
            className="flex items-center gap-0.5 cursor-pointer transition-all"
            style={{
              padding: '2px 6px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600,
              background: perm[k] ? `${CYAN}18` : 'rgba(255,255,255,0.04)',
              color: perm[k] ? CYAN : 'rgba(255,255,255,0.25)',
              border: `1px solid ${perm[k] ? CYAN + '35' : 'rgba(255,255,255,0.06)'}`,
            }}>
            {perm[k] ? <Check size={9} /> : <X size={9} />} {l}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Componente principal ── */
export const GestaoAcessos = () => {
  const { user } = useAuth();
  const [assistentes, setAssistentes] = useState<DbAssistente[]>([]);
  const [profiles, setProfiles]       = useState<DbResident[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string|null>(null);
  const [saving, setSaving]           = useState<string|null>(null);
  const [localPerms, setLocalPerms]   = useState<Record<string, DbPermissao[]>>({});
  const [revokeId, setRevokeId]       = useState<string|null>(null);
  const [revokeName, setRevokeName]   = useState('');
  const [tab, setTab]                 = useState<'assistentes'|'condominos'>('assistentes');

  const [newName, setNewName]         = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [preset, setPreset]           = useState<'custom'|'portaria'|'financeiro'|'full'>('custom');
  const [submitting, setSubmitting]   = useState(false);
  const [showPass, setShowPass]       = useState(false);

  useEffect(() => {
    Promise.all([fetchAssistentes(), fetchAllProfiles()])
      .then(([ass, prof]) => {
        setAssistentes(ass);
        setProfiles(prof);
        const init: Record<string, DbPermissao[]> = {};
        ass.forEach(a => {
          const stored = a.assistente_permissoes ?? [];
          init[a.id] = MODULOS.map(m => stored.find(p => p.modulo === m.key) ?? { modulo: m.key, pode_inserir: false, pode_alterar: false, pode_excluir: false });
        });
        setLocalPerms(init);
        if (ass.length) setExpanded(ass[0].id);
      })
      .catch(() => toast.error('Erro ao carregar acessos.'))
      .finally(() => setLoading(false));
  }, []);

  const updatePerm = (id: string, perm: DbPermissao) =>
    setLocalPerms(prev => ({ ...prev, [id]: (prev[id] ?? emptyPermissoes()).map(p => p.modulo === perm.modulo ? perm : p) }));

  const savePerms = async (id: string) => {
    setSaving(id);
    try {
      await upsertPermissoes(id, localPerms[id] ?? emptyPermissoes(), user!.id);
      toast.success('Permissões salvas!');
    } catch { toast.error('Erro ao salvar.'); }
    finally { setSaving(null); }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    try {
      await revokeAssistente(revokeId);
      setAssistentes(prev => prev.filter(a => a.id !== revokeId));
      toast.success('Acesso revogado.');
    } catch { toast.error('Erro ao revogar.'); }
    finally { setRevokeId(null); setRevokeName(''); }
  };

  const addAssistente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) { toast.error('Preencha todos os campos.'); return; }
    if (newPassword.length < 8) { toast.error('Senha mínima: 8 caracteres.'); return; }
    setSubmitting(true);
    try {
      const perms = applyPreset(preset);
      const result = await adminCreateUser(
        { full_name: newName.trim(), email: newEmail.trim(), password: newPassword, role: 'assistente' },
        supabase as any
      );
      if (!result.success || !result.userId) { toast.error(result.error ?? 'Erro ao criar usuário.'); return; }
      await upsertPermissoes(result.userId, perms, user!.id);
      const updated = await fetchAssistentes();
      setAssistentes(updated);
      const init = { ...localPerms };
      updated.forEach(a => {
        if (!init[a.id]) init[a.id] = MODULOS.map(m => a.assistente_permissoes.find(p => p.modulo === m.key) ?? { modulo: m.key, pode_inserir: false, pode_alterar: false, pode_excluir: false });
      });
      setLocalPerms(init);
      setExpanded(result.userId);
      toast.success(`${newName} criado com sucesso!`);
      setNewName(''); setNewEmail(''); setNewPassword(''); setPreset('custom');
      gotoSlide(0);
    } catch (err: any) { toast.error(err?.message ?? 'Erro ao criar assistente.'); }
    finally { setSubmitting(false); }
  };

  const totalModulosAtivos = useMemo(() => assistentes.reduce((s, a) => {
    const p = localPerms[a.id] ?? emptyPermissoes();
    return s + p.filter(x => x.pode_inserir || x.pode_alterar || x.pode_excluir).length;
  }, 0), [assistentes, localPerms]);

  const byUnit = useMemo(() => profiles.reduce<Record<string, DbResident[]>>((acc, c) => {
    const key = c.unit_number ? `Chácara ${String(c.unit_number).padStart(3,'0')}` : 'Administração';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {}), [profiles]);

  // ─────────────────────────────────────────────────────────────────
  const slides: SlideItem[] = [

    /* ── Slide 1: Controle ── */
    {
      key: 'controle',
      label: 'Controle de Acessos',
      content: (
        <SlidePanel
          eyebrow="Princípio do menor privilégio"
          title={<>Gestão de <span className="grad-text">Acessos</span></>}
          badges={[
            { icon: '🛡️', label: `${assistentes.length} assistentes` },
            { icon: '🔐', label: '9 módulos configuráveis' },
            { icon: '⚡', label: 'Granular por operação' },
          ]}
          actions={
            <button
              onClick={() => { gotoSlide(1); }}
              className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
            >
              <UserPlus size={13} /> Novo
            </button>
          }
        >
          <div className="flex flex-col h-full gap-2.5">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Assistentes" value={String(assistentes.length)} icon={Users} iconColor={CYAN} iconBg="rgba(87,216,255,0.08)" />
              <StatCard label="Condôminos" value={String(profiles.length)} icon={Home} iconColor={BLUE} iconBg="rgba(90,132,255,0.08)" />
              <StatCard label="Permissões" value={String(totalModulosAtivos)} icon={Shield} iconColor={GREEN} iconBg="rgba(16,185,129,0.08)" />
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 p-0.5 rounded-xl bg-white/5 w-fit">
              {([
                { v: 'assistentes', l: `Assistentes (${assistentes.length})` },
                { v: 'condominos',  l: 'Condôminos'                          },
              ] as const).map(t => (
                <button key={t.v} onClick={() => setTab(t.v)}
                  className={`px-3 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all ${
                    tab === t.v ? 'bg-cyan text-[#07101c]' : 'text-white/50'
                  }`}>{t.l}</button>
              ))}
            </div>

            {/* Conteúdo das tabs */}
            <div className="flex-1 overflow-y-auto pr-0.5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs">
                  <Loader2 size={15} className="animate-spin" /> Carregando...
                </div>
              ) : tab === 'assistentes' ? (
                <div className="space-y-2">
                  {assistentes.length === 0 ? (
                    <div className="text-center py-10">
                      <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>Nenhum assistente cadastrado.</p>
                      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem', marginTop: 4 }}>Clique em "Novo" para criar o primeiro.</p>
                    </div>
                  ) : assistentes.map(a => {
                    const perms = localPerms[a.id] ?? emptyPermissoes();
                    const ativados = perms.filter(p => p.pode_inserir || p.pode_alterar || p.pode_excluir).length;
                    const isOpen = expanded === a.id;
                    return (
                      <div key={a.id} className="rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${isOpen ? 'rgba(87,216,255,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-3.5 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                          onClick={() => setExpanded(e => e === a.id ? null : a.id)}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg,#57d8ff,#5a84ff)', color: '#07101c' }}>
                              {a.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.82rem' }} className="truncate">{a.full_name}</p>
                              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }} className="truncate">{a.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: ativados > 0 ? 'rgba(87,216,255,0.12)' : 'rgba(255,255,255,0.05)', color: ativados > 0 ? CYAN : 'rgba(255,255,255,0.3)', border: `1px solid ${ativados > 0 ? 'rgba(87,216,255,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                              {ativados} módulo{ativados !== 1 ? 's' : ''}
                            </span>
                            {isOpen ? <ChevronUp size={13} style={{ color: CYAN }} /> : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                          </div>
                        </div>

                        {/* Permissões expandidas */}
                        {isOpen && (
                          <div className="px-3.5 pb-3.5 space-y-1.5"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                              Leitura é implícita — configure Criar, Editar e Excluir por módulo:
                            </p>
                            <div className="space-y-1.5">
                              {perms.map(p => (
                                <PermRow key={p.modulo} perm={p} onChange={perm => updatePerm(a.id, perm)} />
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-3">
                              <button
                                onClick={() => { setRevokeId(a.id); setRevokeName(a.full_name); }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                                style={{ background: 'rgba(239,68,68,0.09)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                              >
                                <Trash2 size={11} /> Revogar Acesso
                              </button>
                              <button
                                onClick={() => savePerms(a.id)}
                                disabled={saving === a.id}
                                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                              >
                                {saving === a.id
                                  ? <><Loader2 size={11} className="animate-spin" /> Salvando...</>
                                  : <><Save size={11} /> Salvar Permissões</>
                                }
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Tab condôminos */
                <div className="space-y-2">
                  {Object.entries(byUnit).sort().map(([unit, members]) => (
                    <div key={unit} className="rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-2 px-3 py-2"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(87,216,255,0.03)' }}>
                        <Home size={12} style={{ color: CYAN }} />
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }}>{unit}</p>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: CYAN, background: 'rgba(87,216,255,0.1)', border: '1px solid rgba(87,216,255,0.2)', borderRadius: 5, padding: '1px 5px', marginLeft: 2 }}>
                          {members.length}
                        </span>
                      </div>
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                              {m.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontWeight: 600, color: '#fff', fontSize: '0.75rem' }} className="truncate">{m.full_name}</p>
                              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem' }} className="truncate">{m.email}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                            style={{
                              background: m.role === 'assistente' ? 'rgba(87,216,255,0.1)' : m.role === 'sindico' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
                              color: m.role === 'assistente' ? CYAN : m.role === 'sindico' ? YELLOW : 'rgba(255,255,255,0.4)',
                              border: `1px solid ${m.role === 'assistente' ? 'rgba(87,216,255,0.2)' : m.role === 'sindico' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)'}`,
                            }}>
                            {m.role === 'assistente' ? 'Assistente' : m.role === 'sindico' ? 'Síndico' : 'Morador'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal revogar */}
          {revokeId && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
              <div className="rounded-2xl p-5 max-w-xs w-full mx-4 space-y-4" style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.98),rgba(8,13,24,.99))', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: RED }} />
                  </div>
                  <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Revogar Acesso?</h4>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{revokeName}</strong> perderá todos os acessos administrativos imediatamente.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setRevokeId(null); setRevokeName(''); }} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                  <button onClick={handleRevoke} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>Confirmar Revogação</button>
                </div>
              </div>
            </div>
          )}
        </SlidePanel>
      ),
    },

    /* ── Slide 2: Novo Assistente ── */
    {
      key: 'novo',
      label: 'Novo Assistente',
      content: (
        <SlidePanel
          eyebrow="Criar colaborador administrativo"
          title={<>Adicionar <span className="grad-text">Assistente</span></>}
          badges={[
            { icon: '✦', label: 'Cadastro Seguro' },
            { icon: '🔐', label: 'Menor Privilégio' },
            { icon: '⌘', label: 'Presets Rápidos' },
          ]}
        >
          <form onSubmit={addAssistente} className="flex flex-col gap-3 text-xs h-full overflow-y-auto pr-0.5">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label text-[11px]">Nome Completo *</label>
                <input className="input w-full" placeholder="Ex: Carlos Abreu"
                  value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div>
                <label className="input-label text-[11px]">E-mail Corporativo *</label>
                <input className="input w-full" type="email" placeholder="carlos@itauna.org"
                  value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="input-label text-[11px]">Senha Inicial * (mín. 8 caracteres)</label>
              <div className="relative">
                <input className="input w-full pr-10" type={showPass ? 'text' : 'password'}
                  placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer text-[10px]">
                  {showPass ? 'ocultar' : 'ver'}
                </button>
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={13} style={{ color: CYAN }} />
                <label className="input-label text-[11px] mb-0">Perfil de Permissão</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'custom',     l: 'Personalizado', desc: 'Configure manualmente', icon: Settings,  color: 'rgba(255,255,255,0.4)' },
                  { v: 'portaria',   l: 'Portaria',      desc: 'Moradores, Ocorrências, Agendamentos', icon: Shield,  color: CYAN   },
                  { v: 'financeiro', l: 'Finanças',      desc: 'Financeiro, Chácaras', icon: DollarSign, color: GREEN  },
                  { v: 'full',       l: 'Gerente Pleno', desc: 'Todos os módulos', icon: Lock, color: YELLOW },
                ].map(opt => {
                  const isActive = preset === opt.v;
                  return (
                    <button key={opt.v} type="button" onClick={() => setPreset(opt.v as any)}
                      className="p-3 rounded-xl flex items-start gap-2.5 text-left cursor-pointer transition-all"
                      style={{
                        background: isActive ? 'rgba(87,216,255,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? (opt.color === 'rgba(255,255,255,0.4)' ? 'rgba(255,255,255,0.2)' : opt.color + '35') : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: isActive ? `0 0 12px ${opt.color === 'rgba(255,255,255,0.4)' ? 'rgba(255,255,255,0.05)' : opt.color + '18'}` : 'none',
                      }}>
                      <opt.icon size={14} style={{ color: isActive ? (opt.color === 'rgba(255,255,255,0.4)' ? 'rgba(255,255,255,0.7)' : opt.color) : 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: isActive ? '#fff' : 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>{opt.l}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, lineHeight: 1.3 }}>{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl"
              style={{ background: 'rgba(87,216,255,0.05)', border: '1px solid rgba(87,216,255,0.12)' }}>
              <Lock size={11} className="flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                O assistente receberá e-mail com as credenciais. Permissões podem ser ajustadas a qualquer momento no slide anterior.
              </p>
            </div>

            <button type="submit" disabled={submitting}
              className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5">
              {submitting
                ? <><Loader2 size={13} className="animate-spin" /> Criando conta...</>
                : <><UserPlus size={13} /> Criar Assistente & Atribuir Permissões</>
              }
            </button>
          </form>
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
