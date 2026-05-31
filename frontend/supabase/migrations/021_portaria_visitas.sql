-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 021 — Sistema completo de agendamento de visitas
-- Convites pontuais + Recorrentes + atualização de solicitações
-- ================================================================

-- ── TABELA: portaria_convites ─────────────────────────────────────
-- Morador pré-cadastra quem virá visitá-lo.
CREATE TABLE public.portaria_convites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  morador_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chacara_numero  TEXT        NOT NULL,
  visitante_nome  TEXT        NOT NULL,
  visitante_cpf   TEXT,               -- obrigatório para convidado/prestador
  visitante_tel   TEXT,
  tipo            TEXT        NOT NULL DEFAULT 'convidado'
                                CHECK (tipo IN ('convidado','prestador','entrega')),
  data_visita     DATE        NOT NULL,
  num_pessoas     INT         NOT NULL DEFAULT 1 CHECK (num_pessoas >= 1),
  observacao      TEXT,
  status          TEXT        NOT NULL DEFAULT 'ativo'
                                CHECK (status IN ('ativo','usado','expirado','cancelado')),
  portaria_id     INT,                -- qual portaria atendeu (preenchido na chegada)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER convites_updated_at
  BEFORE UPDATE ON public.portaria_convites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_convites_morador    ON public.portaria_convites(morador_id);
CREATE INDEX idx_convites_data       ON public.portaria_convites(data_visita);
CREATE INDEX idx_convites_cpf        ON public.portaria_convites(visitante_cpf);
CREATE INDEX idx_convites_status     ON public.portaria_convites(status);

ALTER TABLE public.portaria_convites ENABLE ROW LEVEL SECURITY;

-- Morador vê/gerencia os próprios convites; gestor vê todos
CREATE POLICY "convites_morador"
  ON public.portaria_convites FOR ALL
  USING (morador_id = auth.uid() OR public.is_gestor())
  WITH CHECK (morador_id = auth.uid() OR public.is_gestor());

-- ── TABELA: portaria_recorrentes ──────────────────────────────────
-- Acesso fixo recorrente (faxineira, jardineiro, prestador habitual).
-- CPF cadastrado 1x — dispensado de reverificação nas visitas seguintes.
CREATE TABLE public.portaria_recorrentes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  morador_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chacara_numero  TEXT        NOT NULL,
  nome            TEXT        NOT NULL,
  cpf             TEXT,
  telefone        TEXT,
  tipo            TEXT        NOT NULL DEFAULT 'prestador'
                                CHECK (tipo IN ('prestador','convidado','entrega')),
  dias_semana     TEXT[]      NOT NULL DEFAULT '{}',
                  -- ex: ARRAY['seg','ter','qua','qui','sex','sab','dom']
  vigencia_inicio DATE        NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim    DATE,       -- NULL = sem prazo
  ativo           BOOLEAN     NOT NULL DEFAULT true,
  observacao      TEXT,
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER recorrentes_updated_at
  BEFORE UPDATE ON public.portaria_recorrentes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_recorrentes_morador ON public.portaria_recorrentes(morador_id);
CREATE INDEX idx_recorrentes_cpf     ON public.portaria_recorrentes(cpf);
CREATE INDEX idx_recorrentes_ativo   ON public.portaria_recorrentes(ativo);

ALTER TABLE public.portaria_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recorrentes_morador"
  ON public.portaria_recorrentes FOR ALL
  USING (morador_id = auth.uid() OR public.is_gestor())
  WITH CHECK (morador_id = auth.uid() OR public.is_gestor());

-- ── ATUALIZAR: portaria_solicitacoes ─────────────────────────────
-- Adiciona campos do novo fluxo sem quebrar dados existentes.
ALTER TABLE public.portaria_solicitacoes
  ADD COLUMN IF NOT EXISTS portaria_id    INT     NOT NULL DEFAULT 1
                                            CHECK (portaria_id IN (1, 2)),
  ADD COLUMN IF NOT EXISTS visitante_cpf  TEXT,
  ADD COLUMN IF NOT EXISTS num_pessoas    INT     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS convite_id     UUID    REFERENCES public.portaria_convites(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recorrente_id  UUID    REFERENCES public.portaria_recorrentes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem         TEXT    NOT NULL DEFAULT 'qr'
                                            CHECK (origem IN ('qr','manual','whatsapp'));

CREATE INDEX IF NOT EXISTS idx_sol_portaria ON public.portaria_solicitacoes(portaria_id, status);
CREATE INDEX IF NOT EXISTS idx_sol_cpf      ON public.portaria_solicitacoes(visitante_cpf);
