import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Play, Pause, Maximize2 } from 'lucide-react';

export interface CarouselPhoto {
  id: number;
  src: string;
  caption: string;
  category: string;
}

// ─────────────────────────────────────────────
// LIGHTBOX — fullscreen overlay com swipe
// ─────────────────────────────────────────────
interface LightboxProps {
  photos: CarouselPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export const Lightbox = ({ photos, initialIndex, onClose }: LightboxProps) => {
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const touchStart = useRef<number | null>(null);

  const prev = useCallback(() => setIndex(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIndex(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    touchStart.current = null;
  };

  const photo = photos[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(16px)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Contador */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <span style={{ fontSize: '0.813rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          {index + 1} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span> {photos.length}
        </span>
      </div>

      {/* Botão prev */}
      <button
        onClick={prev}
        className="absolute left-3 sm:left-6 z-10 w-11 h-11 rounded-xl flex items-center justify-center transition-all"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      {/* Imagem principal */}
      <div className="relative flex flex-col items-center px-16 max-w-5xl w-full">
        <div className="relative" style={{ maxHeight: '75vh' }}>
          {!loaded[index] && (
            <div className="absolute inset-0 rounded-2xl"
              style={{ background: '#1a2235', minWidth: 300, minHeight: 200 }} />
          )}
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.caption}
            onLoad={() => setLoaded(p => ({ ...p, [index]: true }))}
            style={{
              maxHeight: '75vh',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '1rem',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
              display: 'block',
              opacity: loaded[index] ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        </div>

        {/* Caption */}
        <div className="mt-4 text-center">
          <p style={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>{photo.caption}</p>
          <span
            className="inline-block mt-2 px-3 py-1 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(0,200,200,0.15)', color: '#00e5e5', border: '1px solid rgba(0,200,200,0.25)' }}
          >
            {photo.category}
          </span>
        </div>
      </div>

      {/* Botão next */}
      <button
        onClick={next}
        className="absolute right-3 sm:right-6 z-10 w-11 h-11 rounded-xl flex items-center justify-center transition-all"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Thumbnails */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 rounded-2xl"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.07)',
          maxWidth: 'calc(100vw - 2rem)',
          overflowX: 'auto',
        }}
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            style={{
              width: 44,
              height: 32,
              borderRadius: '0.375rem',
              overflow: 'hidden',
              flexShrink: 0,
              border: i === index ? '2px solid #00c8c8' : '2px solid transparent',
              opacity: i === index ? 1 : 0.5,
              transition: 'all 0.2s ease',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <img src={p.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// HERO CAROUSEL — slider principal
// ─────────────────────────────────────────────
interface HeroCarouselProps {
  photos: CarouselPhoto[];
  onOpenLightbox: (index: number) => void;
}

export const HeroCarousel = ({ photos, onOpenLightbox }: HeroCarouselProps) => {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => setCurrent(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % photos.length), [photos.length]);

  // Autoplay
  useEffect(() => {
    if (playing && !dragging) {
      intervalRef.current = setInterval(next, 2200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, dragging, next]);

  // Drag/swipe
  const startDrag = (x: number) => { setDragging(true); setDragStart(x); setDragOffset(0); };
  const moveDrag = (x: number) => { if (dragging) setDragOffset(x - dragStart); };
  const endDrag = () => {
    if (Math.abs(dragOffset) > 60) dragOffset < 0 ? next() : prev();
    setDragging(false);
    setDragOffset(0);
  };

  const photo = photos[current];

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ borderRadius: '1.25rem', background: '#0d1425', aspectRatio: '16/3.5', minHeight: 140, maxHeight: 260 }}
      onMouseDown={e => startDrag(e.clientX)}
      onMouseMove={e => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={() => { if (dragging) endDrag(); }}
      onTouchStart={e => startDrag(e.touches[0].clientX)}
      onTouchMove={e => moveDrag(e.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      {/* Slides */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          width: `${photos.length * 100}%`,
          height: '100%',
          transform: `translateX(calc(-${current * (100 / photos.length)}% + ${dragOffset}px))`,
          transition: dragging ? 'none' : 'transform 0.55s cubic-bezier(0.77, 0, 0.18, 1)',
        }}
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            style={{ width: `${100 / photos.length}%`, position: 'relative', flexShrink: 0, overflow: 'hidden' }}
          >
            <img
              src={p.src}
              alt={p.caption}
              draggable={false}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 6s ease',
                transform: i === current ? 'scale(1.06)' : 'scale(1)',
              }}
            />
            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
            }} />
          </div>
        ))}
      </div>

      {/* Caption overlay */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 2rem',
          transition: 'opacity 0.4s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <span
              style={{
                display: 'inline-block', background: 'rgba(0,200,200,0.2)',
                color: '#00e5e5', border: '1px solid rgba(0,200,200,0.35)',
                borderRadius: '0.5rem', padding: '0.2rem 0.6rem',
                fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              {photo.category}
            </span>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {photo.caption}
            </p>
          </div>
          <button
            onClick={() => onOpenLightbox(current)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              background: 'rgba(0,200,200,0.15)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,200,200,0.3)', borderRadius: '0.625rem',
              padding: '0.5rem 0.875rem', color: '#00e5e5', fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.15)')}
          >
            <Maximize2 style={{ width: 14, height: 14 }} />
            Ver em tela cheia
          </button>
        </div>
      </div>

      {/* Navegação */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        style={{
          position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
          width: 40, height: 40, borderRadius: '0.75rem',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
      >
        <ChevronLeft style={{ width: 18, height: 18, color: '#fff' }} />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        style={{
          position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
          width: 40, height: 40, borderRadius: '0.75rem',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
      >
        <ChevronRight style={{ width: 18, height: 18, color: '#fff' }} />
      </button>

      {/* Play/Pause */}
      <button
        onClick={() => setPlaying(p => !p)}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          width: 34, height: 34, borderRadius: '0.625rem',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,200,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
        title={playing ? 'Pausar apresentação' : 'Iniciar apresentação'}
      >
        {playing
          ? <Pause style={{ width: 14, height: 14, color: '#fff' }} />
          : <Play style={{ width: 14, height: 14, color: '#fff' }} />}
      </button>

      {/* Dots / Progress */}
      <div style={{
        position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '0.375rem', alignItems: 'center',
      }}>
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              height: 4, borderRadius: 9999,
              background: i === current ? '#00c8c8' : 'rgba(255,255,255,0.3)',
              border: 'none', cursor: 'pointer', padding: 0,
              width: i === current ? 24 : 8,
              transition: 'all 0.3s ease',
              boxShadow: i === current ? '0 0 8px rgba(0,200,200,0.6)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// THUMBNAIL STRIP — faixa horizontal rolável
// ─────────────────────────────────────────────
interface ThumbnailStripProps {
  photos: CarouselPhoto[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
}

export const ThumbnailStrip = ({ photos, activeIndex, onSelect }: ThumbnailStripProps) => (
  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}
    className="scrollbar-hide">
    {photos.map((photo, i) => (
      <button
        key={photo.id}
        onClick={() => onSelect(i)}
        style={{
          flexShrink: 0,
          width: 96, height: 68,
          borderRadius: '0.625rem',
          overflow: 'hidden',
          border: activeIndex === i ? '2px solid #00c8c8' : '2px solid rgba(255,255,255,0.07)',
          opacity: activeIndex === null || activeIndex === i ? 1 : 0.55,
          transition: 'all 0.25s ease',
          cursor: 'pointer',
          padding: 0,
          position: 'relative',
          boxShadow: activeIndex === i ? '0 0 12px rgba(0,200,200,0.35)' : 'none',
        }}
        onMouseEnter={e => { if (activeIndex !== i) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
        onMouseLeave={e => { if (activeIndex !== i) (e.currentTarget as HTMLButtonElement).style.opacity = activeIndex === null ? '1' : '0.55'; }}
      >
        <img src={photo.src} alt={photo.caption}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {activeIndex === i && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,200,200,0.12)',
          }} />
        )}
      </button>
    ))}
  </div>
);
