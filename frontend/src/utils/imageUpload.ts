import { supabase } from '../lib/supabase';

/** Redimensiona e comprime a imagem no cliente antes do upload.
 *  Converte para WebP com qualidade controlada — output ~150-300 KB. */
export async function compressImage(
  file: File,
  maxPx = 1600,
  quality = 0.82,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Compressão falhou'))),
        'image/webp',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Imagem inválida')); };
    img.src = blobUrl;
  });
}

/** Comprime e faz upload para o bucket `benfeitorias`.
 *  `storagePath` deve ser único por foto (ex: `{obra_id}/antes`).
 *  Retorna a URL pública permanente. */
export async function uploadBenfeitoriaPhoto(
  file: File,
  storagePath: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  onProgress?.(10);
  const blob = await compressImage(file);
  onProgress?.(40);
  const path = `${storagePath}.webp`;
  const { error } = await supabase.storage
    .from('benfeitorias')
    .upload(path, blob, { contentType: 'image/webp', upsert: true });
  if (error) throw error;
  onProgress?.(100);
  const { data } = supabase.storage.from('benfeitorias').getPublicUrl(path);
  // Cache-bust para forçar reload após upsert
  return `${data.publicUrl}?t=${Date.now()}`;
}

/** Remove um arquivo do Storage pelo seu URL público. */
export async function deleteBenfeitoriaPhoto(publicUrl: string): Promise<void> {
  const marker = '/benfeitorias/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const rawPath = publicUrl.slice(idx + marker.length).split('?')[0];
  await supabase.storage.from('benfeitorias').remove([rawPath]);
}
