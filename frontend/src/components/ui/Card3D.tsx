/**
 * Card3D — Glassmorphism card com efeito de tilt 3D ao hover (mouse parallax).
 * Baseado no design system de modeloTop.html
 */
import { useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';

interface Card3DProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  glowColor?: string;    // rgba ou hex — cor do glow no hover
  intensity?: number;    // graus máx de rotação (default 8)
  onClick?: () => void;
}

export const Card3D = ({
  children,
  className = '',
  style,
  glowColor = 'rgba(87,216,255,.18)',
  intensity = 8,
  onClick,
}: Card3DProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;   // -0.5 … 0.5
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * intensity).toFixed(2)}deg) rotateY(${(x * intensity).toFixed(2)}deg) translateZ(8px)`;
    el.style.boxShadow = `
      inset 0 1px 0 rgba(255,255,255,.07),
      0 24px 64px rgba(0,0,0,.55),
      0 0 0 1px rgba(87,216,255,.10),
      0 0 40px ${glowColor}
    `;
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    el.style.boxShadow = '';
    el.style.transition = 'transform 0.6s cubic-bezier(.22,.68,0,1.2), box-shadow 0.5s ease';
  };

  const handleMouseEnter = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'none';
  };

  return (
    <div
      ref={ref}
      className={`card ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.6s cubic-bezier(.22,.68,0,1.2), box-shadow 0.5s ease',
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={onClick}
    >
      {/* Inner shine layer — moves with the tilt */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.06), transparent 55%)',
          pointerEvents: 'none', zIndex: 1,
          transform: 'translateZ(1px)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
};
