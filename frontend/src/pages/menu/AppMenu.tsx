import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Shield, Bell, Calendar, AlertCircle, Image,
  FileText, Tag, Search, Building2, TreePine, Home, Users,
  ShieldCheck, Zap, Lock, BarChart3, Phone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleCard {
  path: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
  color: string;
  bg: string;
  gestorOnly?: boolean;
}

const MODULES: ModuleCard[] = [
  { path: '/financeiro',       label: 'Financeiro',     desc: 'Rateios e prestação de contas',      Icon: DollarSign,   color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
  { path: '/portaria',         label: 'Portaria',       desc: 'Registro digital de acessos',         Icon: Shield,       color: '#57d8ff', bg: 'rgba(87,216,255,0.13)'  },
  { path: '/comunicados',      label: 'Comunicados',    desc: 'Avisos com prioridade visual',        Icon: Bell,         color: '#f59e0b', bg: 'rgba(245,158,11,0.13)'  },
  { path: '/agendamentos',     label: 'Agendamentos',   desc: 'Reserva de áreas comuns',             Icon: Calendar,     color: '#5a84ff', bg: 'rgba(90,132,255,0.13)'  },
  { path: '/ocorrencias',      label: 'Ocorrências',    desc: 'Chamados com workflow completo',      Icon: AlertCircle,  color: '#ef4444', bg: 'rgba(239,68,68,0.13)'   },
  { path: '/galeria',          label: 'Galeria',        desc: 'Fotos do condomínio',                 Icon: Image,        color: '#a78bfa', bg: 'rgba(167,139,250,0.13)' },
  { path: '/documentos',       label: 'Documentos',     desc: 'Atas, rateios e regulamento',         Icon: FileText,     color: '#6366f1', bg: 'rgba(99,102,241,0.13)'  },
  { path: '/classificados',    label: 'Classificados',  desc: 'Mural entre moradores',               Icon: Tag,          color: '#f59e0b', bg: 'rgba(245,158,11,0.11)'  },
  { path: '/achados-perdidos', label: 'Achados',        desc: 'Perdidos e encontrados',              Icon: Search,       color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { path: '/parceiros',        label: 'Parceiros',      desc: 'Descontos e vantagens locais',        Icon: Building2,    color: '#57d8ff', bg: 'rgba(87,216,255,0.10)'  },
  { path: '/eventos',          label: 'Eventos',        desc: 'Agenda e inscrições',                 Icon: TreePine,     color: '#10b981', bg: 'rgba(16,185,129,0.10)'  },
  { path: '/telefones-uteis',  label: 'Telefones',      desc: 'Contatos úteis e emergências',        Icon: Phone,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { path: '/unidades',         label: 'Chácaras',       desc: 'Censo e gestão de unidades',          Icon: Home,         color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', gestorOnly: true },
  { path: '/moradores',        label: 'Moradores',      desc: 'Cadastro e contato direto',           Icon: Users,        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', gestorOnly: true },
  { path: '/acessos',          label: 'Acessos',        desc: 'Permissões e perfis de acesso',       Icon: ShieldCheck,  color: '#5a84ff', bg: 'rgba(90,132,255,0.12)', gestorOnly: true },
];

const FEATURES = [
  { Icon: Zap,      label: 'Praticidade'        },
  { Icon: Lock,     label: 'LGPD Nativa'        },
  { Icon: BarChart3, label: 'Transparência Total' },
];

/* ── burst: overlay que anima do card para preencher a tela ── */
interface Burst {
  /* posição e tamanho iniciais (rect do card) */
  top: number; left: number; w: number; h: number;
  /* transform final calculado para preencher a área de conteúdo */
  tx: string; ty: string; sx: string; sy: string;
}

const HEADER_H = 60; // altura do AppHeader em px

export const AppMenu = () => {
  const { isGestor } = useAuth();
  const navigate = useNavigate();
  const [burst, setBurst] = useState<Burst | null>(null);

  const visible = MODULES.filter(m => !m.gestorOnly || isGestor);
  const base    = visible.filter(m => !m.gestorOnly);
  const gestor  = visible.filter(m => m.gestorOnly);

  const handleCardClick = useCallback((path: string, e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r  = el.getBoundingClientRect();

    // Área alvo: toda a janela abaixo do header
    const targetW  = window.innerWidth;
    const targetH  = window.innerHeight - HEADER_H;
    const targetCX = targetW  / 2;
    const targetCY = HEADER_H + targetH / 2;

    // Centro do card clicado
    const cardCX = r.left + r.width  / 2;
    const cardCY = r.top  + r.height / 2;

    const tx = targetCX - cardCX;
    const ty = targetCY - cardCY;
    const sx = targetW  / r.width;
    const sy = targetH  / r.height;

    setBurst({
      top: r.top, left: r.left, w: r.width, h: r.height,
      tx: `${tx}px`, ty: `${ty}px`,
      sx: `${sx}`,   sy: `${sy}`,
    });

    // Navega depois da animação
    setTimeout(() => {
      setBurst(null);
      navigate(path);
    }, 360);
  }, [navigate]);

  return (
    <>
      {/* ── overlay de transição ── */}
      {burst && (
        <div
          style={{
            position:     'fixed',
            top:          burst.top,
            left:         burst.left,
            width:        burst.w,
            height:       burst.h,
            borderRadius: '14px',
            background:   'linear-gradient(160deg, rgba(10,16,30,0.97), rgba(6,10,20,0.99))',
            border:       '1px solid rgba(87,216,255,0.22)',
            zIndex:       9999,
            pointerEvents:'none',
            transformOrigin: 'center center',
            animation:    'menu-burst 0.36s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            // CSS custom props para a animação
            ['--tx' as string]: burst.tx,
            ['--ty' as string]: burst.ty,
            ['--sx' as string]: burst.sx,
            ['--sy' as string]: burst.sy,
          }}
        />
      )}

      {/* ── grade ── */}
      <div className="w-full h-full overflow-y-auto overflow-x-hidden" style={{ padding: '16px 16px 32px' }}>
        <div
          className="rounded-3xl p-5 mb-4"
          style={{
            background: 'linear-gradient(160deg, rgba(16,24,45,0.95), rgba(8,13,28,0.97))',
            border: '1px solid rgba(87,216,255,0.10)',
          }}
        >
          <p style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', color: '#57d8ff', textTransform: 'uppercase', marginBottom: 8 }}>
            TECNOLOGIA &amp; SERVIÇOS INTEGRADOS
          </p>
          <h2 style={{ fontSize: 'clamp(1.4rem,5vw,1.85rem)', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 10 }}>
            Tudo na <span style={{ color: '#57d8ff' }}>palma da mão</span>
          </h2>
          <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 20 }}>
            Uma plataforma com 20+ módulos funcionais — financeiro, portaria, comunicados, agendamentos e muito mais, todos integrados.
          </p>

          {/* Grid base */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
            {base.map(m => (
              <ModCard key={m.path} card={m} onClick={e => handleCardClick(m.path, e)} />
            ))}
          </div>

          {/* Linha gestão */}
          {gestor.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '14px 0 12px', position: 'relative' }}>
                <span style={{
                  position: 'absolute', top: -9, left: 0,
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                  background: 'rgba(8,13,28,0.97)', paddingRight: 8,
                }}>Gestão</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {gestor.map(m => (
                  <ModCard key={m.path} card={m} onClick={e => handleCardClick(m.path, e)} />
                ))}
              </div>
            </>
          )}

          {/* Biometria highlight */}
          <button
            onClick={e => handleCardClick('/perfil', e)}
            style={{
              width: '100%', marginTop: 14,
              background: 'rgba(87,216,255,0.04)', border: '1px solid rgba(87,216,255,0.12)',
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(87,216,255,0.10)', border: '1px solid rgba(87,216,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#57d8ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                <path d="M2 12a10 10 0 0 1 18-6" />
                <path d="M2 16h.01" />
                <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem', marginBottom: 3 }}>Login por Digital / Face ID</p>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                Biometria WebAuthn/FIDO2 — a biometria fica no dispositivo, nunca em servidor.
              </p>
            </div>
          </button>

          {/* Features strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 14, gap: 8,
          }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <f.Icon size={13} style={{ color: '#57d8ff', flexShrink: 0 }} />
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Card individual ── */
const ModCard = ({
  card,
  onClick,
}: {
  card: ModuleCard;
  onClick: (e: React.MouseEvent) => void;
}) => (
  <button
    onClick={onClick}
    style={{
      background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '10px 8px',
      display: 'flex', flexDirection: 'column', gap: 7,
      cursor: 'pointer', textAlign: 'left',
      transition: 'background 0.15s, border-color 0.15s',
      WebkitTapHighlightColor: 'transparent',
      width: '100%', minWidth: 0, overflow: 'hidden',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = 'rgba(255,255,255,0.065)';
      el.style.borderColor = 'rgba(87,216,255,0.18)';
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = 'rgba(255,255,255,0.035)';
      el.style.borderColor = 'rgba(255,255,255,0.07)';
    }}
  >
    <div style={{
      width: 32, height: 32, borderRadius: 9,
      background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <card.Icon size={16} style={{ color: card.color }} />
    </div>
    <div style={{ minWidth: 0, width: '100%' }}>
      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.72rem', lineHeight: 1.2, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.label}</p>
      <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{card.desc}</p>
    </div>
  </button>
);
