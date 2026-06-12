-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 042 — UX / Segurança: pânico, encomendas++, estadias,
--                 autorização com janela horária
-- ================================================================

-- ── 1. Botão de Pânico ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.panic_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chacara_numero TEXT,
  lat           DECIMAL(10,7),
  lng           DECIMAL(10,7),
  nota          TEXT,
  resolved      BOOLEAN     NOT NULL DEFAULT false,
  resolved_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panic_user    ON public.panic_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panic_open    ON public.panic_events(resolved) WHERE resolved = false;

ALTER TABLE public.panic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panic_insert_self" ON public.panic_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "panic_select"     ON public.panic_events
  FOR SELECT USING (auth.uid() = user_id OR public.is_gestor());

CREATE POLICY "panic_update_gestor" ON public.panic_events
  FOR UPDATE USING (public.is_gestor());

ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_events;

-- ── 2. Encomendas: rastreio + foto + retirada identificada ─────
ALTER TABLE public.portaria_encomendas
  ADD COLUMN IF NOT EXISTS rastreio_codigo     TEXT,
  ADD COLUMN IF NOT EXISTS foto_url            TEXT,
  ADD COLUMN IF NOT EXISTS retirada_por_nome   TEXT,
  ADD COLUMN IF NOT EXISTS retirada_por_doc    TEXT;

-- ── 3. Estadias prolongadas ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portaria_estadias (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  morador_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chacara_numero      TEXT        NOT NULL,
  hospede_nome        TEXT        NOT NULL,
  hospede_cpf         TEXT,
  hospede_tel         TEXT,
  check_in            DATE        NOT NULL,
  check_out_previsto  DATE        NOT NULL,
  motivo              TEXT        NOT NULL DEFAULT 'familiar'
    CHECK (motivo IN ('familiar','aluguel_temporada','obra','outro')),
  veiculo_placa       TEXT,
  num_pessoas         INT         NOT NULL DEFAULT 1,
  status              TEXT        NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa','encerrada')),
  check_out_real      DATE,
  observacao          TEXT,
  registrado_por      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER estadias_updated_at
  BEFORE UPDATE ON public.portaria_estadias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_estadias_morador ON public.portaria_estadias(morador_id);
CREATE INDEX IF NOT EXISTS idx_estadias_chacara ON public.portaria_estadias(chacara_numero, status);
CREATE INDEX IF NOT EXISTS idx_estadias_checkout ON public.portaria_estadias(check_out_previsto) WHERE status = 'ativa';

ALTER TABLE public.portaria_estadias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estadias_morador" ON public.portaria_estadias
  FOR ALL USING (morador_id = auth.uid() OR public.is_gestor())
  WITH CHECK (morador_id = auth.uid() OR public.is_gestor());

ALTER PUBLICATION supabase_realtime ADD TABLE public.portaria_estadias;

-- ── 4. Autorização com janela horária ─────────────────────────
ALTER TABLE public.portaria_recorrentes
  ADD COLUMN IF NOT EXISTS horario_inicio  TEXT,   -- ex: '08:00'
  ADD COLUMN IF NOT EXISTS horario_fim     TEXT;   -- ex: '18:00'

-- ── 5. Achados e perdidos: foto + local portaria ───────────────
ALTER TABLE public.achados_perdidos
  ADD COLUMN IF NOT EXISTS foto_url        TEXT,
  ADD COLUMN IF NOT EXISTS local_portaria  TEXT;  -- ex: 'Portão B', 'Salão festas'

-- ── 6. Veículos cadastrados pelo morador ──────────────────────
-- Permite porteiro consultar por placa e identificar veículos rurais
CREATE TABLE IF NOT EXISTS public.veiculos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID        NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  morador_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  categoria     TEXT        NOT NULL DEFAULT 'carro'
    CHECK (categoria IN ('carro','moto','caminhonete','caminhao','bicicleta','trator','quadriciclo','tracao_animal','outro_rural')),
  marca         TEXT,
  modelo        TEXT,
  ano           SMALLINT,
  cor           TEXT,
  placa         TEXT,
  renavam       TEXT,
  foto_url      TEXT,
  eh_rural      BOOLEAN     NOT NULL DEFAULT false,
  observacao    TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_veiculos_placa  ON public.veiculos(placa) WHERE placa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_veiculos_unit   ON public.veiculos(unit_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_morad  ON public.veiculos(morador_id);
-- Busca fuzzy por placa (requer pg_trgm — geralmente disponível no Supabase)
CREATE INDEX IF NOT EXISTS idx_veiculos_placa_trgm ON public.veiculos USING gin(placa gin_trgm_ops) WHERE placa IS NOT NULL;

ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "veiculos_morador" ON public.veiculos
  FOR ALL USING (morador_id = auth.uid() OR public.is_gestor())
  WITH CHECK (morador_id = auth.uid() OR public.is_gestor());

-- ── 7. Pets cadastrados pelo morador ──────────────────────────
CREATE TABLE IF NOT EXISTS public.pets (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id               UUID        NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  morador_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome                  TEXT        NOT NULL,
  especie               TEXT        NOT NULL DEFAULT 'cão',  -- cão, gato, ave, réptil, outro
  raca                  TEXT,
  cor_pelagem           TEXT,
  porte                 TEXT        CHECK (porte IN ('mini','pequeno','medio','grande','gigante')),
  microchip_codigo      TEXT,
  foto_url              TEXT,
  raca_restrita         BOOLEAN     NOT NULL DEFAULT false,
  exige_focinheira      BOOLEAN     NOT NULL DEFAULT false,
  vacinacao_ok          BOOLEAN     NOT NULL DEFAULT true,
  vacinacao_vence_em    DATE,
  carteira_url          TEXT,       -- foto carteira de vacinação
  observacao            TEXT,
  ativo                 BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pets_microchip ON public.pets(microchip_codigo) WHERE microchip_codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pets_unit      ON public.pets(unit_id);
CREATE INDEX IF NOT EXISTS idx_pets_morador   ON public.pets(morador_id);
-- Alerta de vacina vencendo
CREATE INDEX IF NOT EXISTS idx_pets_vacina_vence ON public.pets(vacinacao_vence_em) WHERE vacinacao_ok = true AND ativo = true;

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pets_morador" ON public.pets
  FOR ALL USING (morador_id = auth.uid() OR public.is_gestor())
  WITH CHECK (morador_id = auth.uid() OR public.is_gestor());
