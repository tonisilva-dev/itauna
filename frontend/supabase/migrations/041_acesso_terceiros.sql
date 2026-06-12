-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 041 — Controle de acesso de terceiros com veículo
-- Veículo/período em convites, coordenadas de lote em units,
-- pré-autorização itinerante pelo porteiro, convite_id em registros
-- ================================================================

-- ── portaria_convites: campos de veículo e período ─────────────
ALTER TABLE public.portaria_convites
  ADD COLUMN IF NOT EXISTS veiculo_placa        TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_tipo         TEXT
    CHECK (veiculo_tipo IN ('carro','moto','van','caminhao','outro')),
  ADD COLUMN IF NOT EXISTS periodo              TEXT NOT NULL DEFAULT 'dia_todo'
    CHECK (periodo IN ('manha','tarde','noite','dia_todo')),
  ADD COLUMN IF NOT EXISTS ocupantes_declarados INT NOT NULL DEFAULT 1;

-- ── units: coordenadas e referência do lote ────────────────────
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS lote_lat        DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS lote_lng        DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS lote_referencia TEXT;

-- ── portaria_registros: vínculo ao convite ─────────────────────
ALTER TABLE public.portaria_registros
  ADD COLUMN IF NOT EXISTS convite_id          UUID REFERENCES public.portaria_convites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS placa_registrada    TEXT,
  ADD COLUMN IF NOT EXISTS ocupantes_verificados INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_reg_convite ON public.portaria_registros(convite_id);

-- ── preautorizacoes: porteiro libera via celular ───────────────
-- Criada quando o porteiro itinerante escaneia o QR do convite
-- e libera a entrada sem passar pelo totem.
CREATE TABLE IF NOT EXISTS public.preautorizacoes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  convite_id            UUID        NOT NULL REFERENCES public.portaria_convites(id) ON DELETE CASCADE,
  porteiro_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registro_id           UUID        REFERENCES public.portaria_registros(id) ON DELETE SET NULL,
  placa_verificada      TEXT,
  ocupantes_verificados INT         NOT NULL DEFAULT 1,
  documento_conferido   BOOLEAN     NOT NULL DEFAULT false,
  obs                   TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preauth_convite  ON public.preautorizacoes(convite_id);
CREATE INDEX IF NOT EXISTS idx_preauth_porteiro ON public.preautorizacoes(porteiro_id);

ALTER TABLE public.preautorizacoes ENABLE ROW LEVEL SECURITY;

-- Gestores e assistentes gerenciam; moradores leem as próprias
CREATE POLICY "preauth_gestor" ON public.preautorizacoes
  FOR ALL USING (public.is_gestor() OR public.assistente_pode_ver('portaria'))
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('portaria'));
