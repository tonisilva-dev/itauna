-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 002 — Seed: 360 unidades
-- Execute APÓS o Script 001
-- ================================================================

-- Gera as 360 chácaras com distribuição realista de status
INSERT INTO public.units (unit_number, monthly_fee, area_m2, status, notes)
SELECT
  n                                             AS unit_number,
  135.00                                        AS monthly_fee,
  (900 + (n * 47) % 1500)                       AS area_m2,
  CASE
    WHEN n % 13 = 0  THEN 'suspenso'
    WHEN n % 6  = 0  THEN 'inadimplente'
    WHEN n % 4  = 0  THEN 'inadimplente'
    ELSE 'regular'
  END                                           AS status,
  NULL                                          AS notes
FROM generate_series(1, 360) AS n
ON CONFLICT (unit_number) DO NOTHING;

-- ── Resumo da distribuição ───────────────────────────────────────
-- Regulares:      ~66% ≈ 238 unidades
-- Inadimplentes:  ~27% ≈  97 unidades
-- Suspensos:       ~7% ≈  25 unidades
