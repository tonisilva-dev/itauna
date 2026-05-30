import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showHeader?: boolean;
}

export const ModalContainer = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showHeader = true,
}: ModalContainerProps) => {
  if (!isOpen) return null;

  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className={`${sizeMap[size]} w-full relative`}
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
          border: '1px solid rgba(125,157,224,.12)',
          borderRadius: '24px',
          boxShadow: '0 32px 96px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.055)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          animation: 'fadeIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 28px 18px',
              borderBottom: '1px solid rgba(255,255,255,.04)',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {title}
            </h2>
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
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,.1)';
                el.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,.06)';
                el.style.color = 'rgba(255,255,255,.6)';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          style={{
            padding: '28px',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
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
