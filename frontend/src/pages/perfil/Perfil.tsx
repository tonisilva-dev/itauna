import { useState, useEffect, useRef, useMemo } from 'react';
import { Home, Lock, Camera, Shield, Bell, Eye, EyeOff, Check, Fingerprint, Loader2, TreePine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { unitLabel, formatDate, maskPhone } from '../../utils/format';
import { PageCarousel3D } from '../../components/ui/PageCarousel3D';
import type { SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import {
  isBiometricAvailable, getBiometricState, registerBiometric,
  clearBiometric, storeSessionTokens,
} from '@/lib/biometric';

// Client isolado só para verificar senha atual — não sobrescreve a sessão ativa
const supabaseVerify = createClient(
  import.meta.env.VITE_SUPABASE_URL  || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const Perfil = () => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Sincroniza campos quando o perfil é atualizado externamente
  useEffect(() => {
    if (!editing) {
      setName(user?.full_name || '');
      setPhone(user?.phone || '');
    }
  }, [user?.full_name, user?.phone, editing]);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Estados de segurança (alterar senha)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Biometria
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(a => {
      setBioAvailable(a);
      setBioEnabled(getBiometricState().enabled);
    });
  }, []);

  const handleBioActivate = async () => {
    setBioRegistering(true);
    const id = user?.id ?? user?.email ?? '';
    const name_ = (user?.email ?? '').split('@')[0];
    const ok = await registerBiometric(id, name_, user?.email ?? '');
    if (ok) {
      // Grava os tokens da sessão atual imediatamente — sem isso o login
      // biométrico não consegue restaurar a sessão após o logout.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) storeSessionTokens(session.access_token, session.refresh_token);
      setBioEnabled(true);
      toast.success('Digital cadastrada! Já pode usar no próximo login.');
    } else {
      toast.error('Não foi possível cadastrar. Verifique se o dispositivo suporta biometria.');
    }
    setBioRegistering(false);
  };

  const handleBioDeactivate = () => {
    clearBiometric();
    setBioEnabled(false);
    toast.success('Acesso por digital desativado.');
  };

  // Preferências
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPortaria, setNotifPortaria] = useState(true);
  const [notifOcorrencia, setNotifOcorrencia] = useState(true);
  const [notifClassificados, setNotifClassificados] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('O nome não pode estar vazio!');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ full_name: name, phone });
      setEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5 MB.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust para forçar recarga da imagem
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile({ avatar_url: publicUrl });
      toast.success('Foto de perfil atualizada!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar foto.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('A nova senha deve ser diferente da atual.');
      return;
    }

    setChangingPassword(true);
    try {
      // 1. Verifica a senha atual via client isolado (não afeta sessão ativa)
      const { error: verifyErr } = await supabaseVerify.auth.signInWithPassword({
        email:    user!.email,
        password: currentPassword,
      });
      if (verifyErr) {
        toast.error('Senha atual incorreta. Verifique e tente novamente.');
        return;
      }

      // 2. Atualiza a senha com a sessão ativa
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada com sucesso!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabel = useMemo(
    () => user?.role === 'admin' ? 'Administrador' : user?.role === 'sindico' ? 'Síndico' : 'Condômino',
    [user?.role]
  );

  const slides: SlideItem[] = [
    {
      key: 'pessoal',
      label: 'Dados Pessoais',
      content: (
        <SlidePanel
          title="Meu Perfil"
          eyebrow="Gerencie suas informações cadastrais e dados de contato"
        >
          <div className="space-y-4 h-full flex flex-col justify-between">
            {/* Cartão de identidade digital */}
            <div
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(13,20,40,0.97), rgba(8,13,28,0.98))',
                border: '1px solid rgba(87,216,255,0.2)',
                boxShadow: '0 0 32px rgba(87,216,255,0.06)',
              }}
            >
              {/* Orb decorativo */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(87,216,255,0.07) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

              <div className="flex items-center gap-4 relative z-10">
                {/* Avatar com botão de câmera */}
                <div className="relative flex-shrink-0">
                  <Avatar name={user?.full_name || 'U'} url={user?.avatar_url} size="xl" />
                  <button
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-50 cursor-pointer"
                    style={{ background: '#57d8ff', color: '#07101c' }}
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title="Alterar foto de perfil"
                  >
                    {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  </button>
                  <input ref={avatarInputRef} type="file" className="hidden"
                    accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <TreePine size={11} style={{ color: '#57d8ff', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      Condomínio Chácaras Itaúna
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }} className="truncate">
                    {user?.full_name}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: '#57d8ff', marginTop: 2 }} className="truncate">{user?.email}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(87,216,255,0.12)', color: '#57d8ff', border: '1px solid rgba(87,216,255,0.25)' }}>
                      <Shield size={9} /> {roleLabel}
                    </span>
                    {user?.unit_number && (
                      <span className="flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Home size={9} /> {unitLabel(user.unit_number)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.22)' }}>
                      ✓ Ativo
                    </span>
                  </div>
                </div>

                {!editing && (
                  <button className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0" onClick={() => setEditing(true)}>
                    Editar
                  </button>
                )}
              </div>
            </div>

            {/* Formulário de dados pessoais */}
            <div className="card p-5 space-y-4">
              <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>Informações Pessoais</h4>
              <div className="space-y-3.5">
                <div>
                  <label className="input-label">Nome Completo</label>
                  {editing ? (
                    <input className="input w-full" value={name} onChange={e => setName(e.target.value)} />
                  ) : (
                    <div className="input w-full bg-white/5 opacity-80" style={{ color: '#fff' }}>{user?.full_name || '—'}</div>
                  )}
                </div>
                <div>
                  <label className="input-label">E-mail de Cadastro</label>
                  <div className="input w-full bg-white/5 opacity-50 cursor-not-allowed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {user?.email}
                  </div>
                </div>
                <div>
                  <label className="input-label">Telefone de Contato</label>
                  {editing ? (
                    <input className="input w-full" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(43) 99999-0000" />
                  ) : (
                    <div className="input w-full bg-white/5 opacity-80" style={{ color: '#fff' }}>{user?.phone || '—'}</div>
                  )}
                </div>
                <div>
                  <label className="input-label">Último Acesso no Sistema</label>
                  <div className="input w-full bg-white/5 opacity-50 cursor-not-allowed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {user?.last_login ? formatDate(user.last_login, "dd/MM/yyyy 'às' HH:mm") : '—'}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex justify-end gap-2 pt-2">
                  <button className="btn-primary px-4 py-2 text-xs" onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  <button className="btn-ghost px-4 py-2 text-xs" onClick={() => setEditing(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </SlidePanel>
      )
    },
    {
      key: 'seguranca',
      label: 'Segurança & Alertas',
      content: (
        <SlidePanel
          title="Segurança & Notificações"
          eyebrow="Altere sua senha de acesso e configure seus alertas"
        >
          <div className="space-y-4 h-full flex flex-col justify-between">
            {/* Alteração de senha */}
            <form onSubmit={handleChangePassword} className="card p-5 space-y-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-cyan" />
                <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>Alterar Senha</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="input-label">Senha Atual</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input w-full"
                    placeholder="Sua senha atual"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Nova Senha</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input w-full"
                      placeholder="Mín. 8 dígitos"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label">Confirmar Senha</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input w-full"
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5">
                <button
                  type="button"
                  className="text-xs text-cyan flex items-center gap-1 bg-none border-none cursor-pointer"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPass ? 'Ocultar Senhas' : 'Mostrar Senhas'}
                </button>
                <button type="submit" disabled={changingPassword} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
                  {changingPassword
                    ? <><Loader2 size={12} className="animate-spin" /> Alterando...</>
                    : 'Alterar Senha'
                  }
                </button>
              </div>
            </form>

            {/* Acesso por Digital */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Fingerprint className="w-4 h-4 text-cyan" />
                <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>Acesso por Digital</h4>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p style={{ fontSize: '0.813rem', fontWeight: 600, color: '#fff' }}>
                    {bioEnabled ? 'Digital ativa neste dispositivo' : 'Digital não cadastrada'}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                    {bioEnabled
                      ? 'Use sua impressão digital para acessar o app sem senha'
                      : bioAvailable
                        ? 'Este dispositivo suporta biometria — ative para facilitar o acesso'
                        : 'Dispositivo não suporta autenticação biométrica'}
                  </p>
                </div>

                {bioEnabled ? (
                  <button
                    onClick={handleBioDeactivate}
                    className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
                  >
                    Desativar
                  </button>
                ) : bioAvailable ? (
                  <button
                    onClick={handleBioActivate}
                    disabled={bioRegistering}
                    className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{ background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.28)', color: '#57d8ff' }}
                  >
                    {bioRegistering ? 'Aguarde...' : 'Ativar'}
                  </button>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>Indisponível</span>
                )}
              </div>
            </div>

            {/* Preferências de alertas */}
            <div className="card p-5 space-y-3.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan" />
                  <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>Canais de Notificação</h4>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 7px' }}>
                  Em breve
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { state: notifEmail, set: setNotifEmail, title: 'Comunicados Oficiais', desc: 'Receber e-mails semanais da administração' },
                  { state: notifPortaria, set: setNotifPortaria, title: 'Alertas de Portaria', desc: 'Ser notificado ao receber correspondências ou encomendas' },
                  { state: notifOcorrencia, set: setNotifOcorrencia, title: 'Mural de Ocorrências', desc: 'Avisar quando houver novos tópicos de infração ou segurança' },
                  { state: notifClassificados, set: setNotifClassificados, title: 'Classificados e Chat', desc: 'Notificar propostas e mensagens de itens anunciados' },
                ].map(pref => (
                  <div
                    key={pref.title}
                    className="flex items-center justify-between p-2.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div>
                      <p style={{ fontSize: '0.813rem', fontWeight: 600, color: '#fff' }}>{pref.title}</p>
                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{pref.desc}</p>
                    </div>
                    <button
                      onClick={() => pref.set(!pref.state)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
                      style={{
                        background: pref.state ? 'rgba(0, 200, 200, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: pref.state ? '1px solid rgba(0, 200, 200, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                        color: pref.state ? '#00c8c8' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {pref.state ? <Check className="w-4 h-4" /> : null}
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
