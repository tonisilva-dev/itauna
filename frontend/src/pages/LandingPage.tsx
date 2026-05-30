import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, ChevronRight, Bell, Shield, Calendar, Tag,
  MapPin, Mail, Phone, DollarSign, Image, FileText,
  Home, Users, AlertCircle, Search, Building2, Fingerprint,
  Star, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { PageCarousel3D, type SlideItem } from '../components/ui/PageCarousel3D';

const BG_IMAGES = ['/bg-area-livre-1.webp', '/bg-area-livre-2.webp'];
const BG_INTERVAL_MS = 300_000;

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const BLUE   = '#5a84ff';
const YELLOW = '#f59e0b';
const PURPLE = '#8b5cf6';
const RED    = '#ef4444';

const gradStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #72e3ff, #669dff)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
};

/* ── Navbar fixa ── */
const Navbar = () => (
  <nav style={{
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 'clamp(12px,3vw,18px) clamp(16px,4vw,28px)',
    pointerEvents: 'none',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
      <div style={{
        width: 'clamp(32px,7vw,40px)', height: 'clamp(32px,7vw,40px)',
        borderRadius: '11px', background: 'linear-gradient(135deg,#72e3ff,#669dff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 0 20px rgba(87,216,255,0.40)',
      }}>
        <TreePine size={18} color="#07101c" />
      </div>
      <div>
        <p style={{ fontWeight: 800, fontSize: 'clamp(13px,3vw,15px)', color: '#fff', lineHeight: 1 }}>Itaúna</p>
        <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>Chácaras · Ibiporã–PR</p>
      </div>
    </div>

    <Link to="/login" style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: 'clamp(8px,2vw,11px) clamp(14px,3.5vw,22px)',
      borderRadius: '11px',
      background: 'rgba(10,18,36,0.65)', border: '1px solid rgba(87,216,255,0.28)',
      color: CYAN, fontWeight: 700, fontSize: 'clamp(12px,2.5vw,14px)',
      textDecoration: 'none', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)', whiteSpace: 'nowrap', pointerEvents: 'auto',
    }}>
      Área Restrita <ChevronRight size={14} strokeWidth={2.5} />
    </Link>
  </nav>
);

/* ── Shell dos slides ── */
const Shell = ({ children, badges }: { children: React.ReactNode; badges?: { icon: string; label: string }[] }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: 'clamp(16px,4vw,28px) clamp(16px,4vw,28px) clamp(12px,3vw,20px)',
      display: 'flex', flexDirection: 'column', gap: 'clamp(10px,2.5vw,16px)',
      scrollbarWidth: 'none',
    }}>
      {children}
    </div>
    {badges && (
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${badges.length},minmax(0,1fr))`,
        gap: '1px', background: 'rgba(255,255,255,0.04)',
        borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
      }}>
        {badges.map((b, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.018)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px', padding: 'clamp(8px,2vw,12px) 4px',
            fontSize: 'clamp(10px,2.2vw,12px)', fontWeight: 500, color: '#e7f0fe',
            textAlign: 'center', minHeight: '44px',
          }}>
            <span>{b.icon}</span><span>{b.label}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════ */
export const LandingPage = () => {
  const [bgIdx, setBgIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      cycleRef.current = setTimeout(() => {
        setFadeIn(false);
        fadeRef.current = setTimeout(() => {
          setBgIdx(i => (i + 1) % BG_IMAGES.length);
          setFadeIn(true);
          schedule();
        }, 900);
      }, BG_INTERVAL_MS);
    };
    schedule();
    return () => {
      if (cycleRef.current) clearTimeout(cycleRef.current);
      if (fadeRef.current)  clearTimeout(fadeRef.current);
    };
  }, []);

  const slides: SlideItem[] = [

    /* ── SLIDE 1: Hero ── */
    {
      key: 'slide-hero',
      label: 'Início',
      content: (
        <Shell badges={[
          { icon: '🌿', label: 'Natureza Preservada' },
          { icon: '🔒', label: 'Segurança 24h' },
          { icon: '📱', label: '100% Digital' },
        ]}>
          {/* Eyebrow */}
          <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN }}>
            Condomínio Chácaras Itaúna · Ibiporã – PR
          </p>

          {/* Headline */}
          <div>
            <h1 style={{ fontSize: 'clamp(22px,5.5vw,38px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.06, color: '#fff', marginBottom: 10 }}>
              Encanto para quem visita,<br />
              <span style={gradStyle}>pertencimento para quem vive.</span>
            </h1>
            <p style={{ fontSize: 'clamp(11px,2.5vw,13px)', color: 'rgba(255,255,255,0.58)', lineHeight: 1.65 }}>
              360 chácaras com natureza preservada, segurança 24h e plataforma digital integrada — o campo com a comodidade que sua família merece.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'clamp(6px,1.5vw,10px)' }}>
            {[
              { v: '360',  l: 'Chácaras',    color: CYAN   },
              { v: '20+',  l: 'Módulos App', color: GREEN  },
              { v: '24h',  l: 'Segurança',   color: BLUE   },
            ].map(s => (
              <div key={s.l} style={{ ...card, padding: 'clamp(10px,2.5vw,16px) clamp(6px,1.5vw,10px)', textAlign: 'center' }}>
                <p style={{ fontSize: 'clamp(18px,4.5vw,28px)', fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</p>
                <p style={{ fontSize: 'clamp(8px,1.8vw,10px)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 5 }}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 'clamp(12px,3vw,15px)', borderRadius: '13px',
              background: 'linear-gradient(135deg,#72e3ff,#669dff)', color: '#07101c',
              fontWeight: 800, fontSize: 'clamp(13px,3vw,15px)', textDecoration: 'none',
              boxShadow: '0 8px 28px rgba(76,164,255,0.3)',
            }}>
              Acessar o Portal do Condômino <ChevronRight size={15} />
            </Link>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {[
                { to: '/galeria',      label: '📸 Ver Galeria'      },
                { to: '/classificados', label: '🏡 Classificados'   },
              ].map(b => (
                <Link key={b.to} to={b.to} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: 'clamp(9px,2.5vw,12px)', borderRadius: '11px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.75)', fontWeight: 600,
                  fontSize: 'clamp(11px,2.5vw,13px)', textDecoration: 'none',
                }}>{b.label}</Link>
              ))}
            </div>
          </div>
        </Shell>
      ),
    },

    /* ── SLIDE 2: Ecossistema Digital ── */
    {
      key: 'slide-plataforma',
      label: 'Plataforma',
      content: (
        <Shell badges={[
          { icon: '⚡', label: 'Praticidade' },
          { icon: '🔐', label: 'LGPD Nativa' },
          { icon: '📊', label: 'Transparência Total' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              Tecnologia & Serviços Integrados
            </p>
            <h2 style={{ fontSize: 'clamp(20px,5vw,34px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 8 }}>
              Tudo na <span style={gradStyle}>palma da mão</span>
            </h2>
            <p style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>
              Uma plataforma com 20+ módulos funcionais — financeiro, portaria, comunicados, agendamentos e muito mais, todos integrados.
            </p>
          </div>

          {/* Grid de módulos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'clamp(5px,1.2vw,8px)' }}>
            {[
              { Icon: DollarSign, title: 'Financeiro',   desc: 'Rateios e prestação de contas',  color: GREEN  },
              { Icon: Shield,     title: 'Portaria',     desc: 'Registro digital de acessos',    color: CYAN   },
              { Icon: Bell,       title: 'Comunicados',  desc: 'Avisos com prioridade visual',   color: YELLOW },
              { Icon: Calendar,   title: 'Agendamentos', desc: 'Reserva de áreas comuns',        color: BLUE   },
              { Icon: AlertCircle,title: 'Ocorrências',  desc: 'Chamados com workflow completo', color: RED    },
              { Icon: Image,      title: 'Galeria',      desc: 'Fotos do condomínio',            color: PURPLE },
              { Icon: FileText,   title: 'Documentos',   desc: 'Atas, rateios e regulamento',    color: CYAN   },
              { Icon: Tag,        title: 'Classificados',desc: 'Mural entre moradores',          color: YELLOW },
              { Icon: Search,     title: 'Achados',      desc: 'Perdidos e encontrados',         color: GREEN  },
            ].map(f => (
              <div key={f.title} style={{
                ...card, padding: 'clamp(8px,2vw,12px) clamp(6px,1.5vw,10px)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${f.color}18`, border: `1px solid ${f.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <f.Icon size={13} style={{ color: f.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 700, color: '#fff', marginBottom: 2, lineHeight: 1.2 }}>{f.title}</p>
                  <p style={{ fontSize: 'clamp(8px,1.8vw,9.5px)', color: 'rgba(255,255,255,0.38)', lineHeight: 1.35 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Destaque biometria */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 'clamp(10px,2.5vw,14px) clamp(12px,3vw,16px)',
            borderRadius: 13, background: `${CYAN}08`, border: `1px solid ${CYAN}22`,
          }}>
            <Fingerprint size={20} style={{ color: CYAN, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 'clamp(11px,2.5vw,12px)', fontWeight: 700, color: '#fff', marginBottom: 2 }}>Login por Digital / Face ID</p>
              <p style={{ fontSize: 'clamp(9px,2vw,10px)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                Biometria WebAuthn/FIDO2 — a biometria fica no dispositivo, nunca em servidor. Padrão bancário aplicado à gestão condominial.
              </p>
            </div>
          </div>
        </Shell>
      ),
    },

    /* ── SLIDE 3: Por que Itaúna ── */
    {
      key: 'slide-diferenciais',
      label: 'Por que Itaúna',
      content: (
        <Shell badges={[
          { icon: '📍', label: 'Ibiporã – PR' },
          { icon: '✉️', label: 'contato@itauna.org' },
          { icon: '📞', label: 'Portaria 24h' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              Diferenciais · Por que Itaúna
            </p>
            <h2 style={{ fontSize: 'clamp(20px,5vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 8 }}>
              Mais que um condomínio.<br /><span style={gradStyle}>Um ecossistema de vida.</span>
            </h2>
          </div>

          {/* Diferenciais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px,1.5vw,9px)' }}>
            {[
              {
                icon: '🌿', color: GREEN, title: 'Natureza Preservada',
                desc: 'Lagos naturais, área de preservação ambiental, fauna local e vias arborizadas — um refúgio ecológico a minutos de Londrina.',
              },
              {
                icon: '📱', color: CYAN, title: 'Gestão 100% Digital',
                desc: 'Zero planilha, zero WhatsApp desordenado. Finanças, portaria, comunicados e muito mais em uma plataforma com biometria e transparência total.',
              },
              {
                icon: '🏘️', color: BLUE, title: 'Comunidade Ativa',
                desc: 'Eventos sociais, classificados internos, parceiros comerciais e galeria de fotos — moradores conectados e engajados.',
              },
              {
                icon: '📈', color: YELLOW, title: 'Valorização Imobiliária',
                desc: 'Condomínio digitalizado é percebido como mais moderno e bem administrado — valor percebido das chácaras aumenta com cada melhoria.',
              },
            ].map(d => (
              <div key={d.title} style={{
                ...card, padding: 'clamp(10px,2.5vw,14px)', display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 'clamp(16px,3.5vw,20px)', flexShrink: 0, marginTop: 1 }}>{d.icon}</span>
                <div>
                  <p style={{ fontSize: 'clamp(11px,2.5vw,13px)', fontWeight: 700, color: '#fff', marginBottom: 3 }}>{d.title}</p>
                  <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: 'rgba(255,255,255,0.48)', lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
            <span style={{ fontSize: 'clamp(9px,2vw,10px)', color: 'rgba(255,255,255,0.28)' }}>© {new Date().getFullYear()} Chácaras Itaúna</span>
            <Link to="/privacidade" style={{ fontSize: 'clamp(9px,2vw,10px)', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>Privacidade</Link>
          </div>
        </Shell>
      ),
    },
  ];

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: `url(${BG_IMAGES[bgIdx]})`, opacity: fadeIn ? 1 : 0, filter: 'brightness(0.38) saturate(0.8)' }} />
      <div className="fixed inset-0 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(8,13,24,.55) 0%,rgba(8,13,24,.78) 55%,rgba(8,13,24,.96) 100%)' }} />

      <Navbar />

      <div className="relative z-10 w-full h-screen overflow-hidden">
        <PageCarousel3D slides={slides} />
      </div>
    </>
  );
};
