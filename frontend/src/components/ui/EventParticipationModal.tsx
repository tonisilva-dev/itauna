import { useState } from 'react';
import { X, Users, Check, AlertCircle } from 'lucide-react';
import type { Event } from './EventsCarousel';

interface EventParticipationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onConfirm?: (data: EventParticipationData) => void;
}

export interface EventParticipationData {
  eventId: number;
  name: string;
  email: string;
  phone: string;
  numberOfGuests: number;
  dietaryRestrictions: string;
  specialNeeds: string;
}

export const EventParticipationModal = ({
  isOpen,
  onClose,
  event,
  onConfirm,
}: EventParticipationModalProps) => {
  const [formData, setFormData] = useState<EventParticipationData>({
    eventId: event?.id || 0,
    name: '',
    email: '',
    phone: '',
    numberOfGuests: 1,
    dietaryRestrictions: '',
    specialNeeds: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !event) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'numberOfGuests' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setLoading(false);
    setSubmitted(true);

    if (onConfirm) onConfirm(formData);

    setTimeout(() => {
      setSubmitted(false);
      onClose();
      setFormData({
        eventId: event.id,
        name: '',
        email: '',
        phone: '',
        numberOfGuests: 1,
        dietaryRestrictions: '',
        specialNeeds: '',
      });
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
      style={{
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl my-4 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {!submitted ? (
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
              border: `1px solid ${event.color}40`,
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 32px 96px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.055)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 28px)',
                borderBottom: '1px solid rgba(255,255,255,.04)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                    fontWeight: 800,
                    color: '#fff',
                    marginBottom: '4px',
                    overflowWrap: 'break-word',
                  }}
                >
                  {event.icon} Participar de {event.title}
                </h2>
                <p style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: 'rgba(255,255,255,.5)' }}>
                  Confirme sua presença no evento
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.09)',
                  borderRadius: '10px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,.6)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.1)';
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.6)';
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Box */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '16px 28px',
                background: `${event.color}10`,
                borderBottom: '1px solid rgba(255,255,255,.04)',
              }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: event.color, flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                  {event.date} • {event.time}h
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)' }}>
                  📍 {event.location}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: 'clamp(16px, 4vw, 28px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(12px, 3vw, 16px)', marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                {/* Name */}
                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,.6)',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,.03)',
                      border: '1px solid rgba(125,157,224,.12)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = `${event.color}50`;
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,.6)',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    E-mail *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,.03)',
                      border: '1px solid rgba(125,157,224,.12)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = `${event.color}50`;
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,.6)',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,.03)',
                      border: '1px solid rgba(125,157,224,.12)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = `${event.color}50`;
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                    }}
                  />
                </div>

                {/* Guests */}
                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,.6)',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    Quantas Pessoas? *
                  </label>
                  <select
                    name="numberOfGuests"
                    value={formData.numberOfGuests}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,.03)',
                      border: '1px solid rgba(125,157,224,.12)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = `${event.color}50`;
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                    }}
                  >
                    {Array.from({ length: Math.min(5, event.capacity) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} style={{ background: '#0e1828' }}>
                        {n} {n === 1 ? 'pessoa' : 'pessoas'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,.6)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Restrições Alimentares
                </label>
                <textarea
                  name="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={handleChange}
                  placeholder="Ex: Vegetariano, Intolerância a glúten..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid rgba(125,157,224,.12)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    minHeight: '60px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = `${event.color}50`;
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                  }}
                />
              </div>

              {/* Special Needs */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,.6)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Necessidades Especiais
                </label>
                <textarea
                  name="specialNeeds"
                  value={formData.specialNeeds}
                  onChange={handleChange}
                  placeholder="Informações importantes para sua participação..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid rgba(125,157,224,.12)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    minHeight: '60px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = `${event.color}50`;
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '11px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${event.color}, ${event.color}dd)`,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.18s',
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 36px ${event.color}42`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {loading ? 'Confirmando...' : '✓ Confirmar Presença'}
                </button>
                <button
                  type="button"
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
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success State */
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
              border: `1px solid ${event.color}40`,
              borderRadius: '24px',
              padding: 'clamp(32px, 8vw, 60px) clamp(24px, 6vw, 40px)',
              textAlign: 'center',
              boxShadow: '0 32px 96px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.055)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ fontSize: 'clamp(40px, 12vw, 56px)', marginBottom: 'clamp(12px, 3vw, 20px)' }}>{event.icon}</div>
            <h2 style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 900, color: event.color, marginBottom: 'clamp(8px, 2vw, 12px)' }}>
              Presença Confirmada!
            </h2>
            <p style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginBottom: 'clamp(16px, 4vw, 24px)' }}>
              Sua participação em <strong>{event.title}</strong> foi confirmada. Você receberá um lembrete por e-mail 24h antes do evento.
            </p>
            <p style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: 'rgba(255,255,255,.5)' }}>
              Fechando automaticamente...
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
