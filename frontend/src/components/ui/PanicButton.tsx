/**
 * PanicButton — Botão de pânico flutuante para moradores.
 * Aciona push para todos os gestores + portaria e registra evento.
 * Countdown de 3s para evitar disparos acidentais.
 */
import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { insertPanicEvent } from '@/lib/supabase-queries';
import { sendPushNotification } from '@/lib/push';
import { supabase } from '@/lib/supabase';

const RED      = '#ef4444';
const REDBG    = 'rgba(239,68,68,0.12)';
const REDBORD  = 'rgba(239,68,68,0.4)';

type State = 'idle' | 'confirm' | 'countdown' | 'sent' | 'error';

export const PanicButton = () => {
  const { user } = useAuth();
  const [state, setState]       = useState<State>('idle');
  const [count, setCount]       = useState(3);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Só mostra para moradores/condomínio
  const isMorador = user?.role === 'condominino';
  if (!isMorador) return null;

  const chacaraNum = user?.unit_number
    ? String(user.unit_number).padStart(3, '0')
    : null;

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCount(3);
    setState('confirm');
  };

  const startCountdown = () => {
    setState('countdown');
    setCount(3);
    let c = 3;
    timerRef.current = setInterval(() => {
      c--;
      setCount(c);
      if (c <= 0) {
        clearInterval(timerRef.current!);
        firePanic();
      }
    }, 1000);
  };

  const firePanic = async () => {
    setState('sent');
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* geolocation optional */ }

      await insertPanicEvent({
        user_id: user!.id,
        chacara_numero: chacaraNum,
        lat, lng,
        nota: null,
      });

      // Busca gestores para push direcional
      const { data: gestores } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'sindico', 'assistente']);

      const targetIds = (gestores ?? []).map((g: { id: string }) => g.id);

      await sendPushNotification({
        title: `🚨 PÂNICO — Chácara ${chacaraNum ?? '?'}`,
        body: `${user!.full_name ?? 'Morador'} acionou o botão de pânico. Verifique imediatamente.`,
        url: '/portaria',
        targetUserIds: targetIds.length ? targetIds : undefined,
      });

      // Auto-fecha após 8s
      setTimeout(() => { setState('idle'); setExpanded(false); }, 8000);
    } catch {
      setState('error');
      setTimeout(() => setState('confirm'), 3000);
    }
  };

  // Cleanup
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  /* ── Floating button (collapsed) ── */
  if (!expanded && state === 'idle') {
    return (
      <button
        onClick={() => { setExpanded(true); setState('confirm'); }}
        aria-label="Botão de pânico — emergência"
        style={{
          position: 'fixed', bottom: 88, right: 16, zIndex: 100,
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(239,68,68,0.18)',
          border: '1.5px solid rgba(239,68,68,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(239,68,68,0.25)',
          animation: 'panic-pulse 3s ease infinite',
        }}
      >
        <AlertTriangle size={20} color={RED} />
        <style>{`
          @keyframes panic-pulse {
            0%,100% { box-shadow: 0 4px 20px rgba(239,68,68,0.25); }
            50%      { box-shadow: 0 4px 28px rgba(239,68,68,0.5); }
          }
        `}</style>
      </button>
    );
  }

  /* ── Expanded panel ── */
  return (
    <div
      style={{
        position: 'fixed', bottom: 80, right: 12, left: 12, zIndex: 100,
        maxWidth: 400, margin: '0 auto',
        background: 'linear-gradient(160deg, rgba(20,5,5,0.97), rgba(15,3,3,0.99))',
        border: `1.5px solid ${REDBORD}`,
        borderRadius: 20, padding: '18px 18px 16px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 60px rgba(239,68,68,0.3)',
        animation: 'slideUp 0.22s ease both',
      }}
      role="alertdialog"
      aria-label="Painel de emergência"
    >
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes countdown-ring { 0% { stroke-dashoffset: 100; } 100% { stroke-dashoffset: 0; } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: REDBG, border: `1px solid ${REDBORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={16} color={RED} />
          </div>
          <div>
            <p style={{ fontWeight: 900, fontSize: 13, color: '#fff', lineHeight: 1 }}>Botão de Pânico</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Polícia · Bombeiros · SAMU
            </p>
          </div>
        </div>
        {state !== 'countdown' && (
          <button onClick={() => { setState('idle'); setExpanded(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} color="rgba(255,255,255,0.4)" />
          </button>
        )}
      </div>

      {/* Confirm */}
      {state === 'confirm' && (
        <>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 14 }}>
            Aciona alerta simultâneo para síndico e portaria com sua localização. Use apenas em situações de perigo real.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setState('idle'); setExpanded(false); }} style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button onClick={startCountdown} style={{
              flex: 2, padding: '11px 0', borderRadius: 12, border: `1px solid ${REDBORD}`,
              background: 'rgba(239,68,68,0.18)', color: RED,
              fontWeight: 900, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <AlertTriangle size={14} /> Acionar Agora
            </button>
          </div>
          <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Phone size={11} color="rgba(255,255,255,0.35)" />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergências externas</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['190','Polícia'],['192','SAMU'],['193','Bombeiros']].map(([n, l]) => (
                <a key={n} href={`tel:${n}`} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, textAlign: 'center', textDecoration: 'none',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{n}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{l}</div>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Countdown */}
      {state === 'countdown' && (
        <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 14px' }}>
            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="5" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={RED} strokeWidth="5"
                strokeDasharray="213" strokeDashoffset={213 - (213 * (3 - count) / 3)}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 900, color: RED,
            }}>{count}</div>
          </div>
          <p style={{ fontWeight: 900, fontSize: 14, color: '#fff', marginBottom: 4 }}>Acionando em {count}s…</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>Notificando síndico e portaria</p>
          <button onClick={cancelCountdown} style={{
            width: '100%', padding: '12px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)',
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            ✕ Cancelar
          </button>
        </div>
      )}

      {/* Sent */}
      {state === 'sent' && (
        <div style={{ textAlign: 'center', padding: '4px 0 4px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
            background: REDBG, border: `2px solid ${RED}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'panic-pulse 1.5s ease infinite',
          }}>
            <AlertTriangle size={28} color={RED} />
          </div>
          <p style={{ fontWeight: 900, fontSize: 16, color: RED, marginBottom: 6 }}>🚨 Alerta enviado!</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
            Síndico e portaria foram notificados.<br />
            Aguarde ou ligue para os serviços de emergência.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {[['190','Polícia'],['192','SAMU'],['193','Bombeiros']].map(([n, l]) => (
              <a key={n} href={`tel:${n}`} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, textAlign: 'center', textDecoration: 'none',
                background: 'rgba(239,68,68,0.1)', border: `1px solid ${REDBORD}`,
              }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: RED }}>{n}</div>
                <div style={{ fontSize: 8, color: 'rgba(239,68,68,0.7)' }}>{l}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <p style={{ fontSize: 12, color: RED, textAlign: 'center' }}>
          Erro ao enviar. Ligue diretamente: 190 · 192 · 193
        </p>
      )}
    </div>
  );
};
