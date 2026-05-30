-- Registro diário de entradas e saídas na portaria
CREATE TABLE public.portaria_registros (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT        NOT NULL,
  veiculo         TEXT,
  tipo            TEXT        NOT NULL DEFAULT 'visitante'
                                CHECK (tipo IN ('visitante','entrega','servico')),
  destino         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'dentro'
                                CHECK (status IN ('dentro','saiu')),
  entrada_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  saida_at        TIMESTAMPTZ,
  registrado_por  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portaria_reg_entrada ON public.portaria_registros(entrada_at DESC);
CREATE INDEX idx_portaria_reg_status  ON public.portaria_registros(status);

ALTER TABLE public.portaria_registros ENABLE ROW LEVEL SECURITY;

-- Gestores e assistentes leem/escrevem; moradores só leem
CREATE POLICY "portaria_select" ON public.portaria_registros FOR SELECT USING (true);
CREATE POLICY "portaria_insert" ON public.portaria_registros FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('moradores'));
CREATE POLICY "portaria_update" ON public.portaria_registros FOR UPDATE
  USING (public.is_gestor() OR public.assistente_pode_alterar('moradores'));

-- Prestadores autorizados de acesso fixo
CREATE TABLE public.portaria_autorizados (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  chacara     TEXT,
  dias        TEXT,
  validade    DATE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.portaria_autorizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autorizados_select" ON public.portaria_autorizados FOR SELECT USING (true);
CREATE POLICY "autorizados_all"    ON public.portaria_autorizados FOR ALL
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

-- Seed de autorizados de exemplo
INSERT INTO public.portaria_autorizados (nome, chacara, dias, validade) VALUES
  ('Ana Paula (Faxina)',   'Chácara 045', 'Seg, Qua, Sex', '2025-12-31'),
  ('Roberto (Jardineiro)', 'Chácara 112', 'Ter, Qui',      '2026-01-31'),
  ('Empresa Piscinas',     'Chácara 201', 'Toda segunda',  '2026-06-30');
