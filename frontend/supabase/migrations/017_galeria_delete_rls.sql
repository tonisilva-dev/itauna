-- ================================================================
-- Migration 017 — RLS DELETE para galeria_fotos
-- A migration 014 criou SELECT, INSERT e UPDATE, mas omitiu DELETE.
-- Com RLS ativo e sem política DELETE, o Supabase nega a operação
-- por padrão — mas a política explícita é obrigatória para clareza,
-- auditabilidade e para evitar regressões em futuras reconfigurações.
-- ================================================================

-- Somente gestores (admin + síndico) podem excluir fotos da galeria
CREATE POLICY "galeria_delete"
  ON public.galeria_fotos FOR DELETE
  USING (public.is_gestor());

-- Idem para o bucket de storage: gestores excluem objetos da galeria
CREATE POLICY "galeria_storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'galeria' AND public.is_gestor());
