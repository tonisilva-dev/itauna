import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign, Home, Users, Calendar,
  FileText, Image, AlertCircle, Bell, LogOut, Settings, ChevronRight,
  TreePine, Building2, Shield, Tag, Search, DoorOpen, ChevronLeft,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  gestorOnly?: boolean;
  badge?: string | number;
  dividerBefore?: boolean; // separador visual acima do item
}

/** Itens do menu em ordem semântica-relacional.
 *  Bloco 1 (condôminos): área pessoal + vida comunitária.
 *  Bloco 2 (gestão): separado por divider, visível só para gestores. */
const navItems: NavItem[] = [
  // ── Área pessoal ──
  { to: '/dashboard',        label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/financeiro',       label: 'Financeiro',         icon: DollarSign },
  { to: '/portaria',         label: 'Portaria',           icon: DoorOpen },
  { to: '/agendamentos',     label: 'Agendamentos',       icon: Calendar },
  { to: '/ocorrencias',      label: 'Ocorrências',        icon: AlertCircle },
  // ── Vida comunitária ──
  { to: '/comunicados',      label: 'Comunicados',        icon: Bell },
  { to: '/eventos',          label: 'Eventos',            icon: TreePine },
  { to: '/galeria',          label: 'Galeria',            icon: Image },
  { to: '/documentos',       label: 'Documentos',         icon: FileText },
  { to: '/classificados',    label: 'Classificados',      icon: Tag },
  { to: '/achados-perdidos', label: 'Achados e Perdidos', icon: Search },
  { to: '/parceiros',        label: 'Parceiros',          icon: Building2 },
  // ── Gestão (divider + gestorOnly) ──
  { to: '/unidades',         label: 'Chácaras',           icon: Home,    gestorOnly: true, dividerBefore: true },
  { to: '/moradores',        label: 'Moradores',          icon: Users,   gestorOnly: true },
  { to: '/acessos',          label: 'Acessos',            icon: Shield,  gestorOnly: true },
];

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ onClose, collapsed = false, onToggle }: SidebarProps) => {
  const { user, signOut, isGestor } = useAuth();
  const location = useLocation();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleSignOut = () => setConfirmSignOut(true);
  const doSignOut     = () => { setConfirmSignOut(false); signOut(); };

  const visible = navItems.filter(item => !item.gestorOnly || isGestor);

  return (
    <div
      className="flex flex-col h-full transition-all duration-300"
      style={{
        background: 'linear-gradient(180deg, rgba(13,20,35,.97), rgba(8,13,24,.98))',
        borderRight: '1px solid rgba(125,157,224,.10)',
        boxShadow: '4px 0 32px rgba(0,0,0,.35)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        width: collapsed ? 64 : 260,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-3 py-4 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(125,157,224,.08)',
          height: 64,
          gap: collapsed ? 0 : 12,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #72e3ff, #669dff)', boxShadow: '0 0 20px rgba(87,216,255,.35)' }}>
          <TreePine className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', lineHeight: 1, whiteSpace: 'nowrap' }}>Itaúna</p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Chácaras</p>
          </div>
        )}
        {!collapsed && <div className="dot-online flex-shrink-0" />}
      </div>

      {/* Toggle button na meia altura com '<' e '>' */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute z-30 flex items-center justify-center transition-all hover:scale-105"
          style={{
            top: '50%',
            right: -10,
            transform: 'translateY(-50%)',
            width: 20,
            height: 38,
            borderRadius: '6px',
            background: 'rgba(13, 20, 35, 0.95)',
            border: '1px solid rgba(125, 157, 224, 0.25)',
            color: '#57d8ff',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            fontSize: '11px',
            fontWeight: 900,
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '>' : '<'}
        </button>
      )}

      {/* Nav */}
      <nav className="sidebar-nav flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5"
        style={{ padding: collapsed ? '12px 8px' : '12px 12px' }}>
        {visible.map(item => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <div key={item.to}>
              {/* Separador gerencial */}
              {item.dividerBefore && (
                <div style={{
                  margin: collapsed ? '10px 4px' : '10px 4px',
                  borderTop: '1px solid rgba(125,157,224,.13)',
                  position: 'relative',
                }}>
                  {!collapsed && (
                    <span style={{
                      position: 'absolute',
                      top: -9,
                      left: 8,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.25)',
                      background: 'linear-gradient(180deg, rgba(13,20,35,.97), rgba(8,13,24,.98))',
                      padding: '0 6px',
                    }}>Gestão</span>
                  )}
                </div>
              )}
              <NavLink
                to={item.to}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={isActive ? 'nav-item nav-item-active' : 'nav-item'}
                style={collapsed ? {
                  justifyContent: 'center',
                  padding: '0.625rem',
                  gap: 0,
                } : {}}
              >
                <item.icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span className="flex-1 whitespace-nowrap">{item.label}</span>
                    {isActive && <ChevronRight style={{ width: 14, height: 14, opacity: 0.5 }} />}
                  </>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div
        style={{
          borderTop: '1px solid rgba(125,157,224,.08)',
          padding: collapsed ? '12px 8px' : '12px 12px',
        }}
        className="space-y-1 flex-shrink-0"
      >
        <NavLink
          to="/perfil"
          onClick={onClose}
          title={collapsed ? 'Configurações' : undefined}
          className={location.pathname === '/perfil' ? 'nav-item nav-item-active' : 'nav-item'}
          style={collapsed ? { justifyContent: 'center', padding: '0.625rem', gap: 0 } : {}}
        >
          <Settings style={{ width: 18, height: 18, flexShrink: 0 }} />
          {!collapsed && <span>Configurações</span>}
        </NavLink>

        {collapsed ? (
          <div className="flex flex-col items-center gap-2 pt-2">
            <Avatar name={user?.full_name || 'U'} url={user?.avatar_url} size="sm" />
            <button onClick={handleSignOut} className="btn-ghost p-1.5 rounded-lg w-full flex justify-center" title="Sair">
              <LogOut style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mt-1"
            style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(125,157,224,.1)' }}>
            <Avatar name={user?.full_name || 'U'} url={user?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '0.813rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name?.split(' ')[0] || 'Usuário'}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'sindico' ? 'Síndico' : `Chácara ${user?.unit_number ?? ''}`}
              </p>
            </div>
            <button onClick={signOut} className="btn-ghost p-1.5 rounded-lg flex-shrink-0" title="Sair">
              <LogOut style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        )}
      </div>

      {/* Modal de confirmação de saída */}
      {confirmSignOut && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
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
                <LogOut className="w-5 h-5" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', marginBottom: 4 }}>
                  Sair do sistema?
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  Você será desconectado da sua conta.
                  <br />
                  <strong style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {user?.full_name}
                  </strong>
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
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
