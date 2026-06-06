import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, Info, X, ChevronRight, ArrowRight,
  Bell, Shield, Calendar, Tag, MapPin, Mail, Phone,
  DollarSign, Image, FileText, Home, Users, AlertCircle,
  Search, Building2, Fingerprint, Star, CheckCircle2,
  Sun, Droplets, Leaf,
} from 'lucide-react';
import { fetchGaleriaFotos } from '../lib/supabase-queries';

/* ── Fallback quando galeria vazia ── */
const FALLBACK = ['/bg-area-livre-1.webp', '/bg-area-livre-2.webp'];

const SLIDE_MS = 10_000;
const FADE_MS  = 1_100;

/* ── Estilos visuais que alternam a cada ciclo ── */
type BgStyle = {
  overlay: string;
  imgFilter: string;
  layout: 'full' | 'split' | 'triptych';
  rays: boolean;
};

const BG_STYLES: BgStyle[] = [
  {
    layout: 'split',
    overlay: 'linear-gradient(105deg,rgba(4,4,6,.55) 0%,rgba(6,6,8,.38) 100%)',
    imgFilter: 'brightness(0.80) saturate(0.95)',
    rays: true,
  },
  {
    layout: 'full',
    overlay: 'linear-gradient(180deg,rgba(4,4,6,.48) 0%,rgba(4,4,6,.74) 60%,rgba(4,4,6,.92) 100%)',
    imgFilter: 'brightness(0.75) saturate(0.80)',
    rays: false,
  },
  {
    layout: 'triptych',
    overlay: 'linear-gradient(135deg,rgba(5,5,7,.58) 0%,rgba(4,4,6,.42) 100%)',
    imgFilter: 'brightness(0.78) saturate(1.05)',
    rays: true,
  },
  {
    layout: 'split',
    overlay: 'linear-gradient(90deg,rgba(4,4,6,.62) 0%,rgba(6,6,8,.34) 100%)',
    imgFilter: 'brightness(0.72) saturate(0.25) contrast(1.08)',
    rays: false,
  },
];

/* ── Overlay de raios de luz diagonais (SVG) ── */
const LightRays = () => (
  <svg
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}
    viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ray1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="white" stopOpacity="0"/>
        <stop offset="50%" stopColor="white" stopOpacity="0.045"/>
        <stop offset="100%" stopColor="white" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id="ray2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="white" stopOpacity="0"/>
        <stop offset="50%" stopColor="white" stopOpacity="0.03"/>
        <stop offset="100%" stopColor="white" stopOpacity="0"/>
      </linearGradient>
    </defs>
    {/* Raios diagonais suaves */}
    <polygon points="680,0 780,0 520,700 420,700" fill="url(#ray1)" />
    <polygon points="820,0 870,0 610,700 560,700" fill="url(#ray2)" />
    <polygon points="950,0 990,0 730,700 690,700" fill="url(#ray1)" />
    <polygon points="1060,0 1090,0 830,700 800,700" fill="url(#ray2)" />
    <polygon points="1130,0 1155,0 895,700 870,700" fill="url(#ray1)" />
    <polygon points="580,0 630,0 370,700 320,700" fill="url(#ray2)" />
  </svg>
);

/* ── Componente de background multi-layout ── */
const BgScene = ({
  photos, startIdx, style, visible,
}: {
  photos: string[];
  startIdx: number;
  style: BgStyle;
  visible: boolean;
}) => {
  const n = photos.length;
  const get = (offset: number) => photos[(startIdx + offset) % n];

  const wrapStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    opacity: visible ? 1 : 0,
    transition: `opacity ${FADE_MS}ms cubic-bezier(.4,0,.2,1)`,
  };

  const imgStyle: React.CSSProperties = {
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center',
    filter: style.imgFilter,
    display: 'block',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      {style.layout === 'full' && (
        <div style={wrapStyle}>
          <img src={get(0)} alt="" style={imgStyle} fetchPriority="high" decoding="sync" />
        </div>
      )}

      {style.layout === 'split' && (
        <div className="landing-bg-flex" style={wrapStyle}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <img src={get(0)} alt="" style={imgStyle} fetchPriority="high" decoding="async" />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <img src={get(1)} alt="" style={imgStyle} fetchPriority="high" decoding="async" />
          </div>
        </div>
      )}

      {style.layout === 'triptych' && (
        <div className="landing-bg-flex" style={wrapStyle}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <img src={get(0)} alt="" style={imgStyle} fetchPriority="high" decoding="async" />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <img src={get(1)} alt="" style={imgStyle} fetchPriority="high" decoding="async" />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <img src={get(2)} alt="" style={imgStyle} fetchPriority="high" decoding="async" />
          </div>
        </div>
      )}

      {/* Overlay colorido */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: style.overlay,
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms cubic-bezier(.4,0,.2,1)`,
      }} />

      {style.rays && <LightRays />}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */

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

/* ── Modal de Informações ── */
const InfoModal = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(4,8,18,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: 'clamp(16px,4vw,40px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: 720,
        background: 'rgba(10,18,34,0.95)', border: '1px solid rgba(87,216,255,0.15)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(18px,4vw,28px) clamp(20px,5vw,32px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(135deg,rgba(87,216,255,0.06),rgba(13,20,35,0.95))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: 'linear-gradient(135deg,#72e3ff,#669dff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(87,216,255,0.35)',
            }}>
              <TreePine size={20} color="#07101c" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 17, color: '#fff', lineHeight: 1 }}>Itaúna</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>Chácaras · Ibiporã–PR</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 'clamp(20px,5vw,32px)', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Hero */}
          <section>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 10 }}>
              Condomínio Chácaras Itaúna · Ibiporã – PR
            </p>
            <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#fff', marginBottom: 12 }}>
              Encanto para quem visita,<br />
              <span style={gradStyle}>pertencimento para quem vive.</span>
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
              360 chácaras em 3,8 km² de natureza preservada, a 10 minutos de Londrina. Aqui, o campo não é um compromisso — é um privilégio.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
              {[
                { v: '3,8', l: 'km² de área', color: GREEN },
                { v: '20+', l: 'anos de história', color: CYAN },
                { v: '24h', l: 'portaria ativa', color: BLUE },
              ].map(s => (
                <div key={s.l} style={{ ...card, padding: '14px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 5 }}>{s.l}</p>
                </div>
              ))}
            </div>
          </section>

          {/* O Lugar */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: CYAN, marginBottom: 14 }}>O Lugar</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { emoji: '🗺️', title: 'Entre Londrina e a eternidade', desc: 'A 10 minutos da UTFPR e do Parque Tauá via Estrada do Limoeiro.' },
                { emoji: '📜', title: 'Sua chácara, definitivamente sua', desc: 'Documentação 100% regularizada desde 2005. Escritura pública autônoma, matrícula individualizada.' },
                { emoji: '🪨', title: 'A pedra que preserva o lago', desc: 'Vias em paralelepípedo absorvem água de chuva no solo, protegendo o lago central.' },
                { emoji: '☀️', title: 'A luz que vem do sol', desc: 'Iluminação das ruas por energia fotovoltaica autônoma.' },
              ].map(d => (
                <div key={d.title} style={{ ...card, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{d.emoji}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{d.title}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', lineHeight: 1.5 }}>{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* O Lago */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: CYAN, marginBottom: 14 }}>O Lago</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 1.7, marginBottom: 12 }}>
              No coração de Itaúna, o lago central reflete o céu. Garças de madrugada, ninhos de pássaros ao amanhecer — toda a vida selvagem concentra-se em torno deste espelho d'água.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[
                { emoji: '🏖️', title: 'Beach tennis', desc: 'Arena de areia natural com o lago ao fundo.' },
                { emoji: '⚽', title: 'Futebol society', desc: 'Partidas ao entardecer com vista para a água.' },
                { emoji: '🍽️', title: 'Salão de festas', desc: 'Eventos com vista privilegiada para o lago.' },
                { emoji: '👶', title: 'Playground', desc: 'Crianças sob árvores, adultos na pista de caminhada.' },
              ].map(d => (
                <div key={d.title} style={{ ...card, padding: '12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{d.emoji}</span>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{d.title}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quem Somos */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: CYAN, marginBottom: 14 }}>Quem Somos</h3>
            <div style={{ ...card, padding: '16px', lineHeight: 1.7, marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginBottom: 10 }}>
                Em 2005, os fundadores do Itaúna enxergaram um <strong style={{ color: '#fff' }}>ecossistema de vida</strong>. Foram criadas 360 chácaras em 3,8 km² de território, cada uma com espaço para uma história própria.
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)' }}>
                Hoje, duas décadas depois, o Itaúna é o maior condomínio periurbano de alto padrão do norte do Paraná — com <strong style={{ color: 'rgba(255,255,255,0.8)' }}>documentação 100% regularizada</strong>, iluminação solar e plataforma digital integrada.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[
                { icon: Leaf,     color: GREEN,  title: 'Natureza viva',     desc: 'Lagos, mata nativa, fauna local.' },
                { icon: Shield,   color: BLUE,   title: 'Segurança real',    desc: 'Portaria 24h e acesso controlado.' },
                { icon: Sun,      color: YELLOW, title: 'Energia limpa',     desc: 'Vias iluminadas por solar.' },
                { icon: Droplets, color: CYAN,   title: 'Água de qualidade', desc: 'Poços artesianos do SAMAE.' },
              ].map(p => (
                <div key={p.title} style={{ ...card, padding: '12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: `${p.color}15`, border: `1px solid ${p.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.icon size={12} style={{ color: p.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{p.title}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Linha do Tempo */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: CYAN, marginBottom: 14 }}>Nossa Trajetória</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { year: '2005', title: 'Oficialização', desc: 'Decreto nº 320/2005 e Associação fundada em outubro.' },
                { year: '2019', title: 'Sustentabilidade', desc: 'Nomeação das vias com espécies arbóreas locais.' },
                { year: '2024', title: 'Inovação Digital', desc: 'Plataforma integrada com 20+ módulos para condôminos.' },
              ].map(item => (
                <div key={item.year} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 12, alignItems: 'center' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: CYAN, letterSpacing: '0.06em', textAlign: 'center' }}>{item.year}</p>
                  <div style={{ ...card, padding: '10px 14px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{item.title}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Responsabilidade Social */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: GREEN, marginBottom: 14 }}>Responsabilidade Social &amp; Ambiental</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ ...card, padding: '14px', borderLeft: `3px solid ${GREEN}`, display: 'flex', gap: 12 }}>
                <span style={{ fontSize: '1.1rem' }}>♻️</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Gestão de Resíduos</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Guia de separação de orgânicos, recicláveis e rejeitos com ponto de coleta na portaria.</p>
                </div>
              </div>
              <div style={{ ...card, padding: '14px', borderLeft: `3px solid ${YELLOW}`, display: 'flex', gap: 12 }}>
                <span style={{ fontSize: '1.1rem' }}>🤝</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Campanhas Solidárias</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Ações sazonais: Agasalho, Páscoa, Natal — conectando moradores e comunidade.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Telefones Úteis */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: RED, marginBottom: 14 }}>Telefones Úteis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 10 }}>
              {[
                { emoji: '🚑', num: '192', label: 'SAMU / SIATE', color: RED },
                { emoji: '🔥', num: '193', label: 'Bombeiros', color: YELLOW },
                { emoji: '🚔', num: '190', label: 'Polícia Mil.', color: BLUE },
                { emoji: '⛑️', num: '199', label: 'Defesa Civil', color: GREEN },
              ].map(e => (
                <a key={e.label} href={`tel:${e.num}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', background: `${e.color}10`, border: `1px solid ${e.color}28`, borderRadius: 12, padding: '10px 12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{e.emoji}</span>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 900, color: e.color, lineHeight: 1 }}>{e.num}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{e.label}</p>
                  </div>
                </a>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { emoji: '💧', label: 'SAMAE Ibiporã',     num: '(43) 3252-1655', color: CYAN  },
                { emoji: '⚡', label: 'COPEL',             num: '0800 723 2302',  color: YELLOW },
                { emoji: '🏛️', label: 'Prefeitura Ibiporã', num: '(43) 3252-1500', color: BLUE  },
                { emoji: '🏡', label: 'Portaria Itaúna',   num: '(43) 99999-0001', color: CYAN },
              ].map(c => (
                <a key={c.label} href={`tel:${c.num.replace(/\D/g,'')}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${c.color}`, borderRadius: '0 10px 10px 0', padding: '8px 14px' }}>
                  <span style={{ fontSize: '1rem' }}>{c.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 1 }}>{c.label}</p>
                    <p style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.num}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Plataforma Digital */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: CYAN, marginBottom: 14 }}>Plataforma Digital</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 14 }}>
              Uma plataforma com 20+ módulos funcionais — financeiro, portaria, comunicados, agendamentos e muito mais, todos integrados.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
              {[
                { Icon: DollarSign,  title: 'Financeiro',    color: GREEN  },
                { Icon: Shield,      title: 'Portaria',      color: CYAN   },
                { Icon: Bell,        title: 'Comunicados',   color: YELLOW },
                { Icon: Calendar,    title: 'Agendamentos',  color: BLUE   },
                { Icon: AlertCircle, title: 'Ocorrências',   color: RED    },
                { Icon: Image,       title: 'Galeria',       color: PURPLE },
                { Icon: FileText,    title: 'Documentos',    color: CYAN   },
                { Icon: Tag,         title: 'Classificados', color: YELLOW },
                { Icon: Search,      title: 'Achados',       color: GREEN  },
              ].map(f => (
                <div key={f.title} style={{ ...card, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${f.color}18`, border: `1px solid ${f.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <f.Icon size={12} style={{ color: f.color }} />
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{f.title}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTAs finais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link to="/login" onClick={onClose} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', borderRadius: '13px',
              background: 'linear-gradient(135deg,#72e3ff,#669dff)', color: '#07101c',
              fontWeight: 800, fontSize: 15, textDecoration: 'none',
              boxShadow: '0 8px 28px rgba(76,164,255,0.3)',
            }}>
              Acessar o Portal do Condômino <ChevronRight size={15} />
            </Link>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link to="/galeria" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                📸 Ver Galeria
              </Link>
              <Link to="/quem-somos" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                🌿 Quem Somos
              </Link>
            </div>
            <div style={{ textAlign: 'center', paddingTop: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} Condomínio de Chácaras Itaúna · </span>
              <Link to="/privacidade" onClick={onClose} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Privacidade</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
export const LandingPage = () => {
  const [photos, setPhotos] = useState<string[]>(FALLBACK);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [styleIdx, setStyleIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Carregar fotos da galeria */
  useEffect(() => {
    fetchGaleriaFotos()
      .then(fotos => {
        if (fotos.length > 0) {
          /* Embaralhar para variedade */
          const shuffled = [...fotos].sort(() => Math.random() - 0.5);
          setPhotos(shuffled.map(f => f.src));
        }
      })
      .catch(() => {}); // usa FALLBACK
  }, []);

  /* Ciclo de 27 s */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhotoIdx(i => (i + 1) % photos.length);
        setStyleIdx(i => (i + 1) % BG_STYLES.length);
        setVisible(true);
      }, FADE_MS);
    }, SLIDE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [photos.length]);

  const currentStyle = BG_STYLES[styleIdx];

  return (
    <>
      {/* ── Background cena ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', background: '#050506' }}>
        <BgScene photos={photos} startIdx={photoIdx} style={currentStyle} visible={visible} />
      </div>

      {/* ── UI sobre o fundo ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(18px,4vw,28px) clamp(20px,5vw,36px)',
          pointerEvents: 'auto',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 'clamp(34px,7vw,42px)', height: 'clamp(34px,7vw,42px)',
              borderRadius: 12, background: 'linear-gradient(135deg,#72e3ff,#669dff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(87,216,255,0.45)',
            }}>
              <TreePine size={18} color="#07101c" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 'clamp(13px,3vw,15px)', color: '#fff', lineHeight: 1, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>Itaúna</p>
              <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: 'rgba(255,255,255,0.50)', marginTop: 3 }}>Chácaras · Ibiporã–PR</p>
            </div>
          </div>

          {/* Login */}
          <Link to="/login" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: 'clamp(9px,2vw,12px) clamp(16px,3.5vw,24px)',
            borderRadius: 12,
            background: 'rgba(6,10,20,0.60)', border: '1px solid rgba(87,216,255,0.30)',
            color: CYAN, fontWeight: 700, fontSize: 'clamp(12px,2.5vw,14px)',
            textDecoration: 'none', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.40)',
            whiteSpace: 'nowrap',
          }}>
            Entrar <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Centro — tagline elegante */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: '0 clamp(20px,6vw,60px)', textAlign: 'center',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms cubic-bezier(.4,0,.2,1)`,
        }}>
          <p style={{
            fontSize: 'clamp(26px,5.5vw,58px)', fontWeight: 300, letterSpacing: '0.02em',
            color: '#fff', lineHeight: 1.15,
            textShadow: '0 4px 32px rgba(0,0,0,0.70)',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}>
            Encanto para quem visita,<br />pertencimento para quem vive.
          </p>
          <p style={{
            fontSize: 'clamp(12px,2vw,16px)', fontWeight: 400, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
            textShadow: '0 2px 16px rgba(0,0,0,0.60)',
          }}>
            Condomínio de Chácaras Itaúna &nbsp;·&nbsp; Ibiporã – PR
          </p>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: 'clamp(18px,4vw,28px) clamp(20px,5vw,36px)',
          pointerEvents: 'auto',
        }}>
          {/* Indicadores de slide */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: Math.min(photos.length, 8) }).map((_, i) => (
              <div key={i} style={{
                width: i === photoIdx % Math.min(photos.length, 8) ? 20 : 6,
                height: 4, borderRadius: 2,
                background: i === photoIdx % Math.min(photos.length, 8) ? CYAN : 'rgba(255,255,255,0.25)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>

          {/* Botão Informações */}
          <button
            onClick={() => setInfoOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 'clamp(10px,2vw,13px) clamp(16px,3.5vw,22px)',
              borderRadius: 12,
              background: 'rgba(6,10,20,0.60)', border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff', fontWeight: 600, fontSize: 'clamp(12px,2.5vw,14px)',
              cursor: 'pointer', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.40)',
              letterSpacing: '0.02em',
            }}
          >
            <Info size={16} />
            Informações
          </button>
        </div>
      </div>

      {/* Modal */}
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </>
  );
};
