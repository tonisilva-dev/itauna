import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Shield, Bell, Calendar, AlertCircle, Image,
  FileText, Tag, Search, Building2, TreePine, Home, Users,
  ShieldCheck, Lock, Phone, Leaf, TrendingUp, ClipboardList,
  Eye, User, Package, Activity, DoorOpen, HardHat,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { countEncomendasPendentes } from '@/lib/supabase-queries';
import './AppMenu.css';

/* ──────────────────────────────────────────────────────────────
   Organização por AFINIDADE FUNCIONAL + prioridade de dor do usuário.
   Os 4 ícones `featured` resolvem as dores documentadas
   (comunicação, acompanhamento, transparência, praticidade).
   ────────────────────────────────────────────────────────────── */

type Grupo =
  | 'essenciais' | 'comunidade'              // todos os condôminos
  | 'operacao' | 'pessoas' | 'estrategia'    // exclusivos do gestor
  | 'conta';                                 // todos

interface AppIcon {
  path: string;
  label: string;
  Icon: React.ElementType;
  gradient: string;
  grupo: Grupo;
  featured?: boolean;
  badge?: number;
}

const APPS: AppIcon[] = [
  /* ── MEU DIA A DIA — o essencial, ordenado por dor do usuário ── */
  { path: '/comunicados',        label: 'Comunicados',      Icon: Bell,         gradient: 'linear-gradient(145deg,#92400e,#f59e0b)', grupo: 'essenciais', featured: true },
  { path: '/ocorrencias',        label: 'Ocorrências',      Icon: AlertCircle,  gradient: 'linear-gradient(145deg,#991b1b,#ef4444)', grupo: 'essenciais', featured: true },
  { path: '/acesso-visitas',     label: 'Acesso & Visitas', Icon: Shield,       gradient: 'linear-gradient(145deg,#164e63,#06b6d4)', grupo: 'essenciais', featured: true },
  { path: '/acesso-visitas?enc=1', label: 'Encomendas',     Icon: Package,      gradient: 'linear-gradient(145deg,#78350f,#f59e0b)', grupo: 'essenciais', featured: true },
  { path: '/agendamentos',       label: 'Reservas',         Icon: Calendar,     gradient: 'linear-gradient(145deg,#1e3a8a,#3b82f6)', grupo: 'essenciais' },
  { path: '/financeiro',         label: 'Transparência',    Icon: Eye,          gradient: 'linear-gradient(145deg,#065f46,#10b981)', grupo: 'essenciais' },
  { path: '/benfeitorias',       label: 'Benfeitorias',     Icon: HardHat,      gradient: 'linear-gradient(145deg,#9a3412,#f97316)', grupo: 'essenciais' },

  /* ── COMUNIDADE & SERVIÇOS — convívio, informação e apoio ── */
  { path: '/documentos',         label: 'Documentos',       Icon: FileText,     gradient: 'linear-gradient(145deg,#312e81,#6366f1)', grupo: 'comunidade' },
  { path: '/parceiros',          label: 'Parceiros',        Icon: Building2,    gradient: 'linear-gradient(145deg,#0c4a6e,#0ea5e9)', grupo: 'comunidade' },
  { path: '/galeria',            label: 'Galeria',          Icon: Image,        gradient: 'linear-gradient(145deg,#7c3aed,#a78bfa)', grupo: 'comunidade' },
  { path: '/eventos',            label: 'Eventos',          Icon: TreePine,     gradient: 'linear-gradient(145deg,#047857,#34d399)', grupo: 'comunidade' },
  { path: '/classificados',      label: 'Classificados',    Icon: Tag,          gradient: 'linear-gradient(145deg,#b45309,#fbbf24)', grupo: 'comunidade' },
  { path: '/achados-perdidos',   label: 'Achados',          Icon: Search,       gradient: 'linear-gradient(145deg,#14532d,#22c55e)', grupo: 'comunidade' },
  { path: '/telefones-uteis',    label: 'Telefones',        Icon: Phone,        gradient: 'linear-gradient(145deg,#c2410c,#fb923c)', grupo: 'comunidade' },
  { path: '/responsabilidade-social', label: 'Resp. Social', Icon: Leaf,        gradient: 'linear-gradient(145deg,#166534,#4ade80)', grupo: 'comunidade' },

  /* ── OPERAÇÃO — linha de frente do gestor/porteiro ── */
  { path: '/portaria',           label: 'Portaria',         Icon: DoorOpen,     gradient: 'linear-gradient(145deg,#0c4a6e,#06b6d4)', grupo: 'operacao', featured: true },
  { path: '/analise-acesso',     label: 'Análise Acesso',   Icon: Activity,     gradient: 'linear-gradient(145deg,#0f766e,#14b8a6)', grupo: 'operacao' },
  { path: '/checklist-servicos', label: 'Checklist',        Icon: ClipboardList, gradient: 'linear-gradient(145deg,#78350f,#fcd34d)', grupo: 'operacao' },

  /* ── PESSOAS & UNIDADES — cadastros e controle de acesso ── */
  { path: '/moradores',          label: 'Moradores',        Icon: Users,        gradient: 'linear-gradient(145deg,#5b21b6,#c084fc)', grupo: 'pessoas' },
  { path: '/unidades',           label: 'Chácaras',         Icon: Home,         gradient: 'linear-gradient(145deg,#374151,#9ca3af)', grupo: 'pessoas' },
  { path: '/usuarios',           label: 'Usuários',         Icon: ShieldCheck,  gradient: 'linear-gradient(145deg,#155e75,#22d3ee)', grupo: 'pessoas' },
  { path: '/acessos',            label: 'Permissões',       Icon: Lock,         gradient: 'linear-gradient(145deg,#1e40af,#60a5fa)', grupo: 'pessoas' },

  /* ── INTELIGÊNCIA & FINANÇAS — decisão estratégica ── */
  { path: '/gestao-financeira',  label: 'Financeiro',       Icon: DollarSign,   gradient: 'linear-gradient(145deg,#7f1d1d,#f87171)', grupo: 'estrategia', featured: true },
  { path: '/analise-cenarios',   label: 'Cenários',         Icon: TrendingUp,   gradient: 'linear-gradient(145deg,#064e3b,#34d399)', grupo: 'estrategia' },

  /* ── MINHA CONTA ── */
  { path: '/perfil',             label: 'Perfil',           Icon: User,         gradient: 'linear-gradient(145deg,#1e3a5f,#57d8ff)', grupo: 'conta' },
];

interface GrupoMeta { label: string; color: string; desc: string; gestorOnly?: boolean; }

const GRUPO_META: Record<Grupo, GrupoMeta> = {
  essenciais: { label: 'Meu Dia a Dia',          color: '#57d8ff', desc: 'O essencial, sempre à mão' },
  comunidade: { label: 'Comunidade & Serviços',  color: '#34d399', desc: 'Convívio, informação e apoio' },
  operacao:   { label: 'Operação',               color: '#22d3ee', desc: 'Linha de frente da gestão', gestorOnly: true },
  pessoas:    { label: 'Pessoas & Unidades',     color: '#c084fc', desc: 'Cadastros e permissões',    gestorOnly: true },
  estrategia: { label: 'Inteligência & Finanças', color: '#f87171', desc: 'Decisão e análise',        gestorOnly: true },
  conta:      { label: 'Minha Conta',            color: '#60a5fa', desc: 'Configurações pessoais' },
};

/* Ordem de renderização das seções */
const ORDEM_GRUPOS: Grupo[] = ['essenciais', 'comunidade', 'operacao', 'pessoas', 'estrategia', 'conta'];

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

  /* Injeta badge de encomendas pendentes no ícone correspondente */
  const appsComBadge = APPS.map(a =>
    a.path === '/acesso-visitas?enc=1' && encPendentes > 0 ? { ...a, badge: encPendentes } : a
  );

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
          {ORDEM_GRUPOS.map(grupo => {
            const meta = GRUPO_META[grupo];
            if (meta.gestorOnly && !isGestor) return null;
            const apps = appsComBadge.filter(a => a.grupo === grupo);
            if (apps.length === 0) return null;
            return (
              <Section
                key={grupo}
                meta={meta}
                apps={apps}
                onClickApp={handleClick}
                pressed={pressed}
                setPressed={setPressed}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

const Section = ({ meta, apps, onClickApp, pressed, setPressed }: {
  meta: GrupoMeta; apps: AppIcon[];
  onClickApp: (app: AppIcon, e: React.MouseEvent) => void;
  pressed: string | null; setPressed: (p: string | null) => void;
}) => (
  <div className="menu-section">
    <SectionHeader meta={meta} />
    <div className="menu-grid">
      {apps.map(app => (
        <AppIconBtn key={app.path} app={app} onClickApp={onClickApp} pressed={pressed} setPressed={setPressed} />
      ))}
    </div>
  </div>
);

const SectionHeader = ({ meta }: { meta: GrupoMeta }) => (
  <div className="menu-section-head">
    <span className="menu-section-dot" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
    <div className="menu-section-text">
      <span className="menu-section-label" style={{ color: meta.color }}>{meta.label}</span>
      <span className="menu-section-desc">{meta.desc}</span>
    </div>
    <span className="menu-section-line" style={{ background: `linear-gradient(90deg,${meta.color}40,transparent)` }} />
  </div>
);

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
      <div className={`menu-icon-frame${app.featured ? ' featured' : ''}`} style={{ background: app.gradient, position: 'relative' }}>
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
            lineHeight: 1, zIndex: 3,
          }}>{app.badge > 9 ? '9+' : app.badge}</span>
        ) : null}
      </div>
      <span className="menu-icon-label">{app.label}</span>
    </button>
  );
};
