import { ShieldOff, ArrowLeft, Lock, AlertTriangle, Crown, TreePine, Home, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageCarousel3D, type SlideItem } from './PageCarousel3D';
import { SlidePanel } from './SlidePanel';
import { useAuth } from '@/contexts/AuthContext';

const CYAN  = '#57d8ff';
const BLUE  = '#5a84ff';
const RED   = '#ef4444';
const AMBER = '#f59e0b';
const GREEN = '#10b981';

const ROUTE_META: Record<string, { label: string; action: string; icon: string }> = {
  '/unidades':  { label: 'Chácaras',         action: 'gerenciar as 389 unidades, vincular proprietários e controlar status financeiro', icon: '🏡' },
  '/moradores': { label: 'Moradores',         action: 'cadastrar, editar e inativar moradores e gerenciar perfis de acesso',            icon: '👥' },
  '/acessos':   { label: 'Gestão de Acessos', action: 'criar assistentes e configurar permissões granulares por módulo',                icon: '🔐' },
};

const PERFIS = [
  {
    role: 'Administrador',
    icon: Crown,
    emoji: '👑',
    color: CYAN,
    bg: 'rgba(87,216,255,0.07)',
    border: 'rgba(87,216,255,0.18)',
    tag: 'Acesso total',
    tagBg: 'rgba(87,216,255,0.12)',
    perms: ['Dashboard executivo', 'Gestão financeira plena', 'Chácaras & moradores', 'Portaria & comunicados', 'Parceiros & documentos', 'Gestão de acessos'],
  },
  {
    role: 'Síndico',
    icon: Home,
    emoji: '🏠',
    color: GREEN,
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.18)',
    tag: 'Acesso gestor',
    tagBg: 'rgba(16,185,129,0.12)',
    perms: ['Dashboard executivo', 'Visão financeira', 'Gestão de moradores', 'Controle de portaria', 'Comunicados & docs', 'Agendamentos'],
  },
  {
    role: 'Condômino',
    icon: User,
    emoji: '👤',
    color: BLUE,
    bg: 'rgba(90,132,255,0.07)',
    border: 'rgba(90,132,255,0.18)',
    tag: 'Seu perfil',
    tagBg: 'rgba(90,132,255,0.12)',
    perms: ['Situação financeira pessoal', 'Agendamentos', 'Ocorrências', 'Comunicados & galeria', 'Classificados', 'Perfil & preferências'],
  },
];

export const AcessoRestrito = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const meta      = ROUTE_META[location.pathname] ?? { label: 'esta área', action: 'acessar este módulo', icon: '🔒' };

  const roleMap: Record<string, string> = {
    admin:       'Administrador',
    sindico:     'Síndico',
    assistente:  'Assistente',
    condominino: 'Condômino',
  };
  const userRoleLabel = roleMap[user?.role ?? ''] ?? 'Condômino';

  const slideRestrito: SlideItem = {
    key: 'acesso-restrito',
    label: 'Acesso Restrito',
    content: (
      <SlidePanel
        eyebrow="Área protegida · Gestores apenas"
        title={<>Acesso <span className="grad-text">Restrito</span></>}
        badges={[
          { icon: '🛡️', label: 'Área Administrativa' },
          { icon: '🔒', label: 'Apenas Gestores' },
          { icon: meta.icon, label: meta.label },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-full gap-5 py-2">

          {/* ── Ícone animado ── */}
          <div className="relative flex items-center justify-center select-none">
            {/* anéis concêntricos */}
            {[80, 96, 112].map((size, i) => (
              <div
                key={size}
                className="absolute rounded-full animate-ping"
                style={{
                  width: size, height: size,
                  border: `1px solid rgba(239,68,68,${0.22 - i * 0.06})`,
                  animationDuration: `${2 + i * 0.7}s`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
            <div
              className="relative w-20 h-20 rounded-3xl flex items-center justify-center z-10"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(245,158,11,0.07))',
                border: '1px solid rgba(239,68,68,0.28)',
                boxShadow: '0 0 48px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <ShieldOff className="w-9 h-9" style={{ color: RED }} />
            </div>
          </div>

          {/* ── Título ── */}
          <div className="text-center space-y-1.5 max-w-sm">
            <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              Você não tem permissão<br/>para acessar esta área
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
              Somente <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>síndico e administradores</span> podem {meta.action}.
            </p>
          </div>

          {/* ── Card do usuário ── */}
          <div
            className="w-full max-w-[280px] rounded-2xl p-3.5 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(13,20,35,0.9), rgba(8,13,24,0.97))',
              border: '1px solid rgba(90,132,255,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(87,216,255,0.08)', border: '1px solid rgba(87,216,255,0.18)' }}
            >
              <Lock className="w-4 h-4" style={{ color: CYAN }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }} className="truncate">
                {user?.full_name ?? 'Condômino'}
              </p>
              <p style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                Perfil: {userRoleLabel} · sem acesso administrativo
              </p>
            </div>
          </div>

          {/* ── Aviso ── */}
          <div
            className="w-full max-w-[280px] rounded-xl p-3 flex items-start gap-2.5"
            style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.16)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: AMBER }} />
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>
              Acredita que deveria ter acesso a <strong style={{ color: 'rgba(255,255,255,0.62)' }}>{meta.label}</strong>? Entre em contato com a administração.
            </p>
          </div>

          {/* ── CTA ── */}
          <button
            onClick={() => navigate(-1)}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
        </div>
      </SlidePanel>
    ),
  };

  const slidePerfis: SlideItem = {
    key: 'acesso-perfis',
    label: 'Perfis do Sistema',
    content: (
      <SlidePanel
        eyebrow="Hierarquia de acesso"
        title={<>Perfis <span className="grad-text">do Sistema</span></>}
        badges={[
          { icon: '👑', label: 'Administrador' },
          { icon: '🏠', label: 'Síndico' },
          { icon: '👤', label: 'Condômino' },
        ]}
      >
        <div className="space-y-2.5 pr-0.5 h-full">
          {PERFIS.map(p => {
            const isCurrentUser = p.role === userRoleLabel;
            return (
              <div
                key={p.role}
                className="rounded-2xl p-4 space-y-3 transition-all"
                style={{
                  background: isCurrentUser
                    ? 'linear-gradient(135deg, rgba(90,132,255,0.10), rgba(13,20,35,0.95))'
                    : 'linear-gradient(135deg, rgba(13,20,35,0.85), rgba(8,13,24,0.97))',
                  border: `1px solid ${p.border}`,
                  boxShadow: isCurrentUser ? `0 0 20px ${p.color}14` : 'none',
                }}
              >
                {/* Cabeçalho do perfil */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: p.bg, border: `1px solid ${p.border}` }}
                    >
                      {p.emoji}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#fff' }}>{p.role}</span>
                  </div>
                  <span
                    className="text-[9.5px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: p.tagBg, color: p.color, border: `1px solid ${p.border}` }}
                  >
                    {p.tag}
                  </span>
                </div>

                {/* Permissões em grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {p.perms.map(perm => (
                    <div key={perm} className="flex items-center gap-1.5">
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: p.color }}
                      />
                      <span style={{ fontSize: '0.67rem', color: isCurrentUser ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.38)' }}>
                        {perm}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Rodapé */}
          <div
            className="rounded-xl p-3 flex items-center gap-2.5 mt-1"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <TreePine className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>
              Permissões gerenciadas pelo administrador em <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Gestão de Acessos</strong>. Mudanças entram em vigor imediatamente.
            </p>
          </div>
        </div>
      </SlidePanel>
    ),
  };

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={[slideRestrito, slidePerfis]} />
    </div>
  );
};
