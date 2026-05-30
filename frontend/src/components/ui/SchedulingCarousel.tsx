import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

export interface SchedulingSlot {
  id: number;
  title: string;
  location: string;
  description: string;
  dates: string[];
  capacity: number;
  available: number;
  status: 'available' | 'full' | 'closed';
  icon: string;
}

interface SchedulingCarouselProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule?: (slot: SchedulingSlot) => void;
}

const SLOTS: SchedulingSlot[] = [
  {
    id: 1,
    title: 'Quadra de Futsal',
    location: 'Área de Esportes',
    description: 'Excelente para partidas e treinos',
    dates: ['Segunda a Sexta: 18h-22h', 'Sábado: 09h-18h', 'Domingo: 09h-18h'],
    capacity: 20,
    available: 8,
    status: 'available',
    icon: '⚽',
  },
  {
    id: 2,
    title: 'Sala de Reunião',
    location: 'Prédio Administrativo',
    description: 'Para reuniões e eventos pequenos',
    dates: ['Segunda a Sexta: 08h-18h'],
    capacity: 30,
    available: 0,
    status: 'full',
    icon: '🗣️',
  },
  {
    id: 3,
    title: 'Salão de Festas',
    location: 'Centro Comunitário',
    description: 'Para eventos grandes e celebrações',
    dates: ['Sexta a Domingo: 16h-23h'],
    capacity: 150,
    available: 12,
    status: 'available',
    icon: '🎉',
  },
  {
    id: 4,
    title: 'Piscina',
    location: 'Área de Lazer',
    description: 'Diversão e refrescância para toda família',
    dates: ['Terça a Domingo: 10h-18h'],
    capacity: 100,
    available: 45,
    status: 'available',
    icon: '🏊',
  },
  {
    id: 5,
    title: 'Área de Churrasco',
    location: 'Próximo ao Lago',
    description: 'Com churrasqueira e área verde',
    dates: ['Sábado e Domingo: 09h-18h'],
    capacity: 50,
    available: 0,
    status: 'full',
    icon: '🔥',
  },
];

export const SchedulingCarousel = ({ isOpen, onClose, onSchedule }: SchedulingCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const current = SLOTS[currentIndex % SLOTS.length];

  const next = () => setCurrentIndex((c) => (c + 1) % SLOTS.length);
  const prev = () => setCurrentIndex((c) => (c - 1 + SLOTS.length) % SLOTS.length);

  const statusColor = {
    available: '#10b981',
    full: '#ef4444',
    closed: '#f59e0b',
  };

  const statusText = {
    available: 'Disponível',
    full: 'Completo',
    closed: 'Fechado',
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
        {/* Scheduling Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
            border: '1px solid rgba(125,157,224,.12)',
            borderRadius: '28px',
            overflow: 'hidden',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)',
            boxShadow: '0 32px 96px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.055)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 'clamp(20px, 5vw, 40px) clamp(16px, 5vw, 40px) 0',
              background: `linear-gradient(135deg, rgba(16,185,129,.08), rgba(16,185,129,.05))`,
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
                color: '#10b981',
                marginBottom: '12px',
              }}
            >
              Agendamento
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
            {/* Location & Status */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(125,157,224,.1)',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin className="w-4 h-4" style={{ color: '#57d8ff' }} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Local</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {current.location}
                </p>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: `1px solid ${statusColor[current.status]}40`,
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', marginBottom: '8px' }}>
                  Status
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: statusColor[current.status] }}>
                  {statusText[current.status]}
                </p>
              </div>
            </div>

            {/* Schedule */}
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
                <Clock className="w-4 h-4" style={{ color: '#57d8ff' }} />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Horários</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {current.dates.map((date, idx) => (
                  <p key={idx} style={{ fontSize: '13px', color: '#fff' }}>
                    • {date}
                  </p>
                ))}
              </div>
            </div>

            {/* Capacity */}
            <div
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(125,157,224,.1)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', marginBottom: '12px' }}>
                Capacidade
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ fontSize: '13px', color: '#fff' }}>
                  {current.available} de {current.capacity} disponíveis
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)' }}>
                  {Math.round((current.available / current.capacity) * 100)}%
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
                    width: `${(current.available / current.capacity) * 100}%`,
                    background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (onSchedule) onSchedule(current);
                }}
                disabled={current.status !== 'available'}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '11px',
                  border: 'none',
                  background: current.status === 'available'
                    ? 'linear-gradient(135deg, #72e3ff, #669dff)'
                    : 'rgba(255,255,255,.05)',
                  color: current.status === 'available' ? '#07101c' : 'rgba(255,255,255,.4)',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: current.status === 'available' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.18s',
                  opacity: current.status === 'available' ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (current.status === 'available') {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 36px rgba(87,216,255,.42)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {current.status === 'available' ? 'Agendar Agora' : 'Indisponível'}
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
              📅 Flexível
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
              👥 {current.capacity} lugares
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
              ✅ Confirmação Rápida
            </div>
          </div>
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
            {SLOTS.map((_, idx) => (
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
