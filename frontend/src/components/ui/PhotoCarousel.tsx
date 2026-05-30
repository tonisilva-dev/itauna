import { useState, useEffect, useRef } from 'react';

interface PhotoCarouselProps {
  images: string[];
  height?: string | number;
  interval?: number;
  transitionDuration?: number;
  className?: string;
  overlay?: boolean;
  overlayGradient?: string;
}

/** Encapsula path em url('...') — resolve espaços e parênteses em nomes de arquivo */
const cssUrl = (path: string) =>
  `url('${path.replace(/\\/g, '/').replace(/'/g, "\\'")}')`;

export const PhotoCarousel = ({
  images,
  height = 320,
  interval = 7000,
  transitionDuration = 2800,
  className = '',
  overlay = true,
  overlayGradient = [
    'linear-gradient(to bottom,',
    'rgba(8,13,26,0.42) 0%,',
    'rgba(8,13,26,0.58) 45%,',
    'rgba(8,13,26,0.84) 75%,',
    'rgba(8,13,26,0.97) 100%)',
  ].join(''),
}: PhotoCarouselProps) => {
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState<number | null>(null);
  const [showB,   setShowB] = useState(false);
  const mountedRef  = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef    = useRef<number | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current)    clearTimeout(timerRef.current);
      if (frameRef.current)    cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    if (images.length < 2) return;

    const transition = (nextIdx: number) => {
      if (!mountedRef.current) return;
      setIndexB(nextIdx);
      setShowB(false);

      // double-rAF garante que o browser registrou opacity:0 antes de animar
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          setShowB(true);
          timerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setIndexA(nextIdx);
            setIndexB(null);
            setShowB(false);
          }, transitionDuration + 60);
        });
      });
    };

    intervalRef.current = setInterval(() => {
      setIndexA(prev => {
        const next = (prev + 1) % images.length;
        transition(next);
        return prev; // não altera ainda — a transição atualiza via setTimeout
      });
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current)    clearTimeout(timerRef.current);
      if (frameRef.current)    cancelAnimationFrame(frameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, interval, transitionDuration]);

  const h      = typeof height === 'number' ? `${height}px` : height;
  const dotIdx = indexB !== null ? indexB : indexA;

  const goTo = (i: number) => {
    if (i === indexA) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current)    clearTimeout(timerRef.current);
    if (frameRef.current)    cancelAnimationFrame(frameRef.current);
    setIndexB(i);
    setShowB(false);
    frameRef.current = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        setShowB(true);
        timerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setIndexA(i);
          setIndexB(null);
          setShowB(false);
        }, transitionDuration + 60);
      })
    );
  };

  return (
    <div
      className={`relative overflow-hidden w-full select-none ${className}`}
      style={{ height: h }}
    >
      {/* Camada A — sempre visível */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        backgroundImage: cssUrl(images[indexA]),
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }} />

      {/* Camada B — cross-fade lento */}
      {indexB !== null && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          backgroundImage: cssUrl(images[indexB]),
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          opacity: showB ? 1 : 0,
          transition: showB ? `opacity ${transitionDuration}ms ease-in-out` : 'none',
        }} />
      )}

      {/* Overlay escuro com degradê */}
      {overlay && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: overlayGradient,
        }} />
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 4, display: 'flex', alignItems: 'center', gap: 7,
        }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{
              width: i === dotIdx ? 20 : 5, height: 5,
              borderRadius: 9999,
              background: i === dotIdx ? '#00c8c8' : 'rgba(255,255,255,0.32)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.4s ease',
              boxShadow: i === dotIdx ? '0 0 10px rgba(0,200,200,0.75)' : 'none',
            }} />
          ))}
        </div>
      )}
    </div>
  );
};
