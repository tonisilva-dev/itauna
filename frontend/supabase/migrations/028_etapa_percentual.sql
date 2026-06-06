-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 028 — Percentual por etapa da benfeitoria
-- ================================================================
-- Cada fase/etapa contribui com um percentual do total da obra.
-- O progresso da benfeitoria passa a refletir a soma das etapas concluídas.

ALTER TABLE public.benfeitoria_etapas
  ADD COLUMN IF NOT EXISTS percentual INT NOT NULL DEFAULT 0
    CHECK (percentual BETWEEN 0 AND 100);

COMMENT ON COLUMN public.benfeitoria_etapas.percentual IS 'Peso da etapa no total da obra (0-100). Soma das etapas concluídas = progresso da benfeitoria.';
