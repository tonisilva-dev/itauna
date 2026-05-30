import { useState } from 'react';
import { ChevronLeft, ChevronRight, Bell, Calendar, User } from 'lucide-react';

export interface Communication {
  id: number;
  title: string;
  content: string;
  category: 'importante' | 'informativo' | 'urgente';
  author: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

interface CommunicationsCarouselProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMUNICATIONS: Communication[] = [
  {
    id: 1,
    title: 'Aviso de Manutenção da Água',
    content: 'A distribuição de água será interrompida no próximo sábado, das 08h às 17h, para manutenção preventiva na rede de abastecimento. Pedimos desculpas pelo incômodo e agradeça a compreensão.',
    category: 'importante',
    author: 'Administração',
    date: '2026-05-25',
    priority: 'high',
    icon: '💧',
  },
  {
    id: 2,
    title: 'Resultado da Assembleia Ordinária',
    content: 'A Assembleia Geral Ordinária de maio foi concluída com sucesso. Foram aprovadas as propostas de aumento da taxa condominial em 3% e a eleição da nova diretoria para o mandato 2026-2027.',
    category: 'informativo',
    author: 'Síndico',
    date: '2026-05-24',
    priority: 'medium',
    icon: '🗳️',
  },
  {
    id: 3,
    title: 'Denuncia de Barulho Excessivo',
    content: 'Solicitamos que todos os moradores respeitem os horários de silêncio conforme o regulamento interno. A partir de 22h, deve haver redução de volume. Pedimos colaboração de todos!',
    category: 'urgente',
    author: 'Síndico',
    date: '2026-05-23',
    priority: 'high',
    icon: '📢',
  },
  {
    id: 4,
    title: 'Arrecadação para Reparo da Piscina',
    content: 'A piscina necessita de reparos na filtragem. Iniciamos uma arrecadação extraordinária de R$ 15 mil para este fim. Sua participação é fundamental para manter nossas instalações em perfeito estado.',
    category: 'informativo',
    author: 'Administração',
    date: '2026-05-22',
    priority: 'medium',
    icon: '🏊',
  },
  {
    id: 5,
    title: 'Novos Horários de Funcionamento',
    content: 'A partir de junho, os horários das áreas comuns serão: Quadra - 07h às 23h | Piscina - 10h às 18h | Salão - 08h às 22h. Confira o novo regulamento no mural da administração.',
    category: 'informativo',
    author: 'Administração',
    date: '2026-05-21',
    priority: 'low',
    icon: '⏰',
  },
];

const CATEGORIES = ['Todos', 'Importante', 'Informativo', 'Urgente'];

export const CommunicationsCarousel = ({ isOpen, onClose }: CommunicationsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [category, setCategory] = useState('Todos');

  if (!isOpen) return null;

  const filtered = COMMUNICATIONS.filter(
    (c) => category === 'Todos' || c.category === category.toLowerCase()
  );

  const current = filtered[currentIndex % filtered.length];

  const next = () => setCurrentIndex((c) => (c + 1) % filtered.length);
  const prev = () => setCurrentIndex((c) => (c - 1 + filtered.length) % filtered.length);

  const priorityColor = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  };

  const priorityText = {
    high: 'Urgente',
    medium: 'Normal',
    low: 'Informativo',
  };

  const categoryColor = {
    importante: '#ef4444',
    informativo: '#5a84ff',
    urgente: '#f59e0b',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl"
        style={{ overflowY: 'auto', maxHeight: '100%', paddingBottom: '4px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Communication Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
            border: `1px solid ${categoryColor[current.category]}40`,
            borderRadius: '28px',
            overflow: 'hidden',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)',
            boxShadow: `0 32px 96px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.055)`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 'clamp(20px, 5vw, 40px) clamp(16px, 5vw, 40px) 0',
              background: `linear-gradient(135deg, ${categoryColor[current.category]}20, ${categoryColor[current.category]}10)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px' }}>{current.icon}</div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: `${priorityColor[current.priority]}20`,
                  border: `1px solid ${priorityColor[current.priority]}40`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: priorityColor[current.priority],
                }}
              >
                🔴 {priorityText[current.priority]}
              </div>
            </div>

            <p
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: categoryColor[current.category],
                marginBottom: '12px',
              }}
            >
              {current.category}
            </p>
            <h2
              style={{
                fontSize: 'clamp(26px, 3.8vw, 36px)',
                fontWeight: 900,
                letterSpacing: '-0.045em',
                lineHeight: 1.08,
                color: '#fff',
                marginBottom: '24px',
              }}
            >
              {current.title}
            </h2>
          </div>

          {/* Content */}
          <div style={{ padding: '0 clamp(16px, 5vw, 40px) clamp(20px, 4vw, 40px)' }}>
            {/* Message */}
            <div
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(125,157,224,.1)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,.85)',
                  lineHeight: 1.8,
                }}
              >
                {current.content}
              </p>
            </div>

            {/* Meta Info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {/* Author */}
              <div
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(125,157,224,.1)',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User className="w-4 h-4" style={{ color: '#57d8ff' }} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Autor</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {current.author}
                </p>
              </div>

              {/* Date */}
              <div
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(125,157,224,.1)',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#57d8ff' }} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Data</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {new Date(current.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '11px',
                border: '1px solid rgba(255,255,255,.09)',
                background: 'rgba(255,255,255,.04)',
                color: '#d3dff6',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(87,216,255,.28)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.09)';
              }}
            >
              Fechar
            </button>
          </div>

          {/* Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'rgba(255,255,255,.04)',
              borderTop: '1px solid rgba(255,255,255,.04)',
            }}
          >
            <div
              style={{
                minHeight: '56px',
                background: 'rgba(255,255,255,.018)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: '#e7f0fe',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              📬 Comunicado
            </div>
            <div
              style={{
                minHeight: '56px',
                background: 'rgba(255,255,255,.018)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: '#e7f0fe',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              👥 Todos Moradores
            </div>
            <div
              style={{
                minHeight: '56px',
                background: 'rgba(255,255,255,.018)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: '#e7f0fe',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              ✓ Lido
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setCurrentIndex(0);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: c === category ? '#57d8ff' : 'rgba(255,255,255,.08)',
                color: c === category ? '#0a0f1e' : 'rgba(255,255,255,.6)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (c !== category) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (c !== category) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)';
                }
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '28px',
            marginTop: '24px',
          }}
        >
          <button
            onClick={prev}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              cursor: 'pointer',
              border: '1px solid rgba(125,157,224,.22)',
              background: 'rgba(255,255,255,.04)',
              color: '#57d8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.24s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,.16)';
              (e.currentTarget as HTMLElement).style.borderColor = '#57d8ff';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(87,216,255,.38)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,157,224,.22)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {filtered.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: idx === currentIndex ? '#57d8ff' : 'rgba(255,255,255,.2)',
                  border: '1px solid rgba(87,216,255,.28)',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              cursor: 'pointer',
              border: '1px solid rgba(125,157,224,.22)',
              background: 'rgba(255,255,255,.04)',
              color: '#57d8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.24s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,.16)';
              (e.currentTarget as HTMLElement).style.borderColor = '#57d8ff';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(87,216,255,.38)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,157,224,.22)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
