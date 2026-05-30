-- Mural de classificados internos do condomínio
CREATE TABLE public.classificados (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'Outros',
  price       TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  location    TEXT,
  tag         TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classificados_created ON public.classificados(created_at DESC);
CREATE INDEX idx_classificados_cat     ON public.classificados(category);

ALTER TABLE public.classificados ENABLE ROW LEVEL SECURITY;

-- Todos leem os anúncios ativos
CREATE POLICY "classificados_select" ON public.classificados
  FOR SELECT USING (is_active = true);

-- Apenas logados publicam
CREATE POLICY "classificados_insert" ON public.classificados
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Apenas o próprio autor ou gestor desativa
CREATE POLICY "classificados_update" ON public.classificados
  FOR UPDATE USING (auth.uid() = user_id OR public.is_gestor());
