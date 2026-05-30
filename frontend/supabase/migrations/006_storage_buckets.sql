-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 006 — Storage Buckets (Execute no SQL Editor do Supabase)
-- ================================================================

-- ── Criar buckets ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Avatares dos usuários (público)
  ('avatars', 'avatars', true,
   5242880,  -- 5 MB
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),

  -- Documentos do condomínio (privado — acesso via RLS)
  ('documents', 'documents', false,
   20971520,  -- 20 MB
   ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-excel', 'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),

  -- Fotos de eventos (público)
  ('events', 'events', true,
   10485760,  -- 10 MB
   ARRAY['image/jpeg', 'image/png', 'image/webp']),

  -- Fotos de ocorrências (privado)
  ('incidents', 'incidents', false,
   10485760,  -- 10 MB
   ARRAY['image/jpeg', 'image/png', 'image/webp'])

ON CONFLICT (id) DO NOTHING;

-- ── Políticas de storage ─────────────────────────────────────────

-- AVATARES: usuário faz upload do próprio avatar
CREATE POLICY "avatar_upload_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_leitura_publica"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatar_deletar_proprio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- DOCUMENTOS: gestores fazem upload, autenticados leem
CREATE POLICY "documento_upload_gestor"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'sindico')
  );

CREATE POLICY "documento_leitura_autenticado"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "documento_deletar_gestor"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'sindico')
  );

-- EVENTOS: gestores fazem upload, todos leem
CREATE POLICY "evento_upload_gestor"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'events'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'sindico')
  );

CREATE POLICY "evento_leitura_publica"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'events');

-- OCORRÊNCIAS: usuário faz upload da própria pasta
CREATE POLICY "ocorrencia_upload_proprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'incidents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "ocorrencia_leitura"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'incidents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'sindico')
    )
  );
