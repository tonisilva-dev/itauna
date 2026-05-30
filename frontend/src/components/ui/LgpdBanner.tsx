/**
 * LgpdBanner — Banner de consentimento de cookies / LGPD
 * Exibido na primeira visita; persiste o consentimento em localStorage.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, X } from 'lucide-react';
import { lgpd } from '../../lib/security';

export const LgpdBanner = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Pequeno delay para não travar a primeira renderização
    const t = setTimeout(() => {
      if (!lgpd.hasConsent()) setVisible(true);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const accept = () => {
    lgpd.grantConsent('1.0');
    setVisible(false);
  };

  const reject = () => {
    lgpd.revokeConsent();
    setVisible(false);
  };

  return (
    <div
      className="animate-slide-up"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(560px, calc(100vw - 32px))',
        background: 'linear-gradient(160deg, rgba(13,20,35,.97), rgba(8,13,24,.99))',
        border: '1px solid rgba(87,216,255,.18)',
        borderRadius: 18,
        padding: '18px 20px',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 24px 64px rgba(0,0,0,.65), 0 0 0 1px rgba(87,216,255,.05)',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      {/* Ícone */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'rgba(87,216,255,.1)',
        border: '1px solid rgba(87,216,255,.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Shield size={18} style={{ color: 'var(--cyan)' }} />
      </div>

      {/* Texto */}
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', marginBottom: 5 }}>
          Privacidade &amp; Cookies — LGPD
        </p>
        <p style={{ fontSize: '0.775rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
          Utilizamos cookies essenciais para autenticação e funcionamento do sistema.
          Seus dados são tratados conforme a{' '}
          <button
            onClick={() => navigate('/privacidade')}
            style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.775rem', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            Política de Privacidade
          </button>
          {' '}do Condomínio Itaúna (Lei 13.709/2018).
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={accept}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '8px 18px' }}
          >
            Aceitar
          </button>
          <button
            onClick={reject}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            Recusar
          </button>
          <button
            onClick={() => navigate('/privacidade')}
            className="btn-ghost"
            style={{ fontSize: '0.775rem', color: 'var(--muted)' }}
          >
            Saber mais
          </button>
        </div>
      </div>

      {/* Fechar (dismiss temporário) */}
      <button
        onClick={reject}
        className="btn-ghost"
        style={{ padding: 4, flexShrink: 0, color: 'var(--muted2)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
