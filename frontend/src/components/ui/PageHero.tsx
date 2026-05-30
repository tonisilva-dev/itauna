import { PhotoCarousel } from './PhotoCarousel';

/* Fotos reais da galeria — nomes exatos do filesystem */
const ALL_PHOTOS = [
  '/galeria/unnamed.webp',
  '/galeria/unnamed-1.webp',
  '/galeria/unnamed-2.webp',
  '/galeria/unnamed-3.webp',
  '/galeria/unnamed-4.webp',
  '/galeria/unnamed-5.webp',
  '/galeria/unnamed-6.webp',
  '/galeria/unnamed-7.webp',
  '/galeria/unnamed-8.webp',
  '/galeria/unnamed-9.webp',
  '/galeria/unnamed-10.webp',
  '/galeria/unnamed-11.webp',
  '/galeria/unnamed-12.webp',
];

/** Rotaciona o array para cada seção começar numa foto diferente */
const rotated = (offset: number) => [
  ...ALL_PHOTOS.slice(offset),
  ...ALL_PHOTOS.slice(0, offset),
];

export interface PageHeroProps {
  tag?: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  photoOffset?: number;   // índice inicial das fotos (rotação por página)
  /** altura responsiva — padrão: clamp(220px, 38vh, 400px) */
  height?: string;
}

/**
 * Hero carrossel full-width para cada seção do menu.
 * Deve ser renderizado como PRIMEIRO filho da página,
 * sem wrapper de padding (o AppLayout não aplica padding ao Outlet).
 */
export const PageHero = ({
  tag,
  title,
  subtitle,
  accentColor = '#00e5e5',
  photoOffset = 0,
  height = 'clamp(200px, 38vh, 400px)',
}: PageHeroProps) => {
  const photos = rotated(photoOffset % ALL_PHOTOS.length);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <PhotoCarousel
        images={photos}
        height="100%"
        interval={7000}
        transitionDuration={2800}
        overlayGradient={
          'linear-gradient(to bottom,' +
          'rgba(8,13,26,0.42) 0%,' +
          'rgba(8,13,26,0.55) 40%,' +
          'rgba(8,13,26,0.82) 75%,' +
          'rgba(8,13,26,0.97) 100%)'
        }
      />

      {/* Conteúdo sobreposto */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 6,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: 'clamp(1.25rem, 4vw, 2.5rem)',
        pointerEvents: 'none',
      }}>
        {tag && (
          <span style={{
            display: 'inline-flex', width: 'fit-content',
            alignItems: 'center',
            padding: '3px 12px', borderRadius: 20,
            fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}35`,
            color: accentColor,
            marginBottom: 10,
          }}>
            {tag}
          </span>
        )}
        <h1 style={{
          fontSize: 'clamp(1.35rem, 4vw, 2.2rem)',
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.2,
          textShadow: '0 4px 24px rgba(0,0,0,0.85)',
          marginBottom: subtitle ? 8 : 0,
          maxWidth: 700,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
            color: 'rgba(255,255,255,0.7)',
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            maxWidth: 560,
            lineHeight: 1.6,
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
