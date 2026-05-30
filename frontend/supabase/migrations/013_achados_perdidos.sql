-- Mural de achados e perdidos do condomínio
CREATE TABLE public.achados_perdidos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL CHECK (type IN ('perdido','achado')),
  title       TEXT        NOT NULL,
  local       TEXT        NOT NULL,
  descricao   TEXT        NOT NULL,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT        NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','resolvido')),
  resolved_at TIMESTAMPTZ,
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achados_created ON public.achados_perdidos(created_at DESC);
CREATE INDEX idx_achados_status  ON public.achados_perdidos(status);

ALTER TABLE public.achados_perdidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achados_select" ON public.achados_perdidos FOR SELECT USING (true);
CREATE POLICY "achados_insert" ON public.achados_perdidos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "achados_update" ON public.achados_perdidos FOR UPDATE
  USING (auth.uid() = user_id OR public.is_gestor());
