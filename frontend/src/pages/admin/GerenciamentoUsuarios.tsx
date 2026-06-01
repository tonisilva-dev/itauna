import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Save, Mail, Shield, Phone, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { PageCarousel3D } from '../../components/ui/PageCarousel3D';
import type { SlideItem } from '../../components/ui/PageCarousel3D';
import { gotoSlide } from '../../utils/format';

interface Usuario {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  cpf?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ROLES = [
  { value: 'admin', label: '👑 Admin', color: '#f59e0b' },
  { value: 'sindico', label: '🏛️ Síndico', color: '#ef4444' },
  { value: 'assistente', label: '👤 Assistente', color: '#5a84ff' },
  { value: 'visualizador', label: '👁️ Visualizador', color: '#8b5cf6' },
];

export const GerenciamentoUsuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form novo usuário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<string>('assistente');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Carregar usuários
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const { data, error } = await (supabase
          .from('profiles')
          .select('*')
          .in('role', ['admin', 'sindico', 'assistente', 'visualizador'])
          .order('created_at', { ascending: false }) as any);

        if (error) throw error;
        setUsuarios(data || []);
      } catch (err: any) {
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    };

    loadUsuarios();
  }, []);

  // Criar novo usuário
  const handleAddUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (senha.length < 8) {
      toast.error('Senha mínima: 8 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      // Criar usuário via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nome.trim(), role },
      } as any);

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // Criar profile
      const { error: profileError } = await (supabase.from('profiles').insert({
        id: authData.user.id,
        email: email.trim(),
        full_name: nome.trim(),
        role,
        phone: telefone || null,
        cpf: cpf || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any) as any);

      if (profileError) throw profileError;

      // Recarregar lista
      const { data: newUsuarios } = await (supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'sindico', 'assistente', 'visualizador'])
        .order('created_at', { ascending: false }) as any);

      setUsuarios(newUsuarios || []);
      toast.success(`Usuário ${nome} criado com sucesso!`);

      // Limpar form
      setNome('');
      setEmail('');
      setSenha('');
      setTelefone('');
      setCpf('');
      setRole('assistente');
      gotoSlide(0);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  // Excluir usuário
  const handleDelete = async (usuarioId: string, usuarioNome: string) => {
    if (!confirm(`Desativar ${usuarioNome}? Esta ação pode ser reversível.`)) return;

    try {
      const result: any = (supabase as any)
        .from('profiles')
        .update({ is_active: false })
        .eq('id', usuarioId);

      const { error } = await result;
      if (error) throw error;
      setUsuarios(prev => prev.map(u => u.id === usuarioId ? { ...u, is_active: false } : u));
      toast.success(`${usuarioNome} desativado`);
    } catch (err: any) {
      toast.error('Erro ao desativar usuário');
    }
  };

  const slides: SlideItem[] = [
    {
      key: 'lista',
      label: 'Lista de Usuários',
      content: (
        <SlidePanel
          eyebrow="Controle centralizado"
          title={<>Gerenciamento de <span className="grad-text">Usuários</span></>}
          badges={[
            { icon: '👤', label: `${usuarios.length} usuários` },
            { icon: '🔐', label: '4 funções' },
            { icon: '✅', label: 'Ativos' },
          ]}
          actions={
            <button
              onClick={() => gotoSlide(1)}
              className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center"
            >
              <UserPlus size={13} /> Novo
            </button>
          }
        >
          <div className="flex flex-col h-full gap-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Total" value={String(usuarios.length)} icon={Users} iconColor="#57d8ff" />
              <StatCard label="Ativos" value={String(usuarios.filter(u => u.is_active).length)} icon={Shield} iconColor="#10b981" />
              <StatCard label="Inativos" value={String(usuarios.filter(u => !u.is_active).length)} icon={AlertCircle} iconColor="#f59e0b" />
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-white/40">
                  <Loader2 size={15} className="animate-spin" /> Carregando...
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-white/30 text-xs">Nenhum usuário cadastrado</p>
                </div>
              ) : (
                usuarios.map(u => {
                  const roleInfo = ROLES.find(r => r.value === u.role);
                  return (
                    <div
                      key={u.id}
                      className={`rounded-xl p-3 border transition-all ${
                        u.is_active
                          ? 'bg-white/5 border-white/10 hover:bg-white/8'
                          : 'bg-red-500/5 border-red-500/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: roleInfo?.color || '#666' }}
                          >
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{u.full_name}</p>
                            <p className="text-[0.7rem] text-white/50 truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span
                            className="text-[0.65rem] font-bold px-2 py-1 rounded-md"
                            style={{
                              background: `${roleInfo?.color || '#666'}20`,
                              color: roleInfo?.color || '#666',
                              border: `1px solid ${roleInfo?.color || '#666'}40`,
                            }}
                          >
                            {roleInfo?.label}
                          </span>
                          <button
                            onClick={() => handleDelete(u.id, u.full_name)}
                            disabled={!u.is_active}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-40"
                            title="Desativar usuário"
                          >
                            <Trash2 size={13} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </SlidePanel>
      ),
    },

    {
      key: 'novo',
      label: 'Novo Usuário',
      content: (
        <SlidePanel
          eyebrow="Criação"
          title={<>Cadastrar <span className="grad-text">Usuário</span></>}
          badges={[{ icon: '➕', label: 'Novo registro' }]}
        >
          <form onSubmit={handleAddUsuario} className="flex flex-col gap-4 h-full">
            {/* Nome */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5">Nome Completo *</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5">
                <Mail size={11} className="inline mr-1" /> Email *
              </label>
              <input
                type="email"
                placeholder="usuario@itauna.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5">Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Função */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5">
                <Shield size={11} className="inline mr-1" /> Função *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Telefone (opcional) */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5">
                <Phone size={11} className="inline mr-1" /> Telefone
              </label>
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* CPF (opcional) */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5">CPF</label>
              <input
                type="text"
                placeholder="123.456.789-10"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Botões */}
            <div className="flex-1 flex items-end gap-2">
              <button
                type="button"
                onClick={() => gotoSlide(0)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-3 py-2 rounded-lg bg-cyan-500/80 hover:bg-cyan-500 disabled:opacity-50 text-black text-sm font-bold transition-colors flex items-center justify-center gap-1"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar
              </button>
            </div>
          </form>
        </SlidePanel>
      ),
    },
  ];

  return <PageCarousel3D slides={slides} />;
};
