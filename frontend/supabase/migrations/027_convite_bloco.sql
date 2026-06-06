-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 027 — Quadra/Bloco no convite (identificação B04 no QR)
-- ================================================================
-- Aditivo e seguro: NÃO altera chacara_numero (chave de correspondência
-- usada na portaria e nas notificações em tempo real). Apenas adiciona
-- o bloco/quadra como informação de exibição, capturada na criação.

ALTER TABLE public.portaria_convites
  ADD COLUMN IF NOT EXISTS chacara_bloco TEXT;

ALTER TABLE public.portaria_recorrentes
  ADD COLUMN IF NOT EXISTS chacara_bloco TEXT;

COMMENT ON COLUMN public.portaria_convites.chacara_bloco IS 'Quadra/Bloco/Torre da unidade no momento do convite (ex: B). Combinado com chacara_numero forma B04.';
