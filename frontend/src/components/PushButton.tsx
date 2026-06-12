import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, X, Smartphone, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isPushSupported, isSubscribed, subscribePush, unsubscribePush, getPermission } from '@/lib/push';

function getUnblockSteps(): { platform: string; steps: string[] } {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);

  if (isIOS && isSafari) return {
    platform: 'Safari (iOS)',
    steps: [
      'Abra Ajustes do iPhone',
      'Role até "Safari" e toque',
      'Toque em "Configurações para sites"',
      'Toque em "Notificações"',
      'Localize itauna.org e mude para "Permitir"',
    ],
  };
  if (isAndroid && isChrome) return {
    platform: 'Chrome (Android)',
    steps: [
      'Toque nos 3 pontos (⋮) no canto superior direito',
      'Vá em Configurações → Configurações do site',
      'Toque em "Notificações"',
      'Localize itauna.org e toque em "Permitir"',
    ],
  };
  if (isChrome) return {
    platform: 'Chrome',
    steps: [
      'Clique no cadeado 🔒 na barra de endereços',
      'Clique em "Permissões do site"',
      'Em "Notificações", mude para "Permitir"',
      'Recarregue a página',
    ],
  };
  if (isFirefox) return {
    platform: 'Firefox',
    steps: [
      'Clique no ícone de escudo/cadeado na barra de endereços',
      'Clique em "Mais informações"',
      'Na aba "Permissões", remova o bloqueio de Notificações',
      'Recarregue a página',
    ],
  };
  return {
    platform: 'Navegador',
    steps: [
      'Acesse as configurações do seu navegador',
      'Vá em "Permissões de site" ou "Privacidade"',
      'Localize itauna.org e permita Notificações',
      'Recarregue a página',
    ],
  };
}

const UnblockModal = ({ onClose }: { onClose: () => void }) => {
  const { platform, steps } = getUnblockSteps();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'linear-gradient(135deg,rgba(13,20,35,0.98),rgba(7,16,28,0.99))', border: '1px solid rgba(87,216,255,0.2)', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile ? <Smartphone size={18} style={{ color: '#57d8ff' }} /> : <Monitor size={18} style={{ color: '#57d8ff' }} />}
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Desbloquear Notificações</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>
          A permissão de notificações foi bloqueada no <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{platform}</strong>. Siga os passos abaixo para reativar:
        </p>
        <ol style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#57d8ff', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={onClose}
          style={{ marginTop: 20, width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(87,216,255,0.1)', border: '1px solid rgba(87,216,255,0.25)', color: '#57d8ff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          Entendi
        </button>
      </div>
    </div>
  );
};

export const PushButton = ({ compact = false }: { compact?: boolean }) => {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [showUnblock, setShowUnblock] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    isSubscribed().then(setSubscribed);
  }, []);

  if (!supported || !user) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribePush();
        setSubscribed(false);
        toast.success('Notificações desativadas.');
      } else {
        if (getPermission() === 'denied') {
          setShowUnblock(true);
          return;
        }
        const ok = await subscribePush(user.id);
        if (ok) {
          setSubscribed(true);
          toast.success('Notificações ativadas!');
        } else {
          toast.error('Permissão negada.');
        }
      }
    } catch {
      toast.error('Erro ao configurar notificações.');
    } finally {
      setLoading(false);
    }
  };

  const denied = getPermission() === 'denied';

  if (compact) {
    return (
      <>
        {showUnblock && <UnblockModal onClose={() => setShowUnblock(false)} />}
        <button
          onClick={toggle}
          disabled={loading}
          title={denied ? 'Notificações bloqueadas — toque para ver como desbloquear' : subscribed ? 'Desativar notificações' : 'Ativar notificações'}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: denied ? 'rgba(239,68,68,0.10)' : subscribed ? 'rgba(87,216,255,0.12)' : 'rgba(255,255,255,0.06)',
            border: denied ? '1px solid rgba(239,68,68,0.3)' : subscribed ? '1px solid rgba(87,216,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
            color: denied ? '#fca5a5' : subscribed ? '#57d8ff' : 'rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : denied
              ? <BellOff size={14} />
              : subscribed
                ? <Bell size={14} />
                : <BellOff size={14} />}
        </button>
      </>
    );
  }

  return (
    <>
      {showUnblock && <UnblockModal onClose={() => setShowUnblock(false)} />}
      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
        style={{
          background: denied ? 'rgba(239,68,68,0.08)' : subscribed ? 'rgba(87,216,255,0.1)' : 'rgba(255,255,255,0.05)',
          border: denied ? '1px solid rgba(239,68,68,0.25)' : subscribed ? '1px solid rgba(87,216,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
          color: denied ? '#fca5a5' : subscribed ? '#57d8ff' : 'rgba(255,255,255,0.6)',
        }}
      >
        {loading
          ? <Loader2 size={13} className="animate-spin" />
          : denied
            ? <BellOff size={13} />
            : subscribed ? <Bell size={13} /> : <BellOff size={13} />}
        {denied ? 'Notificações bloqueadas' : subscribed ? 'Notificações ativas' : 'Ativar notificações'}
      </button>
    </>
  );
};
