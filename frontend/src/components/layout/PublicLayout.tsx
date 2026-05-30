/**
 * PublicLayout — Layout para visitantes (sem login).
 * Exibe: Galeria, Classificados, Eventos.
 * Header minimalista com logo, navegação pública e botão "Entrar".
 */
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { TreePine, LogIn, Image, Tag, Calendar } from 'lucide-react';

const PUBLIC_NAV = [
  { to: '/galeria',       label: 'Galeria',       icon: Image    },
  { to: '/eventos',       label: 'Eventos',        icon: Calendar },
  { to: '/classificados', label: 'Classificados',  icon: Tag      },
];

export const PublicLayout = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* ── Ambient layers (mesmos do AppLayout) ── */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb-a" />
        <div className="bg-orb bg-orb-b" />
        <div className="bg-orb bg-orb-c" />
      </div>
      <div className="bg-grid"  aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header público ── */}
        <header style={{
          background: 'linear-gradient(180deg, rgba(12,18,33,.98), rgba(8,13,24,.97))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(125,157,224,.10)',
          padding: '0 1.25rem',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>

          {/* Logo */}
          <NavLink to="/galeria" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #72e3ff, #669dff)',
              boxShadow: '0 0 18px rgba(87,216,255,.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TreePine style={{ width: 18, height: 18, color: '#07101c' }} />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', lineHeight: 1 }}>Itaúna</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 1 }}>Chácaras • Ibiporã – PR</p>
            </div>
          </NavLink>

          {/* Nav pública */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {PUBLIC_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all .18s',
                  color: isActive ? 'var(--cyan)' : 'var(--muted)',
                  background: isActive ? 'rgba(87,216,255,.1)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(87,216,255,.18)' : 'transparent'}`,
                })}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* CTA Entrar */}
          <button
            className="btn-primary"
            style={{ flexShrink: 0, gap: 6 }}
            onClick={() => navigate('/login')}
          >
            <LogIn size={14} />
            <span>Entrar</span>
          </button>
        </header>

        {/* ── Conteúdo público ── */}
        <main style={{ flex: 1 }}>
          <div className="max-w-screen-2xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* ── Footer público ── */}
        <footer style={{
          borderTop: '1px solid rgba(125,157,224,.08)',
          padding: '20px 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: '0.75rem',
          color: 'var(--muted2)',
        }}>
          <span>© 2025 Condomínio de Chácaras Itaúna — Ibiporã – PR</span>
          <span style={{ opacity: .4 }}>•</span>
          <span>Todos os direitos reservados</span>
          <span style={{ opacity: .4 }}>•</span>
          <button
            onClick={() => navigate('/login')}
            style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            Área do condômino
          </button>
        </footer>
      </div>
    </>
  );
};
