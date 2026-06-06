-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 029 — Campos de contato em achados_perdidos
-- ================================================================
-- Permite que quem registra o item informe nome e telefone de
-- contato, facilitando a devolução sem passar pela portaria.

ALTER TABLE public.achados_perdidos
  ADD COLUMN IF NOT EXISTS nome_contato   TEXT,
  ADD COLUMN IF NOT EXISTS telefone_contato TEXT;

COMMENT ON COLUMN public.achados_perdidos.nome_contato     IS 'Nome para contato direto sobre o item';
COMMENT ON COLUMN public.achados_perdidos.telefone_contato IS 'Telefone/WhatsApp para contato sobre o item';
