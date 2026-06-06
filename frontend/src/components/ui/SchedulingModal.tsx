import { useState } from 'react';
import { maskPhone } from '../../utils/format';
import { X, Calendar, Clock, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SchedulingSlot } from './SchedulingCarousel';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: SchedulingSlot | null;
  onConfirm?: (data: SchedulingFormData) => void;
}

export interface SchedulingFormData {
  slotId: number;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes: string;
}

export const SchedulingModal = ({ isOpen, onClose, slot, onConfirm }: SchedulingModalProps) => {
  const [formData, setFormData] = useState<SchedulingFormData>({
    slotId: slot?.id || 0,
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: 1,
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !slot) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'guests' ? parseInt(value) : name === 'phone' ? maskPhone(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simular envio
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setLoading(false);
    setSubmitted(true);

    if (onConfirm) onConfirm(formData);

    setTimeout(() => {
      setSubmitted(false);
      onClose();
      setFormData({
        slotId: slot.id,
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        guests: 1,
        notes: '',
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
              border: '1px solid rgba(125,157,224,.12)',
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
                  {slot.icon} Agendar: {slot.title}
                </h2>
                <p style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: 'rgba(255,255,255,.5)' }}>
                  Preencha os dados para confirmar sua reserva
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
                      (e.target as HTMLElement).style.borderColor = 'rgba(87,216,255,.3)';
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
                      (e.target as HTMLElement).style.borderColor = 'rgba(87,216,255,.3)';
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
                      (e.target as HTMLElement).style.borderColor = 'rgba(87,216,255,.3)';
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
                    name="guests"
                    value={formData.guests}
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
                      (e.target as HTMLElement).style.borderColor = 'rgba(87,216,255,.3)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                    }}
                  >
                    {Array.from({ length: Math.min(10, slot.capacity) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} style={{ background: '#0e1828' }}>
                        {n} {n === 1 ? 'pessoa' : 'pessoas'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
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
                    Data *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
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
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(87,216,255,.3)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                    }}
                  />
                </div>

                {/* Time */}
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
                    Horário *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
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
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(87,216,255,.3)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                      (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,.6)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Observações (opcional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Informações adicionais sobre sua reserva..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid rgba(125,157,224,.12)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    minHeight: '80px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'rgba(87,216,255,.3)';
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,.05)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'rgba(125,157,224,.12)';
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,.03)';
                  }}
                />
              </div>

              {/* Info Box */}
              <div
                style={{
                  background: 'rgba(16,185,129,.1)',
                  border: '1px solid rgba(16,185,129,.2)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle className="w-4 h-4" style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                  Você receberá uma confirmação por e-mail em breve. Se houver dúvidas, entre em contato com a administração.
                </p>
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
                    background: 'linear-gradient(135deg, #72e3ff, #669dff)',
                    color: '#07101c',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.18s',
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 36px rgba(87,216,255,.42)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {loading ? 'Confirmando...' : '✓ Confirmar Reserva'}
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
              border: '1px solid rgba(16,185,129,.3)',
              borderRadius: '24px',
              padding: 'clamp(32px, 8vw, 60px) clamp(24px, 6vw, 40px)',
              textAlign: 'center',
              boxShadow: '0 32px 96px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.055)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ fontSize: 'clamp(40px, 12vw, 56px)', marginBottom: 'clamp(12px, 3vw, 20px)' }}>✓</div>
            <h2 style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 900, color: '#10b981', marginBottom: 'clamp(8px, 2vw, 12px)' }}>
              Reserva Confirmada!
            </h2>
            <p style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginBottom: 'clamp(16px, 4vw, 24px)' }}>
              Sua reserva para <strong>{slot.title}</strong> foi confirmada com sucesso. Você receberá um e-mail de confirmação em breve.
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
