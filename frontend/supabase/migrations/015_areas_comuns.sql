-- ================================================================
-- Migration 015 — Áreas Comuns + Refactor Bookings
-- Cria tabela areas_comuns (catálogo das áreas de uso coletivo)
-- e atualiza bookings com area_id FK, taxa, pagamento e ativo.
-- ================================================================

-- ── TABELA: areas_comuns ─────────────────────────────────────────
CREATE TABLE public.areas_comuns (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT          NOT NULL UNIQUE,
  descricao    TEXT,
  capacidade   TEXT,
  emoji        TEXT          NOT NULL DEFAULT '📍',
  cor          TEXT          NOT NULL DEFAULT '#57d8ff',
  reservavel   BOOLEAN       NOT NULL DEFAULT true,
  cobra_taxa   BOOLEAN       NOT NULL DEFAULT false,
  taxa_uso     DECIMAL(10,2)           DEFAULT NULL, -- NULL ou 0 = gratuito
  ativo        BOOLEAN       NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT taxa_coerente CHECK (
    (cobra_taxa = false AND (taxa_uso IS NULL OR taxa_uso = 0))
    OR
    (cobra_taxa = true  AND taxa_uso > 0)
  )
);

COMMENT ON TABLE  public.areas_comuns IS 'Catálogo de áreas de uso comum do condomínio';
COMMENT ON COLUMN public.areas_comuns.reservavel IS 'TRUE = aceita reserva pelos condôminos';
COMMENT ON COLUMN public.areas_comuns.cobra_taxa IS 'TRUE = reserva exige pagamento de taxa';
COMMENT ON COLUMN public.areas_comuns.taxa_uso   IS 'Valor da taxa por reserva (NULL = gratuito)';
COMMENT ON COLUMN public.areas_comuns.ativo      IS 'FALSE = oculta da listagem e agendamento';

CREATE TRIGGER areas_comuns_updated_at
  BEFORE UPDATE ON public.areas_comuns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── SEED: áreas iniciais ─────────────────────────────────────────
INSERT INTO public.areas_comuns (nome, descricao, capacidade, emoji, cor, reservavel, cobra_taxa, taxa_uso, ativo)
VALUES
  ('Salão de Festas',
   'Salão climatizado com cozinha equipada e churrasqueira. Ideal para eventos de até 80 pessoas.',
   '80 pessoas', '🎉', '#8b5cf6', true,  true,  150.00, true),

  ('Quadra Poliesportiva',
   'Quadra coberta para futebol, vôlei e basquete. Iluminação noturna disponível.',
   '22 pessoas', '🏃', '#10b981', true,  false, NULL,   true),

  ('Piscina',
   'Piscina adulto e infantil. Funcionamento das 08h às 21h. Salva-vidas nos fins de semana.',
   'Livre',      '🏊', '#3b82f6', false, false, NULL,   true),

  ('Quiosque',
   'Área coberta com churrasqueira e mesas. Capacidade para 25 pessoas.',
   '25 pessoas', '🍖', '#f59e0b', true,  true,  80.00,  true),

  ('Campo de Futebol',
   'Campo de grama natural com vestiários e arquibancada coberta.',
   '22 jogadores','⚽', '#10b981', true, false, NULL,   true);

-- ── ATUALIZAR bookings ───────────────────────────────────────────
-- area_id: FK para areas_comuns (identificação da área)
-- responsavel_id: redundante com user_id — user_id já é o responsável
-- ativo: se o registro de reserva está ativo
-- status_pagamento: controla liberação da reserva
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS area_id           UUID REFERENCES public.areas_comuns(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS ativo             BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status_pagamento  TEXT    NOT NULL DEFAULT 'isento'
    CHECK (status_pagamento IN ('pendente', 'pago', 'isento'));

COMMENT ON COLUMN public.bookings.area_id          IS 'FK para areas_comuns — substitui area_name a longo prazo';
COMMENT ON COLUMN public.bookings.ativo             IS 'FALSE = cancelado/inativo';
COMMENT ON COLUMN public.bookings.status_pagamento  IS 'pendente | pago | isento (areas sem taxa)';

-- Preencher area_id com base no area_name existente
UPDATE public.bookings b
SET area_id = ac.id
FROM public.areas_comuns ac
WHERE b.area_name = ac.nome
  AND b.area_id IS NULL;

-- Marcar como 'pendente' reservas de áreas que cobram taxa
UPDATE public.bookings b
SET status_pagamento = 'pendente'
FROM public.areas_comuns ac
WHERE b.area_id = ac.id
  AND ac.cobra_taxa = true
  AND b.status_pagamento = 'isento';

-- Índices
CREATE INDEX IF NOT EXISTS idx_bookings_area_id        ON public.bookings(area_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ativo          ON public.bookings(ativo);
CREATE INDEX IF NOT EXISTS idx_bookings_status_pgto    ON public.bookings(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_areas_ativo             ON public.areas_comuns(ativo);
CREATE INDEX IF NOT EXISTS idx_areas_reservavel        ON public.areas_comuns(reservavel);

-- ── RLS: areas_comuns ────────────────────────────────────────────
ALTER TABLE public.areas_comuns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "areas_leitura"
  ON public.areas_comuns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "areas_gestor_total"
  ON public.areas_comuns FOR ALL
  USING (is_gestor());
