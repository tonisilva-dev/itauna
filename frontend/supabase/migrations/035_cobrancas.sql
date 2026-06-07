-- Sistema de cobranças: mensalidades por unidade com integração Asaas + CNAB 240
CREATE TABLE IF NOT EXISTS public.cobrancas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number      INT         NOT NULL,
  unit_id          UUID        REFERENCES public.units(id) ON DELETE SET NULL,
  morador_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reference_month  TEXT        NOT NULL,                -- YYYY-MM
  amount           NUMERIC     NOT NULL,
  due_date         DATE        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pendente'
                                 CHECK (status IN ('pendente','pago','vencido','cancelado')),
  payment_date     DATE,
  payment_method   TEXT,                               -- 'boleto','pix','cnab','manual'
  -- Asaas
  asaas_id         TEXT,                               -- pay_xxxxxxxx
  asaas_invoice_url TEXT,                              -- link do boleto
  asaas_pix_qrcode  TEXT,                              -- QR code PIX
  asaas_pix_payload TEXT,                              -- copia-e-cola PIX
  asaas_customer_id TEXT,                              -- cus_xxxxxxxx
  -- CNAB
  cnab_nosso_numero TEXT,                              -- identificador no arquivo de retorno
  cnab_imported_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_number, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_cobrancas_month  ON public.cobrancas (reference_month);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status ON public.cobrancas (status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas  ON public.cobrancas (asaas_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_morador ON public.cobrancas (morador_id);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

-- Gestores vêem e gerenciam todas as cobranças
CREATE POLICY "cobrancas_gestor_all" ON public.cobrancas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','sindico','assistente')
    )
  );

-- Moradores vêem apenas as próprias
CREATE POLICY "cobrancas_morador_own" ON public.cobrancas
  FOR SELECT TO authenticated
  USING (morador_id = auth.uid());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_cobrancas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_cobrancas_updated_at
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW EXECUTE FUNCTION public.set_cobrancas_updated_at();
