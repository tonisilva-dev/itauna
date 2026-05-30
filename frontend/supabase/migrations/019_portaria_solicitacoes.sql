-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 019 — Portaria: Solicitações de Acesso via QR Code
-- Visitante submete o formulário (público); portaria aprova/nega
-- em tempo real; ao aprovar, registro de entrada é criado.
-- ================================================================

CREATE TABLE public.portaria_solicitacoes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_numero    TEXT        NOT NULL,       -- ex: '045'
  visitante_nome    TEXT        NOT NULL,
  visitante_tel     TEXT,
  visitante_veiculo TEXT,
  motivo            TEXT,
  status            TEXT        NOT NULL DEFAULT 'pendente'
                                  CHECK (status IN (
                                    'pendente','aprovado','negado','cancelado'
                                  )),
  resolved_by       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at       TIMESTAMPTZ,
  observacao        TEXT,
  -- FK para o registro de entrada criado ao aprovar (preenchido pela portaria)
  registro_id       UUID        REFERENCES public.portaria_registros(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER portaria_solicitacoes_updated_at
  BEFORE UPDATE ON public.portaria_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_solicitacoes_status     ON public.portaria_solicitacoes(status);
CREATE INDEX idx_solicitacoes_chacara    ON public.portaria_solicitacoes(chacara_numero);
CREATE INDEX idx_solicitacoes_created    ON public.portaria_solicitacoes(created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.portaria_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode submeter (visitante sem auth)
CREATE POLICY "solicitacoes_insert_publico"
  ON public.portaria_solicitacoes FOR INSERT
  WITH CHECK (true);

-- Leitura: público (UUID é unguessável — visitante rastreia pelo ID)
-- Gestores veem todas para o painel
CREATE POLICY "solicitacoes_select_publico"
  ON public.portaria_solicitacoes FOR SELECT
  USING (true);

-- Apenas gestores aprovam/negam/cancelam
CREATE POLICY "solicitacoes_update_gestor"
  ON public.portaria_solicitacoes FOR UPDATE
  USING (public.is_gestor())
  WITH CHECK (public.is_gestor());

CREATE POLICY "solicitacoes_delete_gestor"
  ON public.portaria_solicitacoes FOR DELETE
  USING (public.is_gestor());

-- ── Habilitar Realtime nesta tabela ─────────────────────────────
-- Execute no Supabase Dashboard → Database → Replication:
-- Adicionar portaria_solicitacoes à publicação supabase_realtime.
-- Ou via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.portaria_solicitacoes;
