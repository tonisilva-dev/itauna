-- Registro fotográfico em benfeitorias (marcos e por etapa)
ALTER TABLE benfeitorias
  ADD COLUMN IF NOT EXISTS foto_antes_url  TEXT,
  ADD COLUMN IF NOT EXISTS foto_depois_url TEXT,
  ADD COLUMN IF NOT EXISTS fotos_etapa_ids TEXT[] DEFAULT '{}';

ALTER TABLE benfeitoria_etapas
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Storage bucket público (leitura pública, upload autenticado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'benfeitorias',
  'benfeitorias',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage
CREATE POLICY "benfeitorias_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'benfeitorias');

CREATE POLICY "benfeitorias_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'benfeitorias');

CREATE POLICY "benfeitorias_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'benfeitorias');
