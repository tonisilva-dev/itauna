import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isPushSupported, isSubscribed, subscribePush, unsubscribePush, getPermission } from '@/lib/push';

export const PushButton = ({ compact = false }: { compact?: boolean }) => {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

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
          toast.error('Permissão bloqueada. Desbloqueie nas configurações do navegador.');
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

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title={subscribed ? 'Desativar notificações' : 'Ativar notificações'}
        style={{
          width: 34, height: 34, borderRadius: 10,
          background: subscribed ? 'rgba(87,216,255,0.12)' : 'rgba(255,255,255,0.06)',
          border: subscribed ? '1px solid rgba(87,216,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
          color: subscribed ? '#57d8ff' : 'rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : subscribed
            ? <Bell size={14} />
            : <BellOff size={14} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
      style={{
        background: subscribed ? 'rgba(87,216,255,0.1)' : 'rgba(255,255,255,0.05)',
        border: subscribed ? '1px solid rgba(87,216,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
        color: subscribed ? '#57d8ff' : 'rgba(255,255,255,0.6)',
      }}
    >
      {loading
        ? <Loader2 size={13} className="animate-spin" />
        : subscribed ? <Bell size={13} /> : <BellOff size={13} />}
      {subscribed ? 'Notificações ativas' : 'Ativar notificações'}
    </button>
  );
};
