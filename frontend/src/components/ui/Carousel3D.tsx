/**
 * Carousel3D — Carrossel com perspectiva 3D (rotateY) ao estilo modeloTop.html
 * Slides: centro=ativo, laterais=rotacionados e escurecidos, demais ocultos.
 */
import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Slide3D {
  key: string;
  content: ReactNode;
}

interface Carousel3DProps {
  slides: Slide3D[];
  autoPlay?: boolean;
  interval?: number;
  height?: number | string;
  initialIndex?: number;
}

export const Carousel3D = ({
  slides,
  autoPlay = true,
  interval = 5000,
  height = 420,
  initialIndex = 0,
}: Carousel3DProps) => {
  const [cur, setCur] = useState(initialIndex);
  const total = slides.length;

  const goTo = useCallback((idx: number) => {
    setCur(((idx % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(cur + 1), [cur, goTo]);
  const prev = useCallback(() => goTo(cur - 1), [cur, goTo]);

  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(next, interval);
    return () => clearInterval(t);
  }, [autoPlay, interval, next]);

  /* position class logic (same as modeloTop.html) */
  function posOf(i: number): 'active' | 'prev' | 'next' | 'far' {
    const diff = ((i - cur) % total + total) % total;
    if (diff === 0) return 'active';
    if (diff === 1) return 'next';
    if (diff === total - 1) return 'prev';
    return 'far';
  }

  const transformFor = (pos: ReturnType<typeof posOf>) => {
    switch (pos) {
      case 'active':
        return 'translateX(-50%) rotateY(0deg) scale(1)';
      case 'prev':
        return 'translateX(calc(-50% - 46%)) rotateY(16deg) scale(.72)';
      case 'next':
        return 'translateX(calc(-50% + 46%)) rotateY(-16deg) scale(.72)';
      case 'far':
      default:
        return 'translateX(-50%) rotateY(0deg) scale(.5)';
    }
  };

  const stylesFor = (pos: ReturnType<typeof posOf>): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: '50%',
      top: 0,
      width: 'min(600px, 86vw)',
      height: '100%',
      transformOrigin: 'center center',
      transition: 'transform .72s cubic-bezier(.36,.07,.19,.97), opacity .72s cubic-bezier(.36,.07,.19,.97), filter .72s ease',
      borderRadius: 24,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.9), rgba(8,13,24,.97))',
      border: '1px solid rgba(125,157,224,.12)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055), 0 32px 96px rgba(0,0,0,.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      transform: transformFor(pos),
    };

    switch (pos) {
      case 'active':
        return {
          ...base,
          zIndex: 10,
          opacity: 1,
          filter: 'brightness(1) blur(0px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.065), 0 0 0 1px rgba(87,216,255,.08), 0 40px 110px rgba(0,0,0,.72), 0 0 70px rgba(87,216,255,.08)',
        };
      case 'prev':
      case 'next':
        return {
          ...base,
          zIndex: 3,
          opacity: 0.72,
          filter: 'brightness(.72) saturate(.8)',
        };
      case 'far':
      default:
        return {
          ...base,
          zIndex: 0,
          opacity: 0,
          pointerEvents: 'none',
        };
    }
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
    border: '1px solid rgba(125,157,224,.22)',
    background: 'rgba(13,20,35,.72)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--cyan)', display: 'grid', placeItems: 'center',
    transition: 'all .24s',
    zIndex: 20,
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 3D Stage */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? height : height,
        perspective: '2200px',
        perspectiveOrigin: '50% 48%',
      }}>
        {slides.map((slide, i) => {
          const pos = posOf(i);
          return (
            <div
              key={slide.key}
              style={stylesFor(pos)}
              onClick={() => pos !== 'active' && goTo(i)}
            >
              {/* Ambient tint */}
              <div aria-hidden style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle at 18% 0%, rgba(99,161,255,.13), transparent 30%), radial-gradient(circle at 88% 20%, rgba(25,194,255,.10), transparent 26%)',
              }} />
              <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>
                {slide.content}
              </div>
            </div>
          );
        })}

        {/* ← arrow — left side, vertically centered */}
        <button
          onClick={prev}
          style={{ ...arrowStyle, left: 'clamp(4px, 2vw, 16px)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.cssText += ';background:rgba(87,216,255,.16);border-color:var(--cyan);box-shadow:0 0 22px rgba(87,216,255,.38);transform:translateY(-50%) scale(1.08)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'rgba(13,20,35,.72)';
            el.style.borderColor = 'rgba(125,157,224,.22)';
            el.style.boxShadow = '';
            el.style.transform = 'translateY(-50%)';
          }}
        >
          <ChevronLeft size={18} />
        </button>

        {/* → arrow — right side, vertically centered */}
        <button
          onClick={next}
          style={{ ...arrowStyle, right: 'clamp(4px, 2vw, 16px)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.cssText += ';background:rgba(87,216,255,.16);border-color:var(--cyan);box-shadow:0 0 22px rgba(87,216,255,.38);transform:translateY(-50%) scale(1.08)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'rgba(13,20,35,.72)';
            el.style.borderColor = 'rgba(125,157,224,.22)';
            el.style.boxShadow = '';
            el.style.transform = 'translateY(-50%)';
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Dots — bottom center */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === cur ? 26 : 9,
              height: 9,
              borderRadius: i === cur ? 5 : '50%',
              background: i === cur ? 'var(--cyan)' : 'rgba(255,255,255,.2)',
              border: `1px solid ${i === cur ? 'var(--cyan)' : 'rgba(87,216,255,.28)'}`,
              boxShadow: i === cur ? '0 0 14px rgba(87,216,255,.65)' : 'none',
              cursor: 'pointer',
              transition: 'all .3s',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};
