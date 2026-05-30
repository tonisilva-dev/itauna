-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 018 — Campanhas Sociais
-- Leitura pública (sem auth); criação/edição/exclusão por gestores.
-- ================================================================

CREATE TABLE public.campanhas_sociais (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT        NOT NULL,
  descricao   TEXT,
  categoria   TEXT        NOT NULL DEFAULT 'Geral'
                            CHECK (categoria IN (
                              'Solidariedade','Sazonais','Saúde',
                              'Educação','Meio Ambiente','Geral'
                            )),
  emoji       TEXT        NOT NULL DEFAULT '🌟',
  data_inicio DATE,
  data_fim    DATE,
  status      TEXT        NOT NULL DEFAULT 'ativa'
                            CHECK (status IN ('ativa','encerrada','planejada')),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER campanhas_sociais_updated_at
  BEFORE UPDATE ON public.campanhas_sociais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_campanhas_status   ON public.campanhas_sociais(status);
CREATE INDEX idx_campanhas_active   ON public.campanhas_sociais(is_active);
CREATE INDEX idx_campanhas_inicio   ON public.campanhas_sociais(data_inicio DESC);

-- RLS: leitura pública; gestão exclusiva de gestores
ALTER TABLE public.campanhas_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campanhas_leitura_publica"
  ON public.campanhas_sociais FOR SELECT
  USING (is_active = true);

CREATE POLICY "campanhas_gestor_total"
  ON public.campanhas_sociais FOR ALL
  USING (public.is_gestor())
  WITH CHECK (public.is_gestor());

-- ── Seed ─────────────────────────────────────────────────────────
INSERT INTO public.campanhas_sociais
  (titulo, descricao, categoria, emoji, data_inicio, data_fim, status)
VALUES
  ('Campanha de Páscoa',
   'Arrecadação de ovos de chocolate e brinquedos para crianças em situação de vulnerabilidade na região de Ibiporã.',
   'Solidariedade', '🐣', '2026-04-01', '2026-04-19', 'planejada'),

  ('Campanha do Agasalho',
   'Recolhimento de roupas de frio em bom estado — casacos, cobertores, meias e luvas — para distribuição às famílias carentes no inverno.',
   'Solidariedade', '🧥', '2026-06-01', '2026-07-31', 'planejada'),

  ('Campanha do Dia das Crianças',
   'Doação de brinquedos novos ou usados em bom estado para alegrar o 12 de Outubro das crianças das comunidades vizinhas.',
   'Solidariedade', '🎁', '2026-09-15', '2026-10-12', 'planejada'),

  ('Campanha de Natal Solidário',
   'Arrecadação de alimentos não perecíveis e brinquedos para distribuição no Natal. Cada família pode contribuir com o que puder.',
   'Solidariedade', '🎄', '2026-11-15', '2026-12-23', 'planejada'),

  ('Coleta Seletiva — Conscientização',
   'Orientação e distribuição de materiais educativos sobre separação de resíduos orgânicos e recicláveis para todos os moradores.',
   'Meio Ambiente', '♻️', NULL, NULL, 'ativa');
