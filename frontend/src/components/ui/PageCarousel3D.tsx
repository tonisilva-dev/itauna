import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PageCarousel3D.css';

export interface SlideItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface PageCarousel3DProps {
  slides: SlideItem[];
  initialIndex?: number;
  autoPlay?: boolean;
  interval?: number;
}

export const PageCarousel3D: React.FC<PageCarousel3DProps> = ({
  slides,
  initialIndex = 0,
  autoPlay = false,
  interval = 6000,
}) => {
  const [cur, setCur] = useState(initialIndex);
  const total = slides.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isSwiping = useRef<boolean>(false); // flag: diferencia swipe de tap

  const goTo = useCallback((idx: number) => {
    setCur(((idx % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(cur + 1), [cur, goTo]);
  const prev = useCallback(() => goTo(cur - 1), [cur, goTo]);

  const startAuto = useCallback(() => {
    if (!autoPlay) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, interval);
  }, [autoPlay, interval, next]);

  const stopAuto = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetAuto = useCallback(() => {
    stopAuto();
    startAuto();
  }, [stopAuto, startAuto]);

  useEffect(() => {
    startAuto();
    return () => stopAuto();
  }, [startAuto, stopAuto]);

  // Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { next(); resetAuto(); }
      if (e.key === 'ArrowLeft')  { prev(); resetAuto(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev, resetAuto]);

  // Evento customizado — permite que slides naveguem sem querySelector
  useEffect(() => {
    const handle = (e: Event) => {
      const idx = (e as CustomEvent<number>).detail;
      goTo(idx);
      resetAuto();
    };
    window.addEventListener('carousel-goto', handle);
    return () => window.removeEventListener('carousel-goto', handle);
  }, [goTo, resetAuto]);

  // ──────────────────────────────────────────────────────────
  //  TOUCH — FIX CRÍTICO:
  //  Se o toque começou em elemento interativo (button, a,
  //  input, etc.), marcamos isSwiping=false e saímos sem
  //  registrar coordenadas. Assim o tap chega normalmente
  //  ao elemento filho (login, galeria, etc.)
  // ──────────────────────────────────────────────────────────
  const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [tabindex]';

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE)) {
      isSwiping.current = false;
      return; // não intercepta — deixa o click chegar ao filho
    }
    isSwiping.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current   = e.touches[0].clientX;
    stopAuto();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
      resetAuto();
    } else {
      startAuto();
    }
  };

  // Posições 3D
  const posClassOf = (i: number): string => {
    const diff = ((i - cur) % total + total) % total;
    if (diff === 0) return 'pos-active';
    if (diff === 1) return 'pos-next';
    if (diff === total - 1) return 'pos-prev';
    return diff <= Math.floor(total / 2) ? 'pos-far-next' : 'pos-far-prev';
  };

  return (
    <div className="page-stage-wrap">
      {/* 3D Stage */}
      <div
        className="page-stage"
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, i) => {
          const posClass = posClassOf(i);
          const isActive = posClass === 'pos-active';

          return (
            <div
              key={slide.key}
              className={`page-slide ${posClass}`}
              onClick={() => {
                if (!isActive) { goTo(i); resetAuto(); }
              }}
            >
              <span className="page-slide-label">{slide.label}</span>
              <div className="page-slide-inner-content">
                {slide.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controles */}
      <div className="page-carousel-controls">
        <button
          className="page-ctrl-btn"
          onClick={() => { prev(); resetAuto(); }}
          aria-label="Slide anterior"
        >
          ←
        </button>
        <div className="page-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`page-dot ${i === cur ? 'on' : ''}`}
              onClick={() => { goTo(i); resetAuto(); }}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          className="page-ctrl-btn"
          onClick={() => { next(); resetAuto(); }}
          aria-label="Próximo slide"
        >
          →
        </button>
      </div>
    </div>
  );
};
