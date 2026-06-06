-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 026 — Benfeitorias e Obras (acompanhamento pelo morador)
-- ================================================================

-- ── TABELA: benfeitorias ──────────────────────────────────────────
CREATE TABLE public.benfeitorias (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT        NOT NULL,
  descricao       TEXT,
  categoria       TEXT        NOT NULL DEFAULT 'outros'
                                CHECK (categoria IN ('infraestrutura','lazer','seguranca','paisagismo','manutencao','outros')),
  status          TEXT        NOT NULL DEFAULT 'planejada'
                                CHECK (status IN ('planejada','em_andamento','pausada','concluida')),
  responsavel     TEXT,
  orcamento       NUMERIC(12,2),
  progresso       INT         NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  data_inicio     DATE,
  data_prevista   DATE,
  data_conclusao  DATE,
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_benf_status ON public.benfeitorias(status, created_at DESC);

CREATE TRIGGER benfeitorias_updated_at
  BEFORE UPDATE ON public.benfeitorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.benfeitorias ENABLE ROW LEVEL SECURITY;

-- Todos os autenticados acompanham; apenas gestor gerencia
CREATE POLICY "benf_select" ON public.benfeitorias FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "benf_all_gestor" ON public.benfeitorias FOR ALL
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

-- ── TABELA: benfeitoria_etapas ────────────────────────────────────
CREATE TABLE public.benfeitoria_etapas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  benfeitoria_id  UUID        NOT NULL REFERENCES public.benfeitorias(id) ON DELETE CASCADE,
  titulo          TEXT        NOT NULL,
  descricao       TEXT,
  status          TEXT        NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente','em_andamento','concluida')),
  ordem           INT         NOT NULL DEFAULT 0,
  concluida_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_benf_etapas ON public.benfeitoria_etapas(benfeitoria_id, ordem);

ALTER TABLE public.benfeitoria_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benf_etapas_select" ON public.benfeitoria_etapas FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "benf_etapas_all_gestor" ON public.benfeitoria_etapas FOR ALL
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

-- ── Realtime: morador acompanha avanços ao vivo ──────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.benfeitorias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.benfeitoria_etapas;

-- ── Seed de exemplo ───────────────────────────────────────────────
INSERT INTO public.benfeitorias (titulo, descricao, categoria, status, responsavel, orcamento, progresso, data_inicio, data_prevista) VALUES
  ('Reforma da Quadra Poliesportiva', 'Troca do piso, pintura e nova iluminação de LED.', 'lazer', 'em_andamento', 'Construtora Horizonte', 85000.00, 45, '2026-04-01', '2026-08-30'),
  ('Modernização da Portaria', 'Cancelas automáticas, câmeras e totem de autoatendimento.', 'seguranca', 'em_andamento', 'TecSeg Sistemas', 120000.00, 70, '2026-03-10', '2026-07-15'),
  ('Novo Paisagismo da Entrada', 'Replantio, jardim de espécies nativas e irrigação automática.', 'paisagismo', 'planejada', 'Verde Vivo Jardinagem', 32000.00, 0, '2026-07-01', '2026-09-30');
