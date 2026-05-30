-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 001 — Schema + RLS + Triggers
-- Cole e execute no Supabase SQL Editor
-- ================================================================

-- ── EXTENSÕES ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- busca por similaridade

-- ================================================================
-- TABELA: profiles
-- Estende auth.users com dados do sistema
-- ================================================================
CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        UNIQUE NOT NULL,
  full_name     TEXT        NOT NULL DEFAULT '',
  role          TEXT        NOT NULL DEFAULT 'condominino'
                              CHECK (role IN ('admin', 'sindico', 'condominino')),
  unit_number   INT,
  phone         TEXT,
  avatar_url    TEXT,
  cpf           TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.profiles IS 'Perfis de usuários do sistema';
COMMENT ON COLUMN public.profiles.role IS 'admin | sindico | condominino';

-- Trigger: criar profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- TABELA: units (Chácaras)
-- ================================================================
CREATE TABLE public.units (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number   INT         UNIQUE NOT NULL,
  block         TEXT,
  owner_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_name    TEXT,
  monthly_fee   DECIMAL(10,2) NOT NULL DEFAULT 135.00,
  balance       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status        TEXT        NOT NULL DEFAULT 'regular'
                              CHECK (status IN ('regular', 'inadimplente', 'suspenso')),
  area_m2       INT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.units IS '360 chácaras do condomínio';
COMMENT ON COLUMN public.units.balance IS 'Positivo = crédito; negativo = débito';

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- TABELA: finances (Lançamentos financeiros)
-- ================================================================
CREATE TABLE public.finances (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id          UUID          REFERENCES public.units(id) ON DELETE SET NULL,
  type             TEXT          NOT NULL CHECK (type IN ('receita', 'despesa')),
  category         TEXT          NOT NULL DEFAULT 'Outros',
  description      TEXT          NOT NULL,
  amount           DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  due_date         DATE          NOT NULL,
  payment_date     DATE,
  status           TEXT          NOT NULL DEFAULT 'pendente'
                                   CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  reference_month  CHAR(7)       NOT NULL, -- formato YYYY-MM
  receipt_url      TEXT,
  notes            TEXT,
  created_by       UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.finances IS 'Receitas e despesas do condomínio';

CREATE TRIGGER finances_updated_at
  BEFORE UPDATE ON public.finances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- TABELA: bookings (Agendamentos de áreas comuns)
-- ================================================================
CREATE TABLE public.bookings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID        NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_name     TEXT        NOT NULL,
  booking_date  DATE        NOT NULL,
  start_time    TIME        NOT NULL,
  end_time      TIME        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'confirmado'
                              CHECK (status IN ('confirmado', 'cancelado', 'concluido')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Impede conflito de horário na mesma área no mesmo dia
  CONSTRAINT no_booking_overlap UNIQUE (area_name, booking_date, start_time),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

COMMENT ON TABLE public.bookings IS 'Reservas de áreas comuns (piscina, salão, quadra...)';

-- ================================================================
-- TABELA: events (Eventos do condomínio)
-- ================================================================
CREATE TABLE public.events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  event_date       DATE        NOT NULL,
  start_time       TIME,
  end_time         TIME,
  location         TEXT,
  category         TEXT        NOT NULL DEFAULT 'Informativo',
  max_participants INT,
  image_url        TEXT,
  is_public        BOOLEAN     NOT NULL DEFAULT true,
  created_by       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- TABELA: incidents (Ocorrências / Chamados)
-- ================================================================
CREATE TABLE public.incidents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      UUID        REFERENCES public.units(id) ON DELETE SET NULL,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category     TEXT        NOT NULL DEFAULT 'Geral',
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  photo_url    TEXT,
  status       TEXT        NOT NULL DEFAULT 'aberto'
                             CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  priority     TEXT        NOT NULL DEFAULT 'media'
                             CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  assigned_to  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution   TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- TABELA: announcements (Comunicados)
-- ================================================================
CREATE TABLE public.announcements (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  content        TEXT        NOT NULL,
  category       TEXT        NOT NULL DEFAULT 'Informativo',
  priority       TEXT        NOT NULL DEFAULT 'normal'
                               CHECK (priority IN ('normal', 'importante', 'urgente')),
  target_roles   TEXT[]      NOT NULL DEFAULT '{condominino,sindico,admin}',
  is_pinned      BOOLEAN     NOT NULL DEFAULT false,
  expires_at     TIMESTAMPTZ,
  attachment_url TEXT,
  created_by     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- TABELA: documents (Documentos / Arquivos)
-- ================================================================
CREATE TABLE public.documents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  description  TEXT,
  category     TEXT        NOT NULL DEFAULT 'Geral',
  file_url     TEXT        NOT NULL,
  file_name    TEXT,
  file_size    BIGINT,                           -- bytes
  file_type    TEXT,                             -- pdf, xlsx, jpg...
  is_public    BOOLEAN     NOT NULL DEFAULT true,
  access_roles TEXT[]      NOT NULL DEFAULT '{condominino,sindico,admin}',
  created_by   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- ÍNDICES DE PERFORMANCE
-- ================================================================
-- finances
CREATE INDEX idx_finances_unit          ON public.finances(unit_id);
CREATE INDEX idx_finances_month         ON public.finances(reference_month);
CREATE INDEX idx_finances_status        ON public.finances(status);
CREATE INDEX idx_finances_due_date      ON public.finances(due_date);
CREATE INDEX idx_finances_type          ON public.finances(type);
-- bookings
CREATE INDEX idx_bookings_date          ON public.bookings(booking_date);
CREATE INDEX idx_bookings_unit          ON public.bookings(unit_id);
CREATE INDEX idx_bookings_area          ON public.bookings(area_name);
-- incidents
CREATE INDEX idx_incidents_status       ON public.incidents(status);
CREATE INDEX idx_incidents_priority     ON public.incidents(priority);
CREATE INDEX idx_incidents_unit         ON public.incidents(unit_id);
CREATE INDEX idx_incidents_assigned     ON public.incidents(assigned_to);
-- announcements
CREATE INDEX idx_announcements_pinned   ON public.announcements(is_pinned);
CREATE INDEX idx_announcements_priority ON public.announcements(priority);
-- units
CREATE INDEX idx_units_status           ON public.units(status);
CREATE INDEX idx_units_owner            ON public.units(owner_id);
-- profiles
CREATE INDEX idx_profiles_role          ON public.profiles(role);
CREATE INDEX idx_profiles_unit          ON public.profiles(unit_number);
-- events
CREATE INDEX idx_events_date            ON public.events(event_date);

-- Busca por texto (pg_trgm)
CREATE INDEX idx_profiles_name_trgm ON public.profiles USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_units_owner_trgm   ON public.units    USING GIN (owner_name gin_trgm_ops);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents     ENABLE ROW LEVEL SECURITY;

-- ── Funções auxiliares ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_my_role() IN ('admin', 'sindico');
$$;

CREATE OR REPLACE FUNCTION public.my_unit_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.units
  WHERE owner_id = auth.uid()
  LIMIT 1;
$$;

-- ── POLÍTICAS: profiles ──────────────────────────────────────────
CREATE POLICY "perfil_leitura"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR is_gestor());

CREATE POLICY "perfil_atualizar_proprio"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR is_gestor());

CREATE POLICY "perfil_inserir_gestor"
  ON public.profiles FOR INSERT
  WITH CHECK (is_gestor());

-- ── POLÍTICAS: units ─────────────────────────────────────────────
CREATE POLICY "unidade_leitura"
  ON public.units FOR SELECT
  USING (
    is_gestor()
    OR owner_id = auth.uid()
  );

CREATE POLICY "unidade_gestor_total"
  ON public.units FOR ALL
  USING (is_gestor());

-- ── POLÍTICAS: finances ──────────────────────────────────────────
CREATE POLICY "financeiro_leitura"
  ON public.finances FOR SELECT
  USING (
    is_gestor()
    OR unit_id = my_unit_id()
  );

CREATE POLICY "financeiro_gestor_total"
  ON public.finances FOR ALL
  USING (is_gestor());

-- ── POLÍTICAS: bookings ──────────────────────────────────────────
CREATE POLICY "agendamento_leitura"
  ON public.bookings FOR SELECT
  USING (
    is_gestor()
    OR user_id = auth.uid()
  );

CREATE POLICY "agendamento_inserir"
  ON public.bookings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "agendamento_atualizar"
  ON public.bookings FOR UPDATE
  USING (user_id = auth.uid() OR is_gestor());

CREATE POLICY "agendamento_cancelar_gestor"
  ON public.bookings FOR DELETE
  USING (is_gestor());

-- ── POLÍTICAS: events ────────────────────────────────────────────
CREATE POLICY "evento_todos_veem"
  ON public.events FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_public OR is_gestor()));

CREATE POLICY "evento_gestor_total"
  ON public.events FOR ALL
  USING (is_gestor());

-- ── POLÍTICAS: incidents ─────────────────────────────────────────
CREATE POLICY "ocorrencia_leitura"
  ON public.incidents FOR SELECT
  USING (
    is_gestor()
    OR user_id = auth.uid()
  );

CREATE POLICY "ocorrencia_abrir"
  ON public.incidents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ocorrencia_atualizar"
  ON public.incidents FOR UPDATE
  USING (user_id = auth.uid() OR is_gestor());

-- ── POLÍTICAS: announcements ─────────────────────────────────────
CREATE POLICY "comunicado_leitura"
  ON public.announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND get_my_role() = ANY(target_roles)
  );

CREATE POLICY "comunicado_gestor_total"
  ON public.announcements FOR ALL
  USING (is_gestor());

-- ── POLÍTICAS: documents ─────────────────────────────────────────
CREATE POLICY "documento_leitura"
  ON public.documents FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_public
      OR is_gestor()
      OR get_my_role() = ANY(access_roles)
    )
  );

CREATE POLICY "documento_gestor_total"
  ON public.documents FOR ALL
  USING (is_gestor());
