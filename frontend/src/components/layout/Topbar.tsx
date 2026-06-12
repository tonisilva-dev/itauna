import { useState } from 'react';
import { Menu, Bell, Search, X, Info, LogOut } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '../../utils/format';
import { NavLink } from 'react-router-dom';

// Social icons SVG inline (Instagram, YouTube, X/Twitter)
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export const Topbar = ({ onMenuClick, title }: TopbarProps) => {
  const { user, signOut } = useAuth();
  const [showSearch, setShowSearch]         = useState(false);
  const [showQuemSomos, setShowQuemSomos]   = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const doSignOut = () => { setConfirmSignOut(false); signOut(); };

  return (
    <>
      <header
        style={{
          background: 'linear-gradient(180deg, rgba(12,18,33,.98), rgba(8,13,24,.97))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(125,157,224,.10)',
          boxShadow: '0 1px 0 rgba(87,216,255,.04)',
          padding: '0 1rem',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Mobile menu button */}
        <button className="btn-ghost p-2 lg:hidden flex-shrink-0" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title */}
        {!showSearch && (
          <div className="flex-1 min-w-0">
            {title && (
              <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </h1>
            )}
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              {formatDate(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy")}
            </p>
          </div>
        )}

        {/* Search bar */}
        {showSearch && (
          <div className="flex-1 animate-fade-in">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input
                autoFocus
                className="input pl-10 pr-10"
                placeholder="Buscar chácaras, moradores, documentos..."
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-0.5"
                onClick={() => setShowSearch(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {/* Quem Somos link */}
          <button
            onClick={() => setShowQuemSomos(true)}
            className="hidden sm:flex items-center gap-1.5 btn-ghost px-3 py-1.5 text-sm"
            style={{ color: 'var(--muted)', fontSize: '0.813rem' }}
          >
            <Info className="w-4 h-4" />
            <span className="hidden md:inline">Quem Somos</span>
          </button>

          {/* Social icons */}
          <div className="hidden sm:flex items-center gap-0.5">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
              className="btn-ghost p-2 rounded-lg transition-all"
              style={{ color: 'var(--muted2)' }}
              title="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
              className="btn-ghost p-2 rounded-lg transition-all"
              style={{ color: 'var(--muted2)' }}
              title="YouTube">
              <YouTubeIcon />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer"
              className="btn-ghost p-2 rounded-lg transition-all"
              style={{ color: 'var(--muted2)' }}
              title="X (Twitter)">
              <XIcon />
            </a>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 mx-1" style={{ background: 'rgba(125,157,224,.12)' }} />

          {/* Search trigger */}
          <button className="btn-ghost p-2" onClick={() => setShowSearch(!showSearch)}>
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button className="btn-ghost p-2 relative">
            <Bell className="w-4 h-4" />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: '#00c8c8', boxShadow: '0 0 6px rgba(0,200,200,0.6)' }}
            />
          </button>

          {/* Avatar + nome (link para perfil) */}
          <NavLink to="/perfil" className="flex items-center gap-2 pl-1.5 cursor-pointer rounded-xl transition-all hover:bg-white/5 pr-2 py-1">
            <Avatar name={user?.full_name || 'U'} url={user?.avatar_url} size="sm" />
            <div className="hidden sm:block">
              <p style={{ fontSize: '0.813rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {user?.full_name?.split(' ')[0]}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'sindico' ? 'Síndico' : `Chácara ${user?.unit_number ?? ''}`}
              </p>
            </div>
          </NavLink>

          {/* Botão Sair — fixo no canto superior direito */}
          <button
            onClick={() => setConfirmSignOut(true)}
            className="flex items-center gap-1.5 btn-ghost px-3 py-1.5 rounded-xl border border-white/8 hover:border-red-500/30 hover:bg-red-500/8 transition-all"
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: 600 }}
            title="Sair do sistema"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Modal de confirmação de saída */}
      {confirmSignOut && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-5"
            style={{
              background: 'linear-gradient(135deg, rgba(13,20,35,0.98), rgba(8,13,24,0.99))',
              border: '1px solid rgba(239,68,68,0.28)',
              boxShadow: '0 0 48px rgba(239,68,68,0.12)',
            }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <LogOut className="w-6 h-6" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', marginBottom: 6 }}>
                  Sair do sistema?
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  Você será desconectado da sua conta.<br />
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{user?.full_name}</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmSignOut(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancelar
              </button>
              <button
                onClick={doSignOut}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.32)' }}
              >
                <LogOut size={14} /> Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quem Somos Modal */}
      {showQuemSomos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => e.target === e.currentTarget && setShowQuemSomos(false)}
        >
          <div className="card w-full max-w-lg p-6 animate-slide-up" style={{ border: '1px solid rgba(87,216,255,.18)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #72e3ff, #669dff)', boxShadow: '0 0 16px rgba(87,216,255,.3)' }}>
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h3 style={{ fontWeight: 700, color: '#fff', fontSize: '1.15rem' }}>Quem Somos</h3>
              </div>
              <button className="btn-ghost p-1.5" onClick={() => setShowQuemSomos(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <p>
                O <strong style={{ color: '#fff' }}>Condomínio de Chácaras Itaúna</strong> é um empreendimento
                exclusivo localizado em Ibiporã – PR, composto por <strong style={{ color: 'var(--cyan)' }}>389 chácaras</strong>{' '}
                com infraestrutura completa e segurança 24 horas.
              </p>
              <p>
                Nosso sistema de gestão digital foi desenvolvido para proporcionar praticidade, transparência e comunicação eficiente
                entre moradores, condôminos e a administração do condomínio.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: '389 Chácaras', desc: 'Unidades cadastradas' },
                  { label: 'Gestão 360°', desc: 'Financeiro, eventos, segurança' },
                  { label: 'Segurança 24h', desc: 'Portaria e monitoramento' },
                  { label: 'App moderno', desc: 'Acesso de qualquer dispositivo' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: 'rgba(87,216,255,.06)', border: '1px solid rgba(87,216,255,.12)' }}>
                    <p style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              {/* Social links */}
              <div className="flex items-center gap-3 pt-2">
                <span style={{ fontSize: '0.813rem', color: 'rgba(255,255,255,0.4)' }}>Siga-nos:</span>
                {[
                  { icon: <InstagramIcon />, label: 'Instagram', href: 'https://instagram.com' },
                  { icon: <YouTubeIcon />,   label: 'YouTube',   href: 'https://youtube.com'  },
                  { icon: <XIcon />,         label: 'X',         href: 'https://x.com'        },
                ].map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    title={s.label}
                    className="flex items-center justify-center rounded-lg transition-all"
                    style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
