-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 008 — Níveis de acesso: assistente + permissões por módulo
-- Execute APÓS Scripts 001–007
-- ================================================================

-- ── 1. Adicionar role 'assistente' ───────────────────────────────
-- O CHECK constraint original precisa ser removido e recriado
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('condominino','assistente','sindico','admin','visualizador'));

-- ── 2. Tabela de permissões do assistente ────────────────────────
CREATE TABLE public.assistente_permissoes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  modulo        TEXT        NOT NULL
                              CHECK (modulo IN (
                                'financeiro','unidades','moradores','eventos',
                                'parceiros','ocorrencias','comunicados',
                                'documentos','agendamentos'
                              )),
  pode_inserir  BOOLEAN     NOT NULL DEFAULT false,
  pode_alterar  BOOLEAN     NOT NULL DEFAULT false,
  pode_excluir  BOOLEAN     NOT NULL DEFAULT false,
  granted_by    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, modulo)
);

CREATE TRIGGER assistente_permissoes_updated_at
  BEFORE UPDATE ON public.assistente_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_assistente_perm_user   ON public.assistente_permissoes(user_id);
CREATE INDEX idx_assistente_perm_modulo ON public.assistente_permissoes(modulo);

-- ── 3. Funções auxiliares ────────────────────────────────────────

-- Verifica se o usuário atual é gestor (síndico ou admin)
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT get_my_role() IN ('admin','sindico');
$$;

-- Verifica se assistente tem acesso a um módulo
CREATE OR REPLACE FUNCTION public.assistente_pode_ver(p_modulo TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assistente_permissoes
    WHERE user_id = auth.uid() AND modulo = p_modulo
  );
$$;

CREATE OR REPLACE FUNCTION public.assistente_pode_inserir(p_modulo TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE((
    SELECT pode_inserir FROM public.assistente_permissoes
    WHERE user_id = auth.uid() AND modulo = p_modulo
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.assistente_pode_alterar(p_modulo TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE((
    SELECT pode_alterar FROM public.assistente_permissoes
    WHERE user_id = auth.uid() AND modulo = p_modulo
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.assistente_pode_excluir(p_modulo TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE((
    SELECT pode_excluir FROM public.assistente_permissoes
    WHERE user_id = auth.uid() AND modulo = p_modulo
  ), false);
$$;

-- Verifica se tem acesso de gestão (gestor OU assistente com permissão)
CREATE OR REPLACE FUNCTION public.pode_gerir(p_modulo TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT is_gestor() OR assistente_pode_ver(p_modulo);
$$;

-- ── 4. RLS: assistente_permissoes ───────────────────────────────
ALTER TABLE public.assistente_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perm_leitura_proprio"
  ON public.assistente_permissoes FOR SELECT
  USING (user_id = auth.uid() OR public.is_gestor());

CREATE POLICY "perm_gestor_total"
  ON public.assistente_permissoes FOR ALL
  USING (public.is_gestor());

-- ── 5. Atualizar RLS das tabelas para incluir assistente ─────────

-- FINANCES
DROP POLICY IF EXISTS "financeiro_leitura"       ON public.finances;
DROP POLICY IF EXISTS "financeiro_gestor_total"   ON public.finances;

CREATE POLICY "financeiro_leitura"
  ON public.finances FOR SELECT
  USING (
    public.is_gestor()
    OR public.assistente_pode_ver('financeiro')
    OR unit_id = public.my_unit_id()
  );
CREATE POLICY "financeiro_inserir"
  ON public.finances FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('financeiro'));
CREATE POLICY "financeiro_alterar"
  ON public.finances FOR UPDATE
  USING (public.is_gestor() OR public.assistente_pode_alterar('financeiro'));
CREATE POLICY "financeiro_excluir"
  ON public.finances FOR DELETE
  USING (public.is_gestor() OR public.assistente_pode_excluir('financeiro'));

-- UNITS
DROP POLICY IF EXISTS "unidade_leitura"       ON public.units;
DROP POLICY IF EXISTS "unidade_gestor_total"  ON public.units;

CREATE POLICY "unidade_leitura"
  ON public.units FOR SELECT
  USING (public.is_gestor() OR public.assistente_pode_ver('unidades') OR owner_id = auth.uid());
CREATE POLICY "unidade_inserir"
  ON public.units FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('unidades'));
CREATE POLICY "unidade_alterar"
  ON public.units FOR UPDATE
  USING (public.is_gestor() OR public.assistente_pode_alterar('unidades'));
CREATE POLICY "unidade_excluir"
  ON public.units FOR DELETE
  USING (public.is_gestor() OR public.assistente_pode_excluir('unidades'));

-- PROFILES (moradores)
DROP POLICY IF EXISTS "perfil_leitura"          ON public.profiles;
DROP POLICY IF EXISTS "perfil_atualizar_proprio" ON public.profiles;
DROP POLICY IF EXISTS "perfil_inserir_gestor"   ON public.profiles;

CREATE POLICY "perfil_leitura"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_gestor() OR public.assistente_pode_ver('moradores'));
CREATE POLICY "perfil_atualizar_proprio"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_gestor() OR public.assistente_pode_alterar('moradores'));
CREATE POLICY "perfil_inserir"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('moradores'));

-- EVENTS
DROP POLICY IF EXISTS "evento_todos_veem"   ON public.events;
DROP POLICY IF EXISTS "evento_gestor_total" ON public.events;

CREATE POLICY "evento_leitura"
  ON public.events FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_public OR public.is_gestor() OR public.assistente_pode_ver('eventos')));
CREATE POLICY "evento_inserir"
  ON public.events FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('eventos'));
CREATE POLICY "evento_alterar"
  ON public.events FOR UPDATE
  USING (public.is_gestor() OR public.assistente_pode_alterar('eventos'));
CREATE POLICY "evento_excluir"
  ON public.events FOR DELETE
  USING (public.is_gestor() OR public.assistente_pode_excluir('eventos'));

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "comunicado_leitura"      ON public.announcements;
DROP POLICY IF EXISTS "comunicado_gestor_total" ON public.announcements;

CREATE POLICY "comunicado_leitura"
  ON public.announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      get_my_role() = ANY(target_roles)
      OR public.assistente_pode_ver('comunicados')
    )
  );
CREATE POLICY "comunicado_inserir"
  ON public.announcements FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('comunicados'));
CREATE POLICY "comunicado_alterar"
  ON public.announcements FOR UPDATE
  USING (public.is_gestor() OR public.assistente_pode_alterar('comunicados'));
CREATE POLICY "comunicado_excluir"
  ON public.announcements FOR DELETE
  USING (public.is_gestor() OR public.assistente_pode_excluir('comunicados'));

-- DOCUMENTS
DROP POLICY IF EXISTS "documento_leitura"      ON public.documents;
DROP POLICY IF EXISTS "documento_gestor_total" ON public.documents;

CREATE POLICY "documento_leitura"
  ON public.documents FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (is_public OR public.is_gestor() OR public.assistente_pode_ver('documentos') OR get_my_role() = ANY(access_roles))
  );
CREATE POLICY "documento_inserir"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('documentos'));
CREATE POLICY "documento_alterar"
  ON public.documents FOR UPDATE
  USING (public.is_gestor() OR public.assistente_pode_alterar('documentos'));
CREATE POLICY "documento_excluir"
  ON public.documents FOR DELETE
  USING (public.is_gestor() OR public.assistente_pode_excluir('documentos'));

-- PARCEIROS
DROP POLICY IF EXISTS "parceiro_leitura"      ON public.parceiros;
DROP POLICY IF EXISTS "parceiro_gestor_total" ON public.parceiros;

CREATE POLICY "parceiro_leitura"
  ON public.parceiros FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_active OR public.is_gestor() OR public.assistente_pode_ver('parceiros')));
CREATE POLICY "parceiro_inserir"
  ON public.parceiros FOR INSERT
  WITH CHECK (public.is_gestor() OR public.assistente_pode_inserir('parceiros'));
CREATE POLICY "parceiro_alterar"
  ON public.parceiros FOR UPDATE
  USING (public.is_gestor() OR public.assistente_pode_alterar('parceiros'));
CREATE POLICY "parceiro_excluir"
  ON public.parceiros FOR DELETE
  USING (public.is_gestor() OR public.assistente_pode_excluir('parceiros'));

-- INCIDENTS
DROP POLICY IF EXISTS "ocorrencia_leitura"  ON public.incidents;
DROP POLICY IF EXISTS "ocorrencia_atualizar" ON public.incidents;

CREATE POLICY "ocorrencia_leitura_v2"
  ON public.incidents FOR SELECT
  USING (public.is_gestor() OR public.assistente_pode_ver('ocorrencias') OR user_id = auth.uid());
CREATE POLICY "ocorrencia_atualizar_v2"
  ON public.incidents FOR UPDATE
  USING (user_id = auth.uid() OR public.is_gestor() OR public.assistente_pode_alterar('ocorrencias'));

-- BOOKINGS
DROP POLICY IF EXISTS "agendamento_cancelar_gestor" ON public.bookings;

CREATE POLICY "agendamento_leitura_assist"
  ON public.bookings FOR SELECT
  USING (public.is_gestor() OR public.assistente_pode_ver('agendamentos') OR user_id = auth.uid());
CREATE POLICY "agendamento_cancelar_v2"
  ON public.bookings FOR DELETE
  USING (public.is_gestor() OR public.assistente_pode_excluir('agendamentos'));

-- ── 6. Trigger: ao criar assistente, inicializar permissões zeradas ──
CREATE OR REPLACE FUNCTION public.init_assistente_permissoes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  modulos TEXT[] := ARRAY['financeiro','unidades','moradores','eventos',
                           'parceiros','ocorrencias','comunicados','documentos','agendamentos'];
  sindico_id UUID;
  m TEXT;
BEGIN
  IF NEW.role = 'assistente' AND (OLD IS NULL OR OLD.role <> 'assistente') THEN
    SELECT id INTO sindico_id FROM public.profiles
    WHERE role IN ('sindico','admin') ORDER BY created_at LIMIT 1;

    FOREACH m IN ARRAY modulos LOOP
      INSERT INTO public.assistente_permissoes
        (user_id, modulo, pode_inserir, pode_alterar, pode_excluir, granted_by)
      VALUES (NEW.id, m, false, false, false, COALESCE(sindico_id, NEW.id))
      ON CONFLICT (user_id, modulo) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_init_assistente
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.init_assistente_permissoes();
