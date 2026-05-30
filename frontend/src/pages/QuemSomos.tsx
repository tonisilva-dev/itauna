import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Leaf, Sun, Shield, Users, FileCheck, Zap, Home,
  CheckCircle2, TreePine,
} from 'lucide-react';

const CYAN   = '#57d8ff';
const GREEN  = '#10b981';
const BLUE   = '#5a84ff';
const YELLOW = '#f59e0b';
const PURPLE = '#8b5cf6';
const RED    = '#ef4444';

export const QuemSomos = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#07101c', color: '#fff', paddingBottom: 60 }}>
      {/* Header com botão voltar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(180deg, rgba(7,16,28,0.98), rgba(7,16,28,0.85))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(12px,3vw,20px) clamp(16px,4vw,28px)',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: CYAN, fontWeight: 700, fontSize: '0.875rem',
              padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(87,216,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(87,216,255,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TreePine size={20} style={{ color: CYAN }} />
            <p style={{ fontWeight: 800, fontSize: '1rem' }}>Itaúna</p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(20px,5vw,40px) clamp(16px,4vw,32px)' }}>

        {/* SEÇÃO 1: Quem Somos */}
        <section style={{ marginBottom: 'clamp(50px,8vw,80px)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 12 }}>
            Nossa Identidade
          </p>
          <h1 style={{ fontSize: 'clamp(28px,6vw,48px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}>
            Quem Somos
          </h1>
          <p style={{ fontSize: 'clamp(14px,2.2vw,16px)', lineHeight: 1.8, color: 'rgba(255,255,255,0.65)', marginBottom: 16 }}>
            Itaúna não é apenas um condomínio. É uma <strong style={{ color: '#fff' }}>comunidade de escolha deliberada</strong> — um lugar onde 360 famílias decidiram que o campo não é um compromisso, é um privilégio.
          </p>
          <p style={{ fontSize: 'clamp(14px,2.2vw,16px)', lineHeight: 1.8, color: 'rgba(255,255,255,0.55)' }}>
            Em 2005, quando a maioria das famílias buscava apenas um lote fora da cidade, os fundadores do Itaúna enxergaram algo diferente: um <strong style={{ color: 'rgba(255,255,255,0.75)' }}>ecossistema de vida</strong>. Vinte anos depois, o Itaúna é o maior e mais consolidado condomínio periurbano de alto padrão do norte do Paraná — o único com documentação 100% regularizada, energia solar, e plataforma digital integrada.
          </p>
        </section>

        {/* SEÇÃO 2: Sete Pilares */}
        <section style={{ marginBottom: 'clamp(50px,8vw,80px)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 12 }}>
            Nossos Pilares
          </p>
          <h2 style={{ fontSize: 'clamp(24px,5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 32, color: '#fff' }}>
            Sete Valores que Guiam Tudo o que Fazemos
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(16px,2.5vw,24px)' }}>
            {[
              {
                num: '01',
                icon: Leaf,
                color: GREEN,
                title: 'Natureza Preservada',
                desc: 'Lagos, mata nativa, fauna viva. Cada chácara respira com a terra.',
              },
              {
                num: '02',
                icon: Sun,
                color: YELLOW,
                title: 'Sustentabilidade Consciente',
                desc: 'Paralelepípedos que absorvem chuva. Painéis solares que iluminam as vias. Escolhas que duram séculos.',
              },
              {
                num: '03',
                icon: Shield,
                color: CYAN,
                title: 'Segurança Integral',
                desc: 'Portaria 24h, portão eletrônico, acesso controlado. Você e sua família, sempre protegidos.',
              },
              {
                num: '04',
                icon: Users,
                color: PURPLE,
                title: 'Comunidade Viva',
                desc: 'Vizinhos que se conhecem por nome. Eventos que conectam. Vida que acontece.',
              },
              {
                num: '05',
                icon: FileCheck,
                color: BLUE,
                title: 'Legalidade e Confiança',
                desc: 'Decreto 320/2005. Escrituras individualizadas. Financiável. Sem pendências. Documentação que protege.',
              },
              {
                num: '06',
                icon: Zap,
                color: RED,
                title: 'Inovação Responsável',
                desc: 'Plataforma digital integrada. Biometria WebAuthn. Transparência total. Tecnologia que serve ao lugar.',
              },
              {
                num: '07',
                icon: Home,
                color: CYAN,
                title: 'Pertencimento ao Lugar',
                desc: 'Itaúna = pedra negra em tupi. Raízes históricas. Você não mora aqui por falta de opção — é uma escolha.',
              },
            ].map((pilar, idx) => (
              <div
                key={idx}
                style={{
                  background: 'linear-gradient(135deg, rgba(13,20,35,0.9), rgba(8,13,24,0.98))',
                  border: `1px solid ${pilar.color}22`,
                  borderRadius: '16px',
                  padding: 'clamp(20px,3vw,28px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900, color: pilar.color, opacity: 0.3, lineHeight: 1 }}>
                    {pilar.num}
                  </p>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `${pilar.color}15`, border: `1px solid ${pilar.color}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <pilar.icon size={20} style={{ color: pilar.color }} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 'clamp(14px,2.2vw,16px)', fontWeight: 800, marginBottom: 8, color: '#fff' }}>
                    {pilar.title}
                  </h3>
                  <p style={{ fontSize: 'clamp(12px,2vw,14px)', lineHeight: 1.6, color: 'rgba(255,255,255,0.5)' }}>
                    {pilar.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SEÇÃO 3: Timeline Histórica */}
        <section style={{ marginBottom: 'clamp(50px,8vw,80px)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 12 }}>
            Nossa Jornada
          </p>
          <h2 style={{ fontSize: 'clamp(24px,5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 32, color: '#fff' }}>
            De Fazenda a Ecossistema
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(20px,3vw,32px)' }}>
            {[
              {
                year: '2002',
                icon: '📋',
                title: 'Protocolo de Loteamento',
                desc: 'Protocolo nº 737/2002 junto à Prefeitura de Ibiporã marca o começo de uma jornada.',
              },
              {
                year: '2005',
                icon: '⚖️',
                title: 'Oficialização e Identidade',
                desc: 'Decreto Municipal nº 320/2005 (27 de outubro) e fundação da Associação Itaúna (3 de outubro). O nome herdado da Fazenda Itaúna original — "pedra negra" em tupi — reflete fielmente a geologia vulcânica da região.',
              },
              {
                year: '2019',
                icon: '🏷️',
                title: 'Nomes para as Ruas',
                desc: 'Edital nº 054/2019 denomina as vias públicas com nomes de espécies arbóreas e frutíferas locais. Rua Sibipiruna, Rua Laranjeira — cada nome uma herança da terra.',
              },
              {
                year: '2024',
                icon: '💻',
                title: 'Plataforma Digital Integrada',
                desc: 'Lançamento da plataforma Itaúna Digital com 20+ módulos funcionais, transparência total, e autenticação biométrica WebAuthn. O condomínio entra na era digital sem perder suas raízes.',
              },
              {
                year: '2025',
                icon: '🌟',
                title: 'Consolidação e Legado',
                desc: 'Vinte anos depois, Itaúna é reconhecido como o maior e mais consolidado condomínio periurbano de alto padrão do norte do Paraná, com documentação 100% regularizada e um futuro garantido.',
              },
            ].map((marco, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr',
                  gap: 'clamp(16px,2.5vw,24px)',
                  paddingLeft: 'clamp(16px,2.5vw,24px)',
                  borderLeft: `2px solid ${CYAN}44`,
                  paddingTop: idx === 0 ? 0 : 'clamp(12px,2vw,20px)',
                  paddingBottom: idx === 4 ? 0 : 'clamp(12px,2vw,20px)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: '2rem' }}>{marco.icon}</p>
                  <p style={{
                    fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em',
                    color: CYAN, textAlign: 'center',
                  }}>
                    {marco.year}
                  </p>
                </div>
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{ fontSize: 'clamp(14px,2.2vw,16px)', fontWeight: 800, marginBottom: 6, color: '#fff' }}>
                    {marco.title}
                  </h3>
                  <p style={{ fontSize: 'clamp(12px,2vw,14px)', lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>
                    {marco.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SEÇÃO 4: Frase Âncora */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(87,216,255,0.08), rgba(139,92,246,0.04))',
          border: `1px solid ${CYAN}22`,
          borderRadius: '20px',
          padding: 'clamp(28px,5vw,48px)',
          textAlign: 'center',
          marginBottom: 'clamp(30px,5vw,50px)',
        }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: CYAN, marginBottom: 20 }}>
            Quem Escolhe Itaúna
          </p>
          <h3 style={{
            fontSize: 'clamp(20px,4.5vw,36px)',
            fontWeight: 900,
            lineHeight: 1.3,
            color: '#fff',
            marginBottom: 20,
          }}>
            A quinze minutos do centro de Londrina,<br />
            <span style={{ background: 'linear-gradient(135deg, #72e3ff, #669dff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              um refúgio ecológico para chamar de seu.
            </span>
          </h3>
          <p style={{ fontSize: 'clamp(12px,2vw,14px)', color: 'rgba(255,255,255,0.55)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
            Não é distância do caos urbano. É proximidade do que importa: natureza, segurança, comunidade e futuro garantido.
          </p>
        </section>
      </div>
    </div>
  );
};
