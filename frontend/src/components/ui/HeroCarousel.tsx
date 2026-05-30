import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface HeroSlide {
  title: string;
  subtitle?: string;
  tag?: string;
  gradient: string;        // CSS gradient string
  accentColor?: string;
  icon?: React.ReactNode;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  height?: number;
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

export const HeroCarousel = ({
  slides,
  height = 200,
  autoPlay = true,
  interval = 4500,
  className = '',
}: HeroCarouselProps) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const go = useCallback(
    (idx: number) => {
      if (animating) return;
      setAnimating(true);
      setCurrent((idx + slides.length) % slides.length);
      setTimeout(() => setAnimating(false), 350);
    },
    [animating, slides.length]
  );

  useEffect(() => {
    if (!autoPlay || slides.length < 2) return;
    const t = setInterval(() => go(current + 1), interval);
    return () => clearInterval(t);
  }, [autoPlay, current, go, interval, slides.length]);

  const slide = slides[current];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ height, minHeight: height }}
    >
      {/* Background */}
      <div
        key={current}
        className="absolute inset-0 transition-opacity duration-350"
        style={{
          background: slide.gradient,
          opacity: animating ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* Overlay pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 60%),
                          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.03) 0%, transparent 50%)`,
      }} />

      {/* Grid lines */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col justify-end h-full px-6 py-5"
        style={{ opacity: animating ? 0 : 1, transition: 'opacity 0.35s ease' }}
      >
        {slide.tag && (
          <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2"
            style={{ background: 'rgba(0,200,200,0.15)', color: '#00e5e5', border: '1px solid rgba(0,200,200,0.25)' }}>
            {slide.tag}
          </span>
        )}
        {slide.icon && (
          <div className="mb-2 opacity-80">{slide.icon}</div>
        )}
        <h2 className="text-white font-bold leading-tight"
          style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
            {slide.subtitle}
          </p>
        )}
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => go(current - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 rounded-full flex items-center justify-center transition-all"
            style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => go(current + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 rounded-full flex items-center justify-center transition-all"
            style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                borderRadius: 9999,
                background: i === current ? '#00c8c8' : 'rgba(255,255,255,0.3)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
