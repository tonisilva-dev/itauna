import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface Props {
  before: string;
  after: string;
  labelBefore?: string;
  labelAfter?: string;
}

export const BeforeAfterSlider = ({
  before, after,
  labelBefore = 'ANTES',
  labelAfter  = 'DEPOIS',
}: Props) => {
  const [pos, setPos]       = useState(50); // 0-100%
  const containerRef        = useRef<HTMLDivElement>(null);
  const dragging            = useRef(false);

  const clamp = (v: number) => Math.max(5, Math.min(95, v));

  const getPos = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return pos;
    return clamp(((clientX - rect.left) / rect.width) * 100);
  }, [pos]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    setPos(getPos(e.clientX));
  }, [getPos]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    setPos(getPos(e.touches[0].clientX));
  }, [getPos]);

  const stopDrag = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [onMouseMove, onTouchMove, stopDrag]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    if ('touches' in e) setPos(getPos(e.touches[0].clientX));
    else setPos(getPos(e.clientX));
  };

  return (
    <div ref={containerRef}
      className="relative rounded-2xl overflow-hidden select-none"
      style={{ aspectRatio: '16/9', cursor: 'ew-resize', border: '1px solid rgba(87,216,255,0.18)' }}>

      {/* Foto DEPOIS (fundo completo) */}
      <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

      {/* Foto ANTES (recorte da esquerda via clip-path) */}
      <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false} />

      {/* Linha divisória */}
      <div className="absolute top-0 bottom-0"
        style={{
          left: `${pos}%`,
          width: 2,
          background: 'rgba(255,255,255,0.9)',
          boxShadow: '0 0 12px rgba(87,216,255,0.8)',
          transform: 'translateX(-1px)',
          pointerEvents: 'none',
        }} />

      {/* Handle — círculo arrastável */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center rounded-full z-10"
        style={{
          left: `${pos}%`,
          width: 36, height: 36,
          background: 'rgba(255,255,255,0.95)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.45), 0 0 0 2px rgba(87,216,255,0.4)',
          cursor: 'ew-resize',
          touchAction: 'none',
        }}>
        <ChevronsLeftRight size={16} style={{ color: '#0d1423' }} />
      </div>

      {/* Badge ANTES */}
      <div className="absolute top-2 left-2 pointer-events-none"
        style={{ opacity: pos > 12 ? 1 : 0, transition: 'opacity 0.2s' }}>
        <span className="px-2 py-0.5 rounded-lg text-[0.58rem] font-black tracking-widest"
          style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {labelBefore}
        </span>
      </div>

      {/* Badge DEPOIS */}
      <div className="absolute top-2 right-2 pointer-events-none"
        style={{ opacity: pos < 88 ? 1 : 0, transition: 'opacity 0.2s' }}>
        <span className="px-2 py-0.5 rounded-lg text-[0.58rem] font-black tracking-widest"
          style={{ background: 'rgba(87,216,255,0.2)', color: '#57d8ff', backdropFilter: 'blur(6px)', border: '1px solid rgba(87,216,255,0.3)' }}>
          {labelAfter}
        </span>
      </div>

      {/* Instrução tátil (desaparece após interação) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ opacity: pos === 50 ? 1 : 0, transition: 'opacity 0.4s' }}>
        <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
          ◀ Arraste para comparar ▶
        </span>
      </div>

      {/* Captura eventos de drag em toda a área */}
      <div className="absolute inset-0 z-0" onMouseDown={startDrag} onTouchStart={startDrag} />
    </div>
  );
};
