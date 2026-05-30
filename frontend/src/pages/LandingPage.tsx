import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, ChevronRight, Bell, Shield, Calendar, Tag,
  MapPin, Mail, Phone, DollarSign, Image, FileText,
  Home, Users, AlertCircle, Search, Building2, Fingerprint,
  Star, CheckCircle2, ArrowRight, Sun, Droplets, Leaf,
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
      flex: 1, overflowY: 'auto', minHeight: 0,
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
          <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN }}>
            Condomínio Chácaras Itaúna · Ibiporã – PR
          </p>

          <div>
            <h1 style={{ fontSize: 'clamp(22px,5.5vw,38px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.06, color: '#fff', marginBottom: 10 }}>
              Encanto para quem visita,<br />
              <span style={gradStyle}>pertencimento para quem vive.</span>
            </h1>
            <p style={{ fontSize: 'clamp(11px,2.5vw,13px)', color: 'rgba(255,255,255,0.58)', lineHeight: 1.65 }}>
              360 chácaras em 3,8 km² de natureza preservada, a 10 minutos de Londrina e a distância de tudo o que importa. Aqui, o campo não é um compromisso — é um privilégio.
            </p>
          </div>

          {/* Stats com dados reais do estudo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'clamp(6px,1.5vw,10px)' }}>
            {[
              { v: '3,8',  l: 'km² de área',  color: GREEN  },
              { v: '20+',  l: 'anos de história', color: CYAN  },
              { v: '24h',  l: 'portaria ativa',   color: BLUE   },
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
                { to: '/galeria',       label: '📸 Ver Galeria'    },
                { to: '/classificados', label: '🏡 Classificados'  },
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

    /* ── SLIDE 2: Plataforma Digital ── */
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 'clamp(5px,1.2vw,8px)' }}>
            {[
              { Icon: DollarSign,  title: 'Financeiro',   desc: 'Rateios e prestação de contas',  color: GREEN  },
              { Icon: Shield,      title: 'Portaria',     desc: 'Registro digital de acessos',    color: CYAN   },
              { Icon: Bell,        title: 'Comunicados',  desc: 'Avisos com prioridade visual',   color: YELLOW },
              { Icon: Calendar,    title: 'Agendamentos', desc: 'Reserva de áreas comuns',        color: BLUE   },
              { Icon: AlertCircle, title: 'Ocorrências',  desc: 'Chamados com workflow completo', color: RED    },
              { Icon: Image,       title: 'Galeria',      desc: 'Fotos do condomínio',            color: PURPLE },
              { Icon: FileText,    title: 'Documentos',   desc: 'Atas, rateios e regulamento',    color: CYAN   },
              { Icon: Tag,         title: 'Classificados',desc: 'Mural entre moradores',          color: YELLOW },
              { Icon: Search,      title: 'Achados',      desc: 'Perdidos e encontrados',         color: GREEN  },
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

    /* ── SLIDE 3: O Lugar (encantamento Disney) ── */
    {
      key: 'slide-lugar',
      label: 'O Lugar',
      content: (
        <Shell badges={[
          { icon: '🌳', label: 'Decreto nº 320/2005' },
          { icon: '📜', label: 'Escrituras regularizadas' },
          { icon: '☀️', label: 'Energia fotovoltaica' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              O que faz Itaúna ser Itaúna
            </p>
            <h2 style={{ fontSize: 'clamp(19px,4.8vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 6 }}>
              Mais que um endereço.<br /><span style={gradStyle}>Um mundo à parte.</span>
            </h2>
            <p style={{ fontSize: 'clamp(10px,2.2vw,12px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 2 }}>
              Imagine acordar sem pressa, percorrer ruas de pedra entre espécies arbóreas centenárias e chegar em Londrina em dez minutos quando quiser. Isso não é um sonho — é o cotidiano de quem escolheu Itaúna.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px,1.5vw,8px)' }}>
            {[
              {
                emoji: '🗺️', color: CYAN,
                title: 'Entre Londrina e a eternidade',
                desc: 'A 10 minutos da UTFPR e do Parque Tauá via Estrada do Limoeiro. Você tem acesso à cidade quando precisa — e silêncio quando merece.',
              },
              {
                emoji: '📜', color: GREEN,
                title: 'Sua chácara, definitivamente sua',
                desc: 'Documentação 100% regularizada desde 2005. Escritura pública autônoma, matrícula individualizada, apta a financiamento bancário. Zero pendências. Zero riscos.',
              },
              {
                emoji: '🪨', color: YELLOW,
                title: 'A pedra que preserva o lago',
                desc: 'Nossas vias em paralelepípedo não são limitação — são escolha técnica. Água de chuva absorvida pelo solo, lago central protegido, microclima fresco preservado.',
              },
              {
                emoji: '☀️', color: PURPLE,
                title: 'A luz que vem do sol',
                desc: 'Iluminação das ruas por energia fotovoltaica autônoma. Sustentabilidade real, não retórica — e uma taxa condominial menor para quem mora aqui.',
              },
            ].map(d => (
              <div key={d.title} style={{
                ...card, padding: 'clamp(9px,2.2vw,13px)', display: 'flex', gap: 11, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 'clamp(15px,3.2vw,19px)', flexShrink: 0, marginTop: 1 }}>{d.emoji}</span>
                <div>
                  <p style={{ fontSize: 'clamp(10px,2.3vw,12px)', fontWeight: 700, color: '#fff', marginBottom: 3 }}>{d.title}</p>
                  <p style={{ fontSize: 'clamp(9px,1.9vw,10.5px)', color: 'rgba(255,255,255,0.48)', lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
            <span style={{ fontSize: 'clamp(9px,2vw,10px)', color: 'rgba(255,255,255,0.28)' }}>© {new Date().getFullYear()} Chácaras Itaúna</span>
            <Link to="/privacidade" style={{ fontSize: 'clamp(9px,2vw,10px)', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>Privacidade</Link>
          </div>
        </Shell>
      ),
    },

    /* ── SLIDE 4: Quem Somos (encantamento Disney) ── */
    {
      key: 'slide-quem-somos',
      label: 'Quem Somos',
      content: (
        <Shell badges={[
          { icon: '📍', label: 'Ibiporã – PR' },
          { icon: '✉️', label: 'contato@itauna.org' },
          { icon: '📞', label: 'Portaria 24h' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              Nossa História
            </p>
            <h2 style={{ fontSize: 'clamp(19px,4.8vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 10 }}>
              Um refúgio que nasceu<br /><span style={gradStyle}>com propósito.</span>
            </h2>
          </div>

          {/* Narrativa Disney */}
          <div style={{ ...card, padding: 'clamp(12px,3vw,18px)', lineHeight: 1.7 }}>
            <p style={{ fontSize: 'clamp(10px,2.2vw,12px)', color: 'rgba(255,255,255,0.65)', marginBottom: 10 }}>
              Em 2005, quando a maioria das famílias buscava apenas um lote fora da cidade, os fundadores do Itaúna enxergaram algo diferente: um <strong style={{ color: '#fff' }}>ecossistema de vida</strong>. Foram criadas 360 chácaras em 3,8 km² de território, cada uma com espaço para uma história própria.
            </p>
            <p style={{ fontSize: 'clamp(10px,2.2vw,12px)', color: 'rgba(255,255,255,0.55)' }}>
              Hoje, duas décadas depois, o Itaúna é o maior condomínio periurbano de alto padrão do norte do Paraná — e o único da região com <strong style={{ color: 'rgba(255,255,255,0.8)' }}>documentação 100% regularizada</strong>, iluminação solar e plataforma digital integrada para todos os moradores.
            </p>
          </div>

          {/* Pilares em grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 'clamp(6px,1.5vw,9px)' }}>
            {[
              { icon: Leaf,     color: GREEN,  title: 'Natureza viva',     desc: 'Lagos, mata nativa, garças e fauna local em cada amanhecer.' },
              { icon: Shield,   color: BLUE,   title: 'Segurança real',    desc: 'Portaria 24h, portão eletrônico e acesso controlado.' },
              { icon: Sun,      color: YELLOW, title: 'Energia limpa',     desc: 'Vias iluminadas por painéis fotovoltaicos próprios.' },
              { icon: Droplets, color: CYAN,   title: 'Água de qualidade', desc: 'Poços artesianos profundos geridos pelo SAMAE de Ibiporã.' },
            ].map(p => (
              <div key={p.title} style={{ ...card, padding: 'clamp(9px,2.2vw,13px)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
                  background: `${p.color}15`, border: `1px solid ${p.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <p.icon size={13} style={{ color: p.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 'clamp(10px,2.2vw,11.5px)', fontWeight: 700, color: '#fff', marginBottom: 2 }}>{p.title}</p>
                  <p style={{ fontSize: 'clamp(8.5px,1.8vw,10px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.45 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA final */}
          <Link to="/login" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 'clamp(11px,2.8vw,14px)', borderRadius: '12px',
            background: 'rgba(87,216,255,0.08)', border: '1px solid rgba(87,216,255,0.22)',
            color: CYAN, fontWeight: 700, fontSize: 'clamp(12px,2.5vw,13px)', textDecoration: 'none',
          }}>
            Sou condômino — entrar no portal <ArrowRight size={14} />
          </Link>
        </Shell>
      ),
    },

    /* ── SLIDE 5: Breve Histórico (origem do nome + geologia) ── */
    {
      key: 'slide-historia',
      label: 'Breve Histórico',
      content: (
        <Shell badges={[
          { icon: '🪨', label: 'Decreto 320/2005' },
          { icon: '🌋', label: 'Basalto vulcânico' },
          { icon: '📜', label: '20 anos de história' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              A Origem do Nome
            </p>
            <h2 style={{ fontSize: 'clamp(19px,4.8vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 8 }}>
              Itaúna:<br/><span style={gradStyle}>Pedra negra, raízes profundas.</span>
            </h2>
          </div>

          {/* Narrativa da origem */}
          <div style={{ ...card, padding: 'clamp(11px,2.8vw,15px)' }}>
            <p style={{ fontSize: 'clamp(10px,2.1vw,11.5px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 8 }}>
              O nome <strong style={{ color: '#fff' }}>Itaúna</strong> vem do <strong style={{ color: CYAN }}>tupi-guarani</strong>: <em>itá</em> (pedra) + <em>úna</em> (negra). Assim, literalmente, <strong>pedra negra</strong>.
            </p>
            <p style={{ fontSize: 'clamp(10px,2.1vw,11.5px)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
              Mas este não é um nome escolhido ao acaso. É a herança da <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Fazenda Itaúna</strong> original, cujas terras geraram o loteamento. E reflete fielmente a geologia do solo: o vulcanismo da Bacia do Paraná, que originou o basalto escuro — uma verdadeira pedra negra — cuja decomposição criou a <strong style={{ color: 'rgba(255,255,255,0.8)' }}>terra roxa</strong> que você pisa aqui.
            </p>
          </div>

          {/* Dois elementos side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(6px,1.5vw,8px)' }}>
            <div style={{ ...card, padding: 'clamp(9px,2.2vw,13px)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>📜</span>
              <div>
                <p style={{ fontSize: 'clamp(10px,2.2vw,11.5px)', fontWeight: 700, color: '#fff', marginBottom: 3 }}>Nascimento oficial</p>
                <p style={{ fontSize: 'clamp(8.5px,1.8vw,10px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.45 }}>
                  Decreto nº 320/2005 aprovado em 27 de outubro. Associação Itaúna fundada em 3 de outubro do mesmo ano.
                </p>
              </div>
            </div>
            <div style={{ ...card, padding: 'clamp(9px,2.2vw,13px)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>🌋</span>
              <div>
                <p style={{ fontSize: 'clamp(10px,2.2vw,11.5px)', fontWeight: 700, color: '#fff', marginBottom: 3 }}>Rocha que forma o solo</p>
                <p style={{ fontSize: 'clamp(8.5px,1.8vw,10px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.45 }}>
                  Basalto vulcânico escuro sob seus pés. Milhões de anos de geologia brasileira em cada passo.
                </p>
              </div>
            </div>
          </div>

          {/* A grandeza em números */}
          <div style={{
            ...card, padding: 'clamp(10px,2.5vw,14px)',
            background: 'linear-gradient(135deg, rgba(87,216,255,0.06), rgba(13,20,35,0.95))',
            border: '1px solid rgba(87,216,255,0.15)',
          }}>
            <p style={{ fontSize: 'clamp(9px,2.1vw,11px)', fontWeight: 700, color: CYAN, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              A Grandeza em Números
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
              {[
                { num: '3,8 km²', label: 'de território' },
                { num: '360', label: 'chácaras' },
                { num: '20+', label: 'anos consolidados' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 'clamp(16px,3.5vw,22px)', fontWeight: 900, color: CYAN, lineHeight: 1 }}>{stat.num}</p>
                  <p style={{ fontSize: 'clamp(8px,1.8vw,9.5px)', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Closing note */}
          <div style={{ paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 'clamp(9px,2vw,10.5px)', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, textAlign: 'center' }}>
              Itaúna não é apenas um nome. É uma promessa de raízes, segurança jurídica de 20 anos e um compromisso com a sustentabilidade que começou antes de ser moda.
            </p>
          </div>
        </Shell>
      ),
    },

    /* ── SLIDE 6: O Grande Espelho d'Água (o lago) ── */
    {
      key: 'slide-lago',
      label: 'O Lago',
      content: (
        <Shell badges={[
          { icon: '💧', label: 'Espelho central' },
          { icon: '🦆', label: 'Vida selvagem' },
          { icon: '🌅', label: 'Pôr do sol diário' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              O Coração do Lugar
            </p>
            <h2 style={{ fontSize: 'clamp(19px,4.8vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 10 }}>
              O grande espelho<br/><span style={gradStyle}>d'água que respira.</span>
            </h2>
          </div>

          {/* Narrativa sensorial */}
          <div style={{ ...card, padding: 'clamp(11px,2.8vw,15px)' }}>
            <p style={{ fontSize: 'clamp(10px,2.1vw,11.5px)', color: 'rgba(255,255,255,0.68)', lineHeight: 1.8 }}>
              No coração de Itaúna, o lago central reflete o céu. Garças de madrugada, ninhos de pássaros ao amanhecer, rãs ao anoitecer — toda a vida selvagem concentra-se em torno deste espelho d'água. Nossas ruas em paralelepípedos não são coincidência: cada gota de chuva é absorvida pelo solo, alimentando o lago em vez de assoreá-lo. Sustentabilidade em ação.
            </p>
          </div>

          {/* O que rodeia o lago */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px,1.5vw,8px)' }}>
            {[
              {
                emoji: '🏖️', color: CYAN,
                title: 'Quadra de beach tennis',
                desc: 'Arena de areia natural para jogos ao entardecer, com o lago ao fundo.',
              },
              {
                emoji: '⚽', color: GREEN,
                title: 'Campo de futebol society',
                desc: 'Partidas que terminam quando o sol toca a água.',
              },
              {
                emoji: '🍽️', color: YELLOW,
                title: 'Salão de festas',
                desc: 'Eventos com vista privilegiada — casamentos, aniversários, celebrações com o lago como cenário.',
              },
              {
                emoji: '👶', color: PURPLE,
                title: 'Playground e pista de caminhada',
                desc: 'Crianças brincam sob as árvores enquanto adultos caminham ao redor da água — cada idade tem seu tempo no lago.',
              },
            ].map(d => (
              <div key={d.title} style={{
                ...card, padding: 'clamp(9px,2.2vw,13px)', display: 'flex', gap: 11, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>{d.emoji}</span>
                <div>
                  <p style={{ fontSize: 'clamp(10px,2.2vw,11.5px)', fontWeight: 700, color: '#fff', marginBottom: 2 }}>{d.title}</p>
                  <p style={{ fontSize: 'clamp(8.5px,1.8vw,10px)', color: 'rgba(255,255,255,0.48)', lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Closing sensorial */}
          <div style={{
            ...card, padding: 'clamp(10px,2.5vw,14px)',
            background: 'linear-gradient(135deg, rgba(87,216,255,0.05), rgba(13,20,35,0.95))',
            borderLeft: `3px solid ${CYAN}`,
          }}>
            <p style={{ fontSize: 'clamp(10px,2.2vw,12px)', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.7 }}>
              "No Itaúna, o lago não é apenas água. É o pulso do lugar — conecta você à natureza, aos seus vizinhos, e a cada pôr do sol que não é como os outros. É a razão pela qual você volta para casa."
            </p>
          </div>
        </Shell>
      ),
    },

    /* ── SLIDE 7: Telefones Úteis ── */
    {
      key: 'slide-telefones',
      label: 'Telefones',
      content: (
        <Shell badges={[
          { icon: '🚨', label: 'Emergências' },
          { icon: '💧', label: 'Utilidades' },
          { icon: '🏛️', label: 'Poder Público' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 8 }}>
              Contatos Essenciais
            </p>
            <h2 style={{ fontSize: 'clamp(19px,4.8vw,32px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 6 }}>
              Telefones <span style={{ background: 'linear-gradient(135deg,#72e3ff,#669dff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>úteis</span>
            </h2>
            <p style={{ fontSize: 'clamp(10px,2.2vw,12px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, marginBottom: 2 }}>
              Emergências, serviços e órgãos públicos para moradores e visitantes.
            </p>
          </div>

          {/* Emergências em destaque */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'clamp(5px,1.2vw,8px)' }}>
            {[
              { emoji: '🚑', num: '192',  label: 'SAMU / SIATE', color: '#ef4444' },
              { emoji: '🔥', num: '193',  label: 'Bombeiros',    color: '#f59e0b' },
              { emoji: '🚔', num: '190',  label: 'Polícia Mil.', color: '#5a84ff' },
              { emoji: '⛑️', num: '199',  label: 'Defesa Civil', color: '#10b981' },
            ].map(e => (
              <a key={e.label} href={`tel:${e.num}`} style={{
                display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                background: `${e.color}10`, border: `1px solid ${e.color}28`,
                borderRadius: 12, padding: 'clamp(9px,2.2vw,13px)',
              }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{e.emoji}</span>
                <div>
                  <p style={{ fontSize: 'clamp(15px,3.5vw,20px)', fontWeight: 900, color: e.color, lineHeight: 1 }}>{e.num}</p>
                  <p style={{ fontSize: 'clamp(8px,1.8vw,10px)', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{e.label}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Utilidades e poder público */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(5px,1.2vw,7px)' }}>
            {[
              { emoji: '💧', label: 'SAMAE Ibiporã',    num: '(43) 3252-1655', color: '#57d8ff' },
              { emoji: '⚡', label: 'COPEL',             num: '0800 723 2302',  color: '#f59e0b' },
              { emoji: '🏛️', label: 'Prefeitura Ibiporã', num: '(43) 3252-1500', color: '#5a84ff' },
              { emoji: '🏡', label: 'Portaria Itaúna',  num: '(43) 99999-0001', color: '#57d8ff' },
            ].map(c => (
              <a key={c.label} href={`tel:${c.num.replace(/\D/g,'')}`} style={{
                display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: `3px solid ${c.color}`, borderRadius: '0 10px 10px 0',
                padding: 'clamp(8px,2vw,11px) clamp(10px,2.5vw,14px)',
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{c.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 700, color: '#fff', marginBottom: 1 }}>{c.label}</p>
                  <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: c.color, fontWeight: 600 }}>{c.num}</p>
                </div>
              </a>
            ))}
          </div>

          <Link to="/telefones-uteis" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 'clamp(10px,2.5vw,13px)', borderRadius: '11px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            color: '#57d8ff', fontWeight: 700, fontSize: 'clamp(11px,2.5vw,13px)', textDecoration: 'none',
          }}>
            Ver lista completa <ArrowRight size={14} />
          </Link>
        </Shell>
      ),
    },

    /* ── SLIDE 8: Quem Somos (Identidade) ── */
    {
      key: 'slide-identidade',
      label: 'Quem Somos',
      content: (
        <Shell badges={[
          { icon: '🌍', label: 'Comunidade' },
          { icon: '📖', label: 'Histórico' },
          { icon: '🎯', label: 'Identidade' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              Nossa Identidade
            </p>
            <h2 style={{ fontSize: 'clamp(20px,5vw,34px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 12 }}>
              <span style={gradStyle}>Comunidade de escolha</span> deliberada
            </h2>
            <p style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: 'rgba(255,255,255,0.58)', lineHeight: 1.65 }}>
              Itaúna não é apenas um condomínio. É um lugar onde 360 famílias decidiram que o campo não é um compromisso — é um privilégio.
            </p>
          </div>

          {/* Timeline resumida */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px,2vw,14px)' }}>
            {[
              { year: '2005', title: 'Oficialização', desc: 'Decreto nº 320/2005 e Associação fundada' },
              { year: '2019', title: 'Sustentabilidade', desc: 'Nomeação das vias com espécies locais' },
              { year: '2024', title: 'Inovação Digital', desc: 'Plataforma integrada com 20+ módulos' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: CYAN, letterSpacing: '0.06em' }}>{item.year}</p>
                </div>
                <div style={{ ...card, padding: 'clamp(9px,2.2vw,12px)' }}>
                  <p style={{ fontSize: 'clamp(11px,2.5vw,12px)', fontWeight: 700, color: '#fff', marginBottom: 2 }}>{item.title}</p>
                  <p style={{ fontSize: 'clamp(9px,2vw,10px)', color: 'rgba(255,255,255,0.45)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link to="/quem-somos" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 'clamp(11px,2.5vw,13px)', borderRadius: '11px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: CYAN, fontWeight: 700, fontSize: 'clamp(12px,2.5vw,13px)',
            textDecoration: 'none', transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(87,216,255,0.12)';
            e.currentTarget.style.borderColor = 'rgba(87,216,255,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
          >
            Ver Página Completa <ArrowRight size={14} />
          </Link>
        </Shell>
      ),
    },

    /* ── SLIDE 8: Nossos Valores ── */
    {
      key: 'slide-valores',
      label: 'Valores',
      content: (
        <Shell badges={[
          { icon: '🌿', label: 'Natureza' },
          { icon: '⚖️', label: 'Legalidade' },
          { icon: '💡', label: 'Inovação' },
        ]}>
          <div>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 8 }}>
              Nossos Pilares
            </p>
            <h2 style={{ fontSize: 'clamp(20px,5vw,34px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 16 }}>
              Sete <span style={gradStyle}>Valores</span> que Guiam Tudo
            </h2>
          </div>

          {/* 4 Pilares principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'clamp(8px,2vw,12px)' }}>
            {[
              { icon: '🌿', title: 'Natureza', desc: 'Lagos e mata nativa viva' },
              { icon: '☀️', title: 'Sustentabilidade', desc: 'Paralelepípedos + Painéis solares' },
              { icon: '🔒', title: 'Segurança', desc: 'Portaria 24h integrada' },
              { icon: '👥', title: 'Comunidade', desc: 'Vizinhos conectados' },
            ].map((p, i) => (
              <div key={i} style={{ ...card, padding: 'clamp(12px,2.5vw,14px)', display: 'flex', gap: 10, flexDirection: 'column' }}>
                <p style={{ fontSize: '1.8rem' }}>{p.icon}</p>
                <div>
                  <p style={{ fontSize: 'clamp(11px,2.5vw,12px)', fontWeight: 700, color: '#fff', marginBottom: 2 }}>{p.title}</p>
                  <p style={{ fontSize: 'clamp(9px,2vw,10px)', color: 'rgba(255,255,255,0.45)' }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link to="/quem-somos" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 'clamp(11px,2.5vw,13px)', borderRadius: '11px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: CYAN, fontWeight: 700, fontSize: 'clamp(12px,2.5vw,13px)',
            textDecoration: 'none', transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(87,216,255,0.12)';
            e.currentTarget.style.borderColor = 'rgba(87,216,255,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
          >
            Conhecer os 7 Pilares <ArrowRight size={14} />
          </Link>
        </Shell>
      ),
    },

    /* ── SLIDE 9: Saiba Mais (Editorial Premium) ── */
    {
      key: 'slide-saiba-mais',
      label: 'Saiba Mais',
      content: (
        <Shell badges={[
          { icon: '📚', label: 'Editorial' },
          { icon: '🎯', label: 'Identidade' },
          { icon: '🌟', label: 'Propósito' },
        ]}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 12 }}>
              Mergulhe Fundo
            </p>
            <h2 style={{ fontSize: 'clamp(22px,5.5vw,36px)', fontWeight: 900, lineHeight: 1.1, color: '#fff', marginBottom: 16 }}>
              Conjunto Editorial<br /><span style={gradStyle}>Premium</span>
            </h2>
          </div>

          <div style={{
            ...card,
            padding: 'clamp(14px,3vw,20px)',
            background: 'linear-gradient(135deg, rgba(87,216,255,0.08), rgba(139,92,246,0.04))',
            borderLeft: `3px solid ${CYAN}`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 'clamp(13px,2.5vw,14px)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
              A quinze minutos do centro de Londrina
            </p>
            <p style={{ fontSize: 'clamp(11px,2.2vw,13px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>
              Um refúgio ecológico para chamar de seu. Documentação completa, comunidade viva, natureza preservada.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/quem-somos" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 'clamp(12px,3vw,15px)', borderRadius: '13px',
              background: 'linear-gradient(135deg,#72e3ff,#669dff)', color: '#07101c',
              fontWeight: 800, fontSize: 'clamp(13px,3vw,15px)', textDecoration: 'none',
              boxShadow: '0 8px 28px rgba(76,164,255,0.3)',
            }}>
              Ver Página Completa <ChevronRight size={15} />
            </Link>
            <Link to="/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: 'clamp(9px,2.5vw,12px)', borderRadius: '11px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.75)', fontWeight: 600,
              fontSize: 'clamp(11px,2.5vw,13px)', textDecoration: 'none',
            }}>
              Acessar Portal do Condômino
            </Link>
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

      <div
        className="relative z-10 w-full overflow-hidden"
        style={{ height: '100dvh', paddingTop: 'calc(clamp(58px,11vw,78px) + 27px)', boxSizing: 'border-box' }}
      >
        <PageCarousel3D slides={slides} />
      </div>
    </>
  );
};
