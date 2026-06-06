import { useState } from 'react';
import { maskPhone } from '../../utils/format';
import { X, User, Mail, Phone, Home, Save, AlertCircle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: ProfileData) => void;
}

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  unitNumber: string;
  cpf: string;
  birthDate: string;
  profession: string;
}

export const ProfileModal = ({ isOpen, onClose, onSave }: ProfileModalProps) => {
  const [formData, setFormData] = useState<ProfileData>({
    fullName: 'João Silva Santos',
    email: 'joao.silva@email.com',
    phone: '(11) 98765-4321',
    unitNumber: 'Chácara 045',
    cpf: '123.456.789-10',
    birthDate: '1985-06-15',
    profession: 'Engenheiro',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'phone' ? maskPhone(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setLoading(false);
    setSubmitted(true);

    if (onSave) onSave(formData);

    setTimeout(() => {
      setSubmitted(false);
      onClose();
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
        className="w-full max-w-2xl my-4 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {!submitted ? (
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
              border: '1px solid rgba(87,216,255,.12)',
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
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 28px)',
                borderBottom: '1px solid rgba(255,255,255,.04)',
                background: 'linear-gradient(135deg, rgba(87,216,255,.08), rgba(90,132,255,.05))',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 'clamp(40px, 10vw, 48px)',
                    height: 'clamp(40px, 10vw, 48px)',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #72e3ff, #669dff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#07101c',
                    flexShrink: 0,
                  }}
                >
                  <User className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                      fontWeight: 800,
                      color: '#fff',
                      marginBottom: '2px',
                      overflowWrap: 'break-word',
                    }}
                  >
                    Meu Perfil
                  </h2>
                  <p style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: 'rgba(255,255,255,.5)' }}>
                    Atualize suas informações pessoais
                  </p>
                </div>
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
              {/* Info Box */}
              <div
                style={{
                  background: 'rgba(87,216,255,.1)',
                  border: '1px solid rgba(87,216,255,.2)',
                  borderRadius: '10px',
                  padding: 'clamp(10px, 2vw, 12px)',
                  marginBottom: 'clamp(16px, 4vw, 24px)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle className="w-4 h-4" style={{ color: '#57d8ff', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                  Alguns campos não podem ser modificados por motivos de segurança. Entre em contato com a administração para alterar CPF ou unidade.
                </p>
              </div>

              {/* Section 1: Personal Info */}
              <div style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
                <h3 style={{ fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: 700, color: '#57d8ff', marginBottom: 'clamp(8px, 2vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Informações Pessoais
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(12px, 3vw, 16px)' }}>
                  {/* Full Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
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
                      name="fullName"
                      value={formData.fullName}
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

                  {/* Birth Date */}
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
                      Data de Nascimento *
                    </label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
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

                  {/* Profession */}
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
                      Profissão
                    </label>
                    <input
                      type="text"
                      name="profession"
                      value={formData.profession}
                      onChange={handleChange}
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
                </div>
              </div>

              {/* Section 2: Property Info */}
              <div style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
                <h3 style={{ fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: 700, color: '#10b981', marginBottom: 'clamp(8px, 2vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Informações da Unidade
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(12px, 3vw, 16px)' }}>
                  {/* Unit Number - Disabled */}
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
                      Número da Unidade
                    </label>
                    <input
                      type="text"
                      name="unitNumber"
                      value={formData.unitNumber}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255,255,255,.02)',
                        border: '1px solid rgba(125,157,224,.08)',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,.5)',
                        fontSize: '13px',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>

                  {/* CPF - Disabled */}
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
                      CPF
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255,255,255,.02)',
                        border: '1px solid rgba(125,157,224,.08)',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,.5)',
                        fontSize: '13px',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>
                </div>
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
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
                  <Save className="w-4 h-4" />
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
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
              Perfil Atualizado!
            </h2>
            <p style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginBottom: 'clamp(16px, 4vw, 24px)' }}>
              Suas alterações foram salvas com sucesso. Os dados foram atualizados em nosso sistema.
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
