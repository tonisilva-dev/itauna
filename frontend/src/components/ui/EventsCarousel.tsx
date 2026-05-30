import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, MapPin } from 'lucide-react';

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  attendees: number;
  capacity: number;
  status: 'upcoming' | 'ongoing' | 'past';
  icon: string;
  color: string;
}

interface EventsCarouselProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin?: (event: Event) => void;
}

const EVENTS: Event[] = [
  {
    id: 1,
    title: 'Assembleia Geral Ordinária',
    description: 'Discussão de assuntos de interesse da comunidade, aprovação do orçamento e eleição de diretoria.',
    date: '2026-06-15',
    time: '19:00',
    location: 'Salão de Festas',
    category: 'Assembleia',
    attendees: 87,
    capacity: 150,
    status: 'upcoming',
    icon: '🗳️',
    color: '#5a84ff',
  },
  {
    id: 2,
    title: 'Confraternização de Verão',
    description: 'Festa de confraternização com música, comida, bebida e muita diversão para toda a família.',
    date: '2026-06-20',
    time: '18:00',
    location: 'Área de Churrasco',
    category: 'Social',
    attendees: 120,
    capacity: 200,
    status: 'upcoming',
    icon: '🎉',
    color: '#f59e0b',
  },
  {
    id: 3,
    title: 'Campeonato de Futsal',
    description: 'Competição amistosa entre equipes do condomínio. Inscrições abertas para jogadores e torcedores.',
    date: '2026-06-08',
    time: '16:00',
    location: 'Quadra de Futsal',
    category: 'Esportes',
    attendees: 45,
    capacity: 100,
    status: 'upcoming',
    icon: '⚽',
    color: '#10b981',
  },
  {
    id: 4,
    title: 'Yoga & Meditação',
    description: 'Aula de yoga e meditação para relaxar, rejuvenescer e conectar corpo e mente.',
    date: '2026-05-31',
    time: '07:00',
    location: 'Área Verde do Lago',
    category: 'Wellness',
    attendees: 32,
    capacity: 50,
    status: 'upcoming',
    icon: '🧘',
    color: '#8b5cf6',
  },
  {
    id: 5,
    title: 'Café da Comunidade',
    description: 'Encontro descontraído para os moradores se conhecerem e trocar experiências.',
    date: '2026-05-28',
    time: '10:00',
    location: 'Centro Comunitário',
    category: 'Social',
    attendees: 23,
    capacity: 80,
    status: 'upcoming',
    icon: '☕',
    color: '#ef4444',
  },
];

const CATEGORIES = ['Todas', 'Assembleia', 'Social', 'Esportes', 'Wellness'];

export const EventsCarousel = ({ isOpen, onClose, onJoin }: EventsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [category, setCategory] = useState('Todas');

  if (!isOpen) return null;

  const filtered = EVENTS.filter((e) => category === 'Todas' || e.category === category);
  const current = filtered[currentIndex % filtered.length];

  const next = () => setCurrentIndex((c) => (c + 1) % filtered.length);
  const prev = () => setCurrentIndex((c) => (c - 1 + filtered.length) % filtered.length);

  const eventDate = new Date(current.date);
  const isUpcoming = new Date(current.date) > new Date();

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
        {/* Event Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
            border: `1px solid ${current.color}40`,
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
              background: `linear-gradient(135deg, ${current.color}20, ${current.color}10)`,
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>
              {current.icon}
            </div>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: current.color,
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
                marginBottom: '12px',
              }}
            >
              {current.title}
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: 'rgba(255,255,255,.6)',
                lineHeight: 1.72,
                marginBottom: '40px',
              }}
            >
              {current.description}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '0 clamp(16px, 5vw, 40px) clamp(20px, 4vw, 40px)' }}>
            {/* Grid Info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {/* Date & Time */}
              <div
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(125,157,224,.1)',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar className="w-4 h-4" style={{ color: current.color }} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Data e Hora</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {eventDate.toLocaleDateString('pt-BR')}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', marginTop: '4px' }}>
                  às {current.time}h
                </p>
              </div>

              {/* Location */}
              <div
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(125,157,224,.1)',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin className="w-4 h-4" style={{ color: current.color }} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Local</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {current.location}
                </p>
              </div>
            </div>

            {/* Attendees */}
            <div
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(125,157,224,.1)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users className="w-4 h-4" style={{ color: current.color }} />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Confirmados</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ fontSize: '13px', color: '#fff' }}>
                  {current.attendees} de {current.capacity} confirmados
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)' }}>
                  {Math.round((current.attendees / current.capacity) * 100)}%
                </p>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255,255,255,.1)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(current.attendees / current.capacity) * 100}%`,
                    background: `linear-gradient(90deg, ${current.color}, ${current.color}dd)`,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (onJoin) onJoin(current);
                }}
                disabled={!isUpcoming}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '11px',
                  border: 'none',
                  background: isUpcoming
                    ? `linear-gradient(135deg, ${current.color}, ${current.color}dd)`
                    : 'rgba(255,255,255,.05)',
                  color: isUpcoming ? '#fff' : 'rgba(255,255,255,.4)',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: isUpcoming ? 'pointer' : 'not-allowed',
                  transition: 'all 0.18s',
                  opacity: isUpcoming ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (isUpcoming) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 36px ${current.color}42`;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {isUpcoming ? '✓ Participar' : 'Evento Encerrado'}
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
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
              📍 {current.location.split(' ')[0]}
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
              👥 {current.attendees} Confirmados
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
              🎟️ Aberto para Todos
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
