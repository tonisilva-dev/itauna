import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { PushButton } from '../PushButton';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':             'Menu',
  '/financeiro':            'Financeiro',
  '/gestao-financeira':     'Gestão Financeira',
  '/portaria':              'Portaria',
  '/comunicados':           'Comunicados',
  '/agendamentos':          'Reservas',
  '/ocorrencias':           'Chamados',
  '/galeria':               'Galeria',
  '/documentos':            'Documentos',
  '/classificados':         'Classificados',
  '/achados-perdidos':      'Achados & Perdidos',
  '/parceiros':             'Parceiros',
  '/eventos':               'Eventos',
  '/reunioes':              'Reuniões',
  '/unidades':              'Chácaras',
  '/moradores':             'Moradores',
  '/acessos':               'Gestão de Acessos',
  '/acesso-visitas':        'Acessos',
  '/analise-cenarios':      'Análise de Cenários',
  '/analise-acesso':        'Análise de Acesso',
  '/checklist-servicos':    'Checklist',
  '/benfeitorias':          'Benfeitorias',
  '/usuarios':              'Usuários',
  '/lgpd':                  'Privacidade',
  '/perfil':                'Perfil',
  '/telefones-uteis':       'Contatos Úteis',
  '/cobrancas':             'Cobranças',
};

function usePreviousLocation() {
  const location = useLocation();
  const pathRef  = useRef('/dashboard');
  const [prev, setPrev] = useState('/dashboard');
  useEffect(() => {
    setPrev(pathRef.current);
    pathRef.current = location.pathname;
  }, [location.pathname]);
  return prev;
}

export const AppHeader = () => {
  const { user, signOut } = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const prevPath     = usePreviousLocation();
  const [confirm, setConfirm] = useState(false);

  const isHome    = location.pathname === '/dashboard';
  const backLabel = ROUTE_LABELS[prevPath] ?? 'Voltar';

  return (
    <>
      <header style={{
        height: 60,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12,
        background: 'linear-gradient(180deg, rgba(10,15,30,0.98), rgba(7,11,22,0.97))',
        borderBottom: '1px solid rgba(125,157,224,0.10)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 40,
        flexShrink: 0,
      }}>

        {/* Left: logo (home) ou back button (módulo) */}
        {isHome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo-itauna-192.png"
              alt="Logo Itaúna"
              style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, objectFit: 'contain', background: '#fff' }}
            />
            <div>
              <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', lineHeight: 1 }}>Itaúna</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Chácaras · Ibiporã-PR</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 2px',
            }}
          >
            <ArrowLeft size={20} style={{ color: '#57d8ff' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{backLabel}</span>
          </button>
        )}

        {/* Right: push + avatar + logout */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PushButton compact />
          <NavLink
            to="/perfil"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '4px 6px', borderRadius: 10 }}
          >
            <Avatar name={user?.full_name || 'U'} url={user?.avatar_url} size="sm" />
            <div style={{ display: 'none' }} className="sm:block">
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {user?.full_name?.split(' ')[0]}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                {user?.role === 'admin' ? 'Admin' : user?.role === 'sindico' ? 'Síndico' : `Ch. ${user?.unit_number ?? ''}`}
              </p>
            </div>
          </NavLink>

          <button
            onClick={() => setConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 11px', borderRadius: 10,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: 'rgba(255,100,100,0.9)', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Modal de confirmação */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 340, borderRadius: 20, padding: '28px 24px',
            background: 'linear-gradient(135deg, rgba(13,20,35,0.98), rgba(8,13,24,0.99))',
            border: '1px solid rgba(239,68,68,0.28)',
            boxShadow: '0 0 48px rgba(239,68,68,0.12)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LogOut size={22} style={{ color: '#ef4444' }} />
              </div>
              <p style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', marginBottom: 6 }}>Sair do sistema?</p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Você será desconectado da sua conta.<br />
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{user?.full_name}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirm(false)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.65)', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                }}
              >Cancelar</button>
              <button
                onClick={async () => { setConfirm(false); try { await signOut(); } catch {} window.location.replace('/'); }}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.32)',
                  color: '#fca5a5', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
