import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Shield, Bell, Calendar, AlertCircle, Image,
  FileText, Tag, Search, Building2, TreePine, Home, Users,
  ShieldCheck, Lock, Phone, Leaf, TrendingUp, ClipboardList,
  Eye, User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Nivel = 'visitante' | 'morador' | 'gestor';

interface AppIcon {
  path: string;
  label: string;
  Icon: React.ElementType;
  gradient: string;
  nivel: Nivel;
}

const APPS: AppIcon[] = [
  /* ── Comunidade (visitante) ─────────────────────────────── */
  { path: '/galeria',                 label: 'Galeria',       Icon: Image,        gradient: 'linear-gradient(145deg,#7c3aed,#a78bfa)',  nivel: 'visitante' },
  { path: '/eventos',                 label: 'Eventos',       Icon: TreePine,     gradient: 'linear-gradient(145deg,#047857,#34d399)',  nivel: 'visitante' },
  { path: '/classificados',           label: 'Classificados', Icon: Tag,          gradient: 'linear-gradient(145deg,#b45309,#fbbf24)',  nivel: 'visitante' },
  { path: '/telefones-uteis',         label: 'Telefones',     Icon: Phone,        gradient: 'linear-gradient(145deg,#c2410c,#fb923c)',  nivel: 'visitante' },
  { path: '/responsabilidade-social', label: 'Resp. Social',  Icon: Leaf,         gradient: 'linear-gradient(145deg,#166534,#4ade80)',  nivel: 'visitante' },

  /* ── Morador ────────────────────────────────────────────── */
  { path: '/financeiro',        label: 'Transparência', Icon: Eye,          gradient: 'linear-gradient(145deg,#065f46,#10b981)',  nivel: 'morador' },
  { path: '/comunicados',       label: 'Comunicados',   Icon: Bell,         gradient: 'linear-gradient(145deg,#92400e,#f59e0b)',  nivel: 'morador' },
  { path: '/agendamentos',      label: 'Agendamentos',  Icon: Calendar,     gradient: 'linear-gradient(145deg,#1e3a8a,#3b82f6)',  nivel: 'morador' },
  { path: '/ocorrencias',       label: 'Ocorrências',   Icon: AlertCircle,  gradient: 'linear-gradient(145deg,#991b1b,#ef4444)',  nivel: 'morador' },
  { path: '/portaria',          label: 'Portaria',      Icon: Shield,       gradient: 'linear-gradient(145deg,#164e63,#06b6d4)',  nivel: 'morador' },
  { path: '/documentos',        label: 'Documentos',    Icon: FileText,     gradient: 'linear-gradient(145deg,#312e81,#6366f1)',  nivel: 'morador' },
  { path: '/achados-perdidos',  label: 'Achados',       Icon: Search,       gradient: 'linear-gradient(145deg,#14532d,#22c55e)',  nivel: 'morador' },
  { path: '/parceiros',         label: 'Parceiros',     Icon: Building2,    gradient: 'linear-gradient(145deg,#0c4a6e,#0ea5e9)',  nivel: 'morador' },

  /* ── Gestor ─────────────────────────────────────────────── */
  { path: '/unidades',           label: 'Chácaras',     Icon: Home,         gradient: 'linear-gradient(145deg,#374151,#9ca3af)',  nivel: 'gestor' },
  { path: '/moradores',          label: 'Moradores',    Icon: Users,        gradient: 'linear-gradient(145deg,#5b21b6,#c084fc)',  nivel: 'gestor' },
  { path: '/usuarios',           label: 'Usuários',     Icon: ShieldCheck,  gradient: 'linear-gradient(145deg,#155e75,#22d3ee)',  nivel: 'gestor' },
  { path: '/acessos',            label: 'Acessos',      Icon: Lock,         gradient: 'linear-gradient(145deg,#1e40af,#60a5fa)',  nivel: 'gestor' },
  { path: '/analise-cenarios',   label: 'Cenários',     Icon: TrendingUp,   gradient: 'linear-gradient(145deg,#064e3b,#34d399)',  nivel: 'gestor' },
  { path: '/checklist-servicos', label: 'Checklist',    Icon: ClipboardList,gradient: 'linear-gradient(145deg,#78350f,#fcd34d)',  nivel: 'gestor' },
  { path: '/gestao-financeira',  label: 'Financeiro',   Icon: DollarSign,   gradient: 'linear-gradient(145deg,#7f1d1d,#f87171)',  nivel: 'gestor' },
];

const SECTION_LABELS: Record<Nivel, string> = {
  visitante: 'Comunidade',
  morador:   'Área do Morador',
  gestor:    'Gestão',
};

const SECTION_COLORS: Record<Nivel, string> = {
  visitante: '#34d399',
  morador:   '#60a5fa',
  gestor:    '#f87171',
};

const HEADER_H = 60;

/* ── burst overlay ── */
interface Burst {
  top: number; left: number; w: number; h: number;
  tx: string; ty: string; sx: string; sy: string;
  gradient: string;
}

export const AppMenu = () => {
  const { isGestor } = useAuth();
  const navigate = useNavigate();
  const [burst, setBurst] = useState<Burst | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);

  const handleClick = useCallback((app: AppIcon, e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();

    const targetW  = window.innerWidth;
    const targetH  = window.innerHeight - HEADER_H;
    const targetCX = targetW / 2;
    const targetCY = HEADER_H + targetH / 2;
    const cardCX = r.left + r.width  / 2;
    const cardCY = r.top  + r.height / 2;

    setBurst({
      top: r.top, left: r.left, w: r.width, h: r.height,
      tx: `${targetCX - cardCX}px`,
      ty: `${targetCY - cardCY}px`,
      sx: `${targetW / r.width}`,
      sy: `${targetH / r.height}`,
      gradient: app.gradient,
    });

    setTimeout(() => {
      setBurst(null);
      navigate(app.path);
    }, 360);
  }, [navigate]);

  const visitante = APPS.filter(a => a.nivel === 'visitante');
  const morador   = APPS.filter(a => a.nivel === 'morador');
  const gestor    = APPS.filter(a => a.nivel === 'gestor');

  return (
    <>
      {/* burst transition */}
      {burst && (
        <div style={{
          position: 'fixed',
          top: burst.top, left: burst.left,
          width: burst.w, height: burst.h,
          borderRadius: '22px',
          background: burst.gradient,
          zIndex: 9999,
          pointerEvents: 'none',
          transformOrigin: 'center center',
          animation: 'menu-burst 0.36s cubic-bezier(0.4,0,0.2,1) forwards',
          ['--tx' as string]: burst.tx,
          ['--ty' as string]: burst.ty,
          ['--sx' as string]: burst.sx,
          ['--sy' as string]: burst.sy,
        }} />
      )}

      <div
        className="w-full h-full overflow-y-auto overflow-x-hidden"
        style={{ padding: '20px 16px 40px', background: 'rgba(6,10,20,0.0)' }}
      >
        <Section nivel="visitante" apps={visitante} onClickApp={handleClick} pressed={pressed} setPressed={setPressed} />
        <Section nivel="morador"   apps={morador}   onClickApp={handleClick} pressed={pressed} setPressed={setPressed} />
        {isGestor && (
          <Section nivel="gestor" apps={gestor} onClickApp={handleClick} pressed={pressed} setPressed={setPressed} />
        )}

        {/* Perfil / biometria */}
        <div style={{ marginTop: 8 }}>
          <SectionHeader nivel="morador" label="Minha Conta" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'clamp(10px,3vw,18px)', paddingTop: 4 }}>
            <AppIconBtn
              app={{ path: '/perfil', label: 'Perfil', Icon: User, gradient: 'linear-gradient(145deg,#1e3a5f,#57d8ff)', nivel: 'morador' }}
              onClickApp={handleClick}
              pressed={pressed}
              setPressed={setPressed}
            />
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Seção ── */
const Section = ({
  nivel, apps, onClickApp, pressed, setPressed,
}: {
  nivel: Nivel;
  apps: AppIcon[];
  onClickApp: (app: AppIcon, e: React.MouseEvent) => void;
  pressed: string | null;
  setPressed: (p: string | null) => void;
}) => (
  <div style={{ marginBottom: 20 }}>
    <SectionHeader nivel={nivel} label={SECTION_LABELS[nivel]} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'clamp(10px,3vw,18px)', paddingTop: 4 }}>
      {apps.map(app => (
        <AppIconBtn key={app.path} app={app} onClickApp={onClickApp} pressed={pressed} setPressed={setPressed} />
      ))}
    </div>
  </div>
);

/* ── Cabeçalho de seção ── */
const SectionHeader = ({ nivel, label }: { nivel: Nivel; label: string }) => {
  const color = SECTION_COLORS[nivel];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12, paddingBottom: 8,
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>
        {label}
      </span>
    </div>
  );
};

/* ── Ícone individual estilo iOS ── */
const AppIconBtn = ({
  app, onClickApp, pressed, setPressed,
}: {
  app: AppIcon;
  onClickApp: (app: AppIcon, e: React.MouseEvent) => void;
  pressed: string | null;
  setPressed: (p: string | null) => void;
}) => {
  const isPressed = pressed === app.path;

  return (
    <button
      onClick={e => onClickApp(app, e)}
      onMouseDown={() => setPressed(app.path)}
      onMouseUp={() => setPressed(null)}
      onMouseLeave={() => setPressed(null)}
      onTouchStart={() => setPressed(app.path)}
      onTouchEnd={() => setPressed(null)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '2px',
        WebkitTapHighlightColor: 'transparent',
        transform: isPressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.12s ease',
      }}
    >
      {/* Ícone iOS */}
      <div style={{
        width: '100%', aspectRatio: '1',
        borderRadius: 'clamp(14px,4.5vw,22px)',
        background: app.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isPressed
          ? '0 2px 8px rgba(0,0,0,0.5)'
          : '0 6px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Brilho interno (gloss) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '46%',
          background: 'linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 100%)',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }} />
        <div style={{ width: '27%', height: '27%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <app.Icon
            style={{
              width: '100%', height: '100%',
              color: '#fff',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
            }}
          />
        </div>
      </div>

      {/* Label */}
      <span style={{
        fontSize: 'clamp(9px,2.5vw,11px)',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.88)',
        textAlign: 'center',
        lineHeight: 1.25,
        letterSpacing: '-0.01em',
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {app.label}
      </span>
    </button>
  );
};
