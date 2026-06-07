import { useRef, useState, useCallback } from 'react';
import { Camera, Trash2, Loader2, Upload } from 'lucide-react';
import { uploadBenfeitoriaPhoto, deleteBenfeitoriaPhoto } from '../../utils/imageUpload';
import toast from 'react-hot-toast';

interface Props {
  label: string;
  url: string | null;
  storagePath: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const PhotoUpload = ({
  label, url, storagePath, onUpload, onRemove, onClick, disabled = false, compact = false,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [dragging, setDragging]   = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem.'); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error('Imagem muito grande (máx 15 MB).'); return; }
    setUploading(true); setProgress(0);
    try {
      const publicUrl = await uploadBenfeitoriaPhoto(file, storagePath, setProgress);
      onUpload(publicUrl);
      toast.success('Foto enviada!');
    } catch {
      toast.error('Erro ao enviar foto.');
    } finally {
      setUploading(false); setProgress(0);
    }
  }, [storagePath, onUpload]);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    try {
      await deleteBenfeitoriaPhoto(url);
      onRemove();
    } catch {
      onRemove(); // remove do estado mesmo se storage falhar
    }
  }, [url, onRemove]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Compact mode: thumbnail circular na linha da etapa ───────────
  if (compact) {
    return (
      <div className="relative flex-shrink-0">
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        {url ? (
          <button onClick={onClick} className="relative w-10 h-10 rounded-xl overflow-hidden cursor-pointer group"
            style={{ border: '1.5px solid rgba(87,216,255,0.3)' }}>
            <img src={url} alt={label} className="w-full h-full object-cover" />
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.55)' }}
                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Camera size={12} style={{ color: '#fff' }} />
              </div>
            )}
          </button>
        ) : disabled ? null : (
          <button onClick={() => !uploading && inputRef.current?.click()}
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all"
            style={{ background: 'rgba(87,216,255,0.06)', border: '1.5px dashed rgba(87,216,255,0.25)' }}
            title={`Foto: ${label}`}>
            {uploading
              ? <Loader2 size={12} className="animate-spin" style={{ color: '#57d8ff' }} />
              : <Camera size={12} style={{ color: 'rgba(87,216,255,0.5)' }} />}
          </button>
        )}
      </div>
    );
  }

  // ── Full mode: card foto marco ────────────────────────────────────
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

      {url ? (
        /* ── Prévia ── */
        <div className="relative rounded-2xl overflow-hidden cursor-pointer group"
          style={{ aspectRatio: '4/3', border: '1px solid rgba(87,216,255,0.2)' }}
          onClick={onClick}>
          <img src={url} alt={label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

          {/* Overlay gestor */}
          {!disabled && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              <button onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center mr-2 cursor-pointer"
                style={{ background: 'rgba(87,216,255,0.2)', border: '1px solid rgba(87,216,255,0.4)' }}>
                <Camera size={15} style={{ color: '#57d8ff' }} />
              </button>
              <button onClick={handleRemove}
                className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                <Trash2 size={15} style={{ color: '#fca5a5' }} />
              </button>
            </div>
          )}

          {/* Badge de label */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
          </div>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onClick={() => !uploading && !disabled && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={disabled ? undefined : onDrop}
          className="rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
          style={{
            aspectRatio: '4/3',
            cursor: disabled ? 'default' : uploading ? 'wait' : 'pointer',
            background: dragging ? 'rgba(87,216,255,0.08)' : 'rgba(255,255,255,0.025)',
            border: `2px dashed ${dragging ? 'rgba(87,216,255,0.5)' : disabled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.12)'}`,
            transition: 'all 0.2s',
          }}>
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" style={{ color: '#57d8ff' }} />
              <div style={{ width: '60%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#57d8ff', transition: 'width 0.3s', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Comprimindo e enviando…</span>
            </>
          ) : disabled ? (
            <>
              <Camera size={18} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>Sem foto</span>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(87,216,255,0.08)' }}>
                <Upload size={16} style={{ color: 'rgba(87,216,255,0.6)' }} />
              </div>
              <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.4 }}>
                Clique ou arraste<br />uma foto
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
