-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 025 — Quadra/Bloco/Torre por unidade (idempotente)
-- ================================================================

-- Garante a coluna block (Quadra/Bloco/Torre) na tabela de unidades.
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS block TEXT;

COMMENT ON COLUMN public.units.block IS 'Quadra / Bloco / Torre — combinado com unit_number forma a identificação (ex: B + 04 = B04)';

CREATE INDEX IF NOT EXISTS idx_units_block ON public.units(block);
