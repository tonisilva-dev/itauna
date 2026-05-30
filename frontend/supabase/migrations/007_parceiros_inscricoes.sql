-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 007 — Parceiros e Inscrições em Eventos
-- Execute APÓS Scripts 001–006
-- ================================================================

-- ── TABELA: parceiros ────────────────────────────────────────────
CREATE TABLE public.parceiros (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  logo_url    TEXT,
  website     TEXT,
  telefone    TEXT,
  email       TEXT,
  categoria   TEXT        NOT NULL DEFAULT 'Geral'
                            CHECK (categoria IN ('Patrocinador','Apoiador','Fornecedor','Institucional','Geral')),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER parceiros_updated_at
  BEFORE UPDATE ON public.parceiros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_parceiros_categoria ON public.parceiros(categoria);
CREATE INDEX idx_parceiros_active    ON public.parceiros(is_active);

-- ── TABELA: event_parceiros (N:N) ────────────────────────────────
CREATE TABLE public.event_parceiros (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  parceiro_id UUID        NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  papel       TEXT        NOT NULL DEFAULT 'Apoiador'
                            CHECK (papel IN ('Patrocinador','Apoiador','Organizador','Fornecedor')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, parceiro_id)
);

CREATE INDEX idx_event_parceiros_event    ON public.event_parceiros(event_id);
CREATE INDEX idx_event_parceiros_parceiro ON public.event_parceiros(parceiro_id);

-- ── TABELA: event_inscricoes ─────────────────────────────────────
CREATE TABLE public.event_inscricoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  -- Condômino logado (nullable para externos)
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Dados do inscrito (obrigatórios para externos)
  nome        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  telefone    TEXT,
  unit_number INT,
  status      TEXT        NOT NULL DEFAULT 'confirmado'
                            CHECK (status IN ('pendente','confirmado','cancelado','lista_espera')),
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER inscricoes_updated_at
  BEFORE UPDATE ON public.event_inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_inscricoes_event  ON public.event_inscricoes(event_id);
CREATE INDEX idx_inscricoes_user   ON public.event_inscricoes(user_id);
CREATE INDEX idx_inscricoes_status ON public.event_inscricoes(status);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.parceiros       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_inscricoes ENABLE ROW LEVEL SECURITY;

-- PARCEIROS: todos autenticados leem; gestores gerenciam
CREATE POLICY "parceiro_leitura"
  ON public.parceiros FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active);

CREATE POLICY "parceiro_gestor_total"
  ON public.parceiros FOR ALL
  USING (public.is_gestor());

-- EVENT_PARCEIROS: todos autenticados leem; gestores gerenciam
CREATE POLICY "event_parceiro_leitura"
  ON public.event_parceiros FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "event_parceiro_gestor"
  ON public.event_parceiros FOR ALL
  USING (public.is_gestor());

-- EVENT_INSCRICOES: gestor vê tudo; inscrito vê a própria; qualquer um insere
CREATE POLICY "inscricao_leitura_gestor"
  ON public.event_inscricoes FOR SELECT
  USING (public.is_gestor() OR user_id = auth.uid());

CREATE POLICY "inscricao_inserir"
  ON public.event_inscricoes FOR INSERT
  WITH CHECK (true);  -- permite externos (sem auth)

CREATE POLICY "inscricao_cancelar_proprio"
  ON public.event_inscricoes FOR UPDATE
  USING (user_id = auth.uid() OR public.is_gestor());

CREATE POLICY "inscricao_deletar_gestor"
  ON public.event_inscricoes FOR DELETE
  USING (public.is_gestor());
