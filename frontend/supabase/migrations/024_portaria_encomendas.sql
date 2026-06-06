-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 024 — Controle de encomendas e correspondências
-- ================================================================

CREATE TABLE public.portaria_encomendas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chacara_numero  TEXT        NOT NULL,
  descricao       TEXT        NOT NULL,
  tipo            TEXT        NOT NULL DEFAULT 'outro'
                                CHECK (tipo IN ('correios','motoboy','app_delivery','outro')),
  remetente       TEXT,
  status          TEXT        NOT NULL DEFAULT 'aguardando'
                                CHECK (status IN ('aguardando','retirada')),
  registrado_por  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  retirada_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enc_chacara ON public.portaria_encomendas(chacara_numero, status);
CREATE INDEX idx_enc_status  ON public.portaria_encomendas(status, created_at DESC);

ALTER TABLE public.portaria_encomendas ENABLE ROW LEVEL SECURITY;

-- Gestor: acesso total. Morador: vê apenas as da própria chácara.
CREATE POLICY "enc_select"
  ON public.portaria_encomendas FOR SELECT
  USING (
    public.is_gestor()
    OR chacara_numero = LPAD(CAST((
      SELECT unit_number FROM public.profiles WHERE id = auth.uid()
    ) AS TEXT), 3, '0')
  );

CREATE POLICY "enc_insert_gestor"
  ON public.portaria_encomendas FOR INSERT
  WITH CHECK (public.is_gestor());

CREATE POLICY "enc_update_gestor"
  ON public.portaria_encomendas FOR UPDATE
  USING (public.is_gestor());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portaria_encomendas;
