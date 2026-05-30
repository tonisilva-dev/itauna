import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export interface CarouselPhoto {
  id: number;
  src: string;
  caption: string;
  category: string;
}

interface GalleryCarouselProps {
  isOpen: boolean;
  onClose: () => void;
  photos: CarouselPhoto[];
  initialIndex?: number;
}

export const GalleryCarousel = ({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
}: GalleryCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [category, setCategory] = useState('Todas');

  const categories = ['Todas', 'Natureza', 'Infraestrutura', 'Lazer', 'Esportes', 'Eventos'];
  const filtered = photos.filter(p => category === 'Todas' || p.category === category);
  const current = filtered[currentIndex % filtered.length];

  const next = () => setCurrentIndex((c) => (c + 1) % filtered.length);
  const prev = () => setCurrentIndex((c) => (c - 1 + filtered.length) % filtered.length);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-60"
        style={{
          width: 'clamp(36px, 10vw, 44px)',
          height: 'clamp(36px, 10vw, 44px)',
          borderRadius: '12px',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,.1)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)';
        }}
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div
        className="w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main image */}
        <div
          style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            aspectRatio: '16/9',
            marginBottom: '20px',
          }}
        >
          <img
            src={current.src}
            alt={current.caption}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />

          {/* Navigation arrows */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,.2)',
              color: '#57d8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)';
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,.2)',
              color: '#57d8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)';
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Info overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              padding: '24px',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    background: 'rgba(87,216,255,.2)',
                    color: '#00e5e5',
                    border: '1px solid rgba(87,216,255,.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '8px',
                  }}
                >
                  {current.category}
                </span>
                <p style={{ fontSize: '18px', fontWeight: 600 }}>{current.caption}</p>
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                {currentIndex + 1} / {filtered.length}
              </span>
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setCurrentIndex(0);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: cat === category ? '#57d8ff' : 'rgba(255,255,255,.08)',
                color: cat === category ? '#0a0f1e' : 'rgba(255,255,255,.6)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (cat !== category) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (cat !== category) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)';
                }
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Thumbnail strip */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollBehavior: 'smooth',
          }}
        >
          {filtered.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                flex: '0 0 80px',
                height: '80px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: idx === currentIndex ? '2px solid #57d8ff' : '1px solid rgba(255,255,255,.1)',
                cursor: 'pointer',
                opacity: idx === currentIndex ? 1 : 0.6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = idx === currentIndex ? '1' : '0.6';
              }}
            >
              <img
                src={photo.src}
                alt={photo.caption}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
