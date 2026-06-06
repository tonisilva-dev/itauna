import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Shield, Bell, Calendar, AlertCircle, Image,
  FileText, Tag, Search, Building2, TreePine, Home, Users,
  ShieldCheck, Lock, Phone, Leaf, TrendingUp, ClipboardList,
  Eye, User, Package, Activity,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { countEncomendasPendentes } from '@/lib/supabase-queries';
import './AppMenu.css';

type Nivel = 'visitante' | 'morador' | 'gestor';

interface AppIcon {
  path: string;
  label: string;
  Icon: React.ElementType;
  gradient: string;
  nivel: Nivel;
  badge?: number;
}

const APPS: AppIcon[] = [
  { path: '/galeria',                 label: 'Galeria',       Icon: Image,         gradient: 'linear-gradient(145deg,#7c3aed,#a78bfa)', nivel: 'visitante' },
  { path: '/eventos',                 label: 'Eventos',       Icon: TreePine,      gradient: 'linear-gradient(145deg,#047857,#34d399)', nivel: 'visitante' },
  { path: '/classificados',           label: 'Classificados', Icon: Tag,           gradient: 'linear-gradient(145deg,#b45309,#fbbf24)', nivel: 'visitante' },
  { path: '/telefones-uteis',         label: 'Telefones',     Icon: Phone,         gradient: 'linear-gradient(145deg,#c2410c,#fb923c)', nivel: 'visitante' },
  { path: '/responsabilidade-social', label: 'Resp. Social',  Icon: Leaf,          gradient: 'linear-gradient(145deg,#166534,#4ade80)', nivel: 'visitante' },

  { path: '/financeiro',        label: 'Transparência',    Icon: Eye,          gradient: 'linear-gradient(145deg,#065f46,#10b981)', nivel: 'morador' },
  { path: '/comunicados',       label: 'Comunicados',      Icon: Bell,         gradient: 'linear-gradient(145deg,#92400e,#f59e0b)', nivel: 'morador' },
  { path: '/agendamentos',      label: 'Reservas',         Icon: Calendar,     gradient: 'linear-gradient(145deg,#1e3a8a,#3b82f6)', nivel: 'morador' },
  { path: '/ocorrencias',       label: 'Ocorrências',      Icon: AlertCircle,  gradient: 'linear-gradient(145deg,#991b1b,#ef4444)', nivel: 'morador' },
  { path: '/acesso-visitas',      label: 'Acesso & Visitas', Icon: Shield,       gradient: 'linear-gradient(145deg,#164e63,#06b6d4)', nivel: 'morador' },
  { path: '/acesso-visitas?enc=1', label: 'Encomendas',    Icon: Package,      gradient: 'linear-gradient(145deg,#78350f,#f59e0b)', nivel: 'morador' },
  { path: '/documentos',        label: 'Documentos',       Icon: FileText,     gradient: 'linear-gradient(145deg,#312e81,#6366f1)', nivel: 'morador' },
  { path: '/achados-perdidos',  label: 'Achados',          Icon: Search,       gradient: 'linear-gradient(145deg,#14532d,#22c55e)', nivel: 'morador' },
  { path: '/parceiros',         label: 'Parceiros',        Icon: Building2,    gradient: 'linear-gradient(145deg,#0c4a6e,#0ea5e9)', nivel: 'morador' },

  { path: '/portaria',           label: 'Portaria',  Icon: Shield,        gradient: 'linear-gradient(145deg,#0c4a6e,#06b6d4)', nivel: 'gestor' },
  { path: '/unidades',           label: 'Chácaras',  Icon: Home,          gradient: 'linear-gradient(145deg,#374151,#9ca3af)', nivel: 'gestor' },
  { path: '/moradores',          label: 'Moradores', Icon: Users,         gradient: 'linear-gradient(145deg,#5b21b6,#c084fc)', nivel: 'gestor' },
  { path: '/usuarios',           label: 'Usuários',  Icon: ShieldCheck,   gradient: 'linear-gradient(145deg,#155e75,#22d3ee)', nivel: 'gestor' },
  { path: '/acessos',            label: 'Acessos',   Icon: Lock,          gradient: 'linear-gradient(145deg,#1e40af,#60a5fa)', nivel: 'gestor' },
  { path: '/analise-cenarios',   label: 'Cenários',  Icon: TrendingUp,    gradient: 'linear-gradient(145deg,#064e3b,#34d399)', nivel: 'gestor' },
  { path: '/checklist-servicos', label: 'Checklist', Icon: ClipboardList, gradient: 'linear-gradient(145deg,#78350f,#fcd34d)', nivel: 'gestor' },
  { path: '/gestao-financeira',  label: 'Financeiro',      Icon: DollarSign,  gradient: 'linear-gradient(145deg,#7f1d1d,#f87171)', nivel: 'gestor' },
  { path: '/analise-acesso',     label: 'Análise Acesso',  Icon: Activity,    gradient: 'linear-gradient(145deg,#0f766e,#14b8a6)', nivel: 'gestor' },
];

const SECTION_META: Record<Nivel, { label: string; color: string; desc: string }> = {
  visitante: { label: 'Comunidade',      color: '#34d399', desc: 'Acesso público' },
  morador:   { label: 'Área do Morador', color: '#60a5fa', desc: 'Serviços exclusivos' },
  gestor:    { label: 'Gestão',          color: '#f87171', desc: 'Painel administrativo' },
};

const HEADER_H = 60;

interface Burst {
  top: number; left: number; w: number; h: number;
  tx: string; ty: string; sx: string; sy: string;
  gradient: string;
}

export const AppMenu = () => {
  const { isGestor, user } = useAuth();
  const navigate = useNavigate();
  const [burst, setBurst] = useState<Burst | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [encPendentes, setEncPendentes] = useState(0);
  const encChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isGestor || !user?.unit_number) return;
    const chacara = String(user.unit_number).padStart(3, '0');

    // Carga inicial
    countEncomendasPendentes(chacara).then(setEncPendentes).catch(() => {});

    // Realtime: badge sobe quando chega encomenda, desce quando porteiro confirma retirada
    encChannelRef.current = supabase
      .channel(`menu-enc-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'portaria_encomendas',
        filter: `chacara_numero=eq.${chacara}`,
      }, () => setEncPendentes(prev => prev + 1))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'portaria_encomendas',
        filter: `chacara_numero=eq.${chacara}`,
      }, payload => {
        const upd = payload.new as { status: string };
        const old = payload.old as { status: string };
        if (upd.status === 'retirada' && old.status !== 'retirada') {
          setEncPendentes(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => { encChannelRef.current?.unsubscribe(); };
  }, [isGestor, user]);

  const handleClick = useCallback((app: AppIcon, e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r  = el.getBoundingClientRect();
    const tw = window.innerWidth, th = window.innerHeight - HEADER_H;
    setBurst({
      top: r.top, left: r.left, w: r.width, h: r.height,
      tx: `${tw / 2 - (r.left + r.width  / 2)}px`,
      ty: `${HEADER_H + th / 2 - (r.top  + r.height / 2)}px`,
      sx: `${tw / r.width}`,
      sy: `${th / r.height}`,
      gradient: app.gradient,
    });
    setTimeout(() => { setBurst(null); navigate(app.path, { replace: false }); }, 360);
  }, [navigate]);

  const appsComBadge = APPS.map(a =>
    a.path === '/acesso-visitas?enc=1' && encPendentes > 0 ? { ...a, badge: encPendentes } : a
  );
  const visitante = appsComBadge.filter(a => a.nivel === 'visitante');
  const morador   = appsComBadge.filter(a => a.nivel === 'morador');
  const gestor    = appsComBadge.filter(a => a.nivel === 'gestor');

  return (
    <>
      {burst && (
        <div className="menu-burst" style={{
          top: burst.top, left: burst.left, width: burst.w, height: burst.h,
          background: burst.gradient,
          ['--tx' as string]: burst.tx, ['--ty' as string]: burst.ty,
          ['--sx' as string]: burst.sx, ['--sy' as string]: burst.sy,
        }} />
      )}

      <div className="menu-scroll">
        <div className="menu-inner">
          <Section nivel="visitante" apps={visitante} onClickApp={handleClick} pressed={pressed} setPressed={setPressed} />
          <Section nivel="morador"   apps={morador}   onClickApp={handleClick} pressed={pressed} setPressed={setPressed} />
          {isGestor && (
            <Section nivel="gestor" apps={gestor} onClickApp={handleClick} pressed={pressed} setPressed={setPressed} />
          )}
          {/* Minha Conta */}
          <div className="menu-section">
            <SectionHeader nivel="morador" label="Minha Conta" desc="Configurações pessoais" />
            <div className="menu-grid">
              <AppIconBtn
                app={{ path: '/perfil', label: 'Perfil', Icon: User, gradient: 'linear-gradient(145deg,#1e3a5f,#57d8ff)', nivel: 'morador' }}
                onClickApp={handleClick} pressed={pressed} setPressed={setPressed}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Section = ({ nivel, apps, onClickApp, pressed, setPressed }: {
  nivel: Nivel; apps: AppIcon[];
  onClickApp: (app: AppIcon, e: React.MouseEvent) => void;
  pressed: string | null; setPressed: (p: string | null) => void;
}) => (
  <div className="menu-section">
    <SectionHeader nivel={nivel} label={SECTION_META[nivel].label} desc={SECTION_META[nivel].desc} />
    <div className="menu-grid">
      {apps.map(app => (
        <AppIconBtn key={app.path} app={app} onClickApp={onClickApp} pressed={pressed} setPressed={setPressed} />
      ))}
    </div>
  </div>
);

const SectionHeader = ({ nivel, label, desc }: { nivel: Nivel; label: string; desc: string }) => {
  const { color } = SECTION_META[nivel];
  return (
    <div className="menu-section-head">
      <span className="menu-section-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <div className="menu-section-text">
        <span className="menu-section-label" style={{ color }}>{label}</span>
        <span className="menu-section-desc">{desc}</span>
      </div>
      <span className="menu-section-line" style={{ background: `linear-gradient(90deg,${color}40,transparent)` }} />
    </div>
  );
};

const AppIconBtn = ({ app, onClickApp, pressed, setPressed }: {
  app: AppIcon;
  onClickApp: (app: AppIcon, e: React.MouseEvent) => void;
  pressed: string | null; setPressed: (p: string | null) => void;
}) => {
  const isPressed = pressed === app.path;
  return (
    <button
      className={`menu-icon-btn${isPressed ? ' pressed' : ''}`}
      onClick={e => onClickApp(app, e)}
      onMouseDown={() => setPressed(app.path)}
      onMouseUp={() => setPressed(null)}
      onMouseLeave={() => setPressed(null)}
      onTouchStart={() => setPressed(app.path)}
      onTouchEnd={() => setPressed(null)}
    >
      <div className="menu-icon-frame" style={{ background: app.gradient, position: 'relative' }}>
        <div className="menu-icon-gloss" />
        <div className="menu-icon-inner">
          <app.Icon className="menu-icon-svg" />
        </div>
        {app.badge && app.badge > 0 ? (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#ef4444', color: '#fff',
            fontSize: '0.6rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid #07101c',
            lineHeight: 1,
          }}>{app.badge > 9 ? '9+' : app.badge}</span>
        ) : null}
      </div>
      <span className="menu-icon-label">{app.label}</span>
    </button>
  );
};
