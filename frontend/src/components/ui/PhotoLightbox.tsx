import { useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';

interface Props {
  url: string;
  label?: string;
  onClose: () => void;
}

export const PhotoLightbox = ({ url, label, onClose }: Props) => {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  const download = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url; a.download = `${label ?? 'foto'}.webp`; a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}>

      {/* Controles */}
      <div className="absolute top-4 right-4 flex gap-2 z-10" onClick={e => e.stopPropagation()}>
        <button onClick={download}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}
          title="Baixar foto">
          <Download size={15} style={{ color: 'rgba(255,255,255,0.8)' }} />
        </button>
        <button onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
          <X size={15} style={{ color: 'rgba(255,255,255,0.8)' }} />
        </button>
      </div>

      {/* Imagem */}
      <div className="relative max-w-[92vw] max-h-[88vh] flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}>
        <img src={url} alt={label}
          className="rounded-2xl object-contain shadow-2xl"
          style={{ maxWidth: '92vw', maxHeight: '80vh', border: '1px solid rgba(255,255,255,0.1)' }} />
        {label && (
          <span className="px-3 py-1 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
