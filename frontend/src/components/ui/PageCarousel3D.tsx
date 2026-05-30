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
  const touchStartY = useRef<number>(0);
  const touchEndX   = useRef<number>(0);
  const isSwiping   = useRef<boolean>(false);
  const swipeDir    = useRef<'h' | 'v' | null>(null); // h=horizontal, v=vertical

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
  //  TOUCH — dois fixes críticos:
  //  1. Elementos interativos (button, a, input…) não são
  //     interceptados — o tap chega ao filho normalmente.
  //  2. Gestos VERTICAIS (scroll de conteúdo) também não são
  //     interceptados: na primeira movimentação significativa
  //     (>8 px), detectamos a direção dominante. Se for
  //     vertical, abortamos o swipe e o scroll nativo funciona.
  //     Só gestos horizontais trocam de slide.
  // ──────────────────────────────────────────────────────────
  const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [tabindex]';

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE)) {
      isSwiping.current = false;
      return;
    }
    isSwiping.current   = true;
    swipeDir.current    = null;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current   = e.touches[0].clientX;
    stopAuto();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Determina direção na primeira movimentação significativa
    if (swipeDir.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeDir.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }

    // Gesto vertical → aborta swipe e deixa scroll nativo agir
    if (swipeDir.current === 'v') {
      isSwiping.current = false;
      return;
    }

    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    if (swipeDir.current !== 'h') { startAuto(); return; }
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
