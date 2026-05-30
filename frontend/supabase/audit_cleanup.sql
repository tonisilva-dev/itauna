-- ================================================================
-- AUDITORIA E LIMPEZA DO BANCO — Condomínio Chácaras Itaúna
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor)
--
-- INSTRUÇÕES:
--   1. Execute a SEÇÃO 1 (somente SELECT) para auditar o banco.
--   2. Revise os resultados — confirme que não há nada legítimo.
--   3. Execute a SEÇÃO 2 (DROP) somente após revisar.
--
-- As seções de DROP estão separadas e comentadas por segurança.
-- ================================================================


-- ================================================================
-- SEÇÃO 1 — AUDITORIA (apenas leitura, execute sempre)
-- ================================================================

-- ── 1A. Tabelas que existem mas NÃO pertencem ao projeto ─────────
SELECT
  schemaname,
  tablename,
  'DROP TABLE public.' || quote_ident(tablename) || ' CASCADE;' AS drop_stmt
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    -- Tabelas do projeto Itaúna (migrations 001–016)
    'profiles',
    'units',
    'finances',
    'bookings',
    'events',
    'incidents',
    'announcements',
    'documents',
    'parceiros',
    'event_parceiros',
    'event_inscricoes',
    'assistente_permissoes',
    'portaria_registros',
    'portaria_autorizados',
    'classificados',
    'achados_perdidos',
    'galeria_fotos',
    'areas_comuns',
    'telefones_uteis',
    'telefones_secretarias'
  )
ORDER BY tablename;


-- ── 1B. Tabelas do projeto que NÃO existem no banco (faltando) ───
SELECT unnest(ARRAY[
  'profiles','units','finances','bookings','events','incidents',
  'announcements','documents','parceiros','event_parceiros',
  'event_inscricoes','assistente_permissoes','portaria_registros',
  'portaria_autorizados','classificados','achados_perdidos',
  'galeria_fotos','areas_comuns','telefones_uteis','telefones_secretarias'
]) AS tabela_esperada
EXCEPT
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
ORDER BY tabela_esperada;


-- ── 1C. Funções que existem mas NÃO pertencem ao projeto ─────────
SELECT
  p.proname AS funcao,
  pg_get_function_identity_arguments(p.oid) AS argumentos,
  'DROP FUNCTION public.' || quote_ident(p.proname)
    || '(' || pg_get_function_identity_arguments(p.oid) || ');' AS drop_stmt
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname NOT IN (
    -- Funções do projeto Itaúna
    'set_updated_at',
    'get_my_role',
    'is_gestor',
    'my_unit_id',
    'assistente_pode_ver',
    'assistente_pode_inserir',
    'assistente_pode_alterar',
    'assistente_pode_excluir',
    'pode_gerir',
    'init_assistente_permissoes'
  )
ORDER BY p.proname;


-- ── 1D. Triggers que existem mas NÃO pertencem ao projeto ────────
SELECT
  trigger_name,
  event_object_table AS tabela,
  'DROP TRIGGER ' || quote_ident(trigger_name)
    || ' ON public.' || quote_ident(event_object_table) || ';' AS drop_stmt
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name NOT IN (
    -- Triggers do projeto Itaúna
    'profiles_updated_at',
    'units_updated_at',
    'finances_updated_at',
    'bookings_updated_at',
    'events_updated_at',
    'incidents_updated_at',
    'announcements_updated_at',
    'documents_updated_at',
    'parceiros_updated_at',
    'inscricoes_updated_at',
    'assistente_permissoes_updated_at',
    'trigger_init_assistente',
    'portaria_registros_updated_at',   -- pode não existir, sem updated_at
    'telefones_uteis_updated_at',
    'telefones_secretarias_updated_at',
    'areas_comuns_updated_at',
    -- Trigger do Supabase Auth (não remover)
    'on_auth_user_created'
  )
ORDER BY event_object_table, trigger_name;


-- ── 1E. Índices que existem mas NÃO pertencem ao projeto ─────────
SELECT
  indexname,
  tablename,
  'DROP INDEX IF EXISTS public.' || quote_ident(indexname) || ';' AS drop_stmt
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'       -- PKs: nunca remover
  AND indexname NOT IN (
    -- Índices do projeto Itaúna
    'idx_finances_unit',
    'idx_finances_status',
    'idx_finances_month',
    'idx_bookings_unit',
    'idx_bookings_date',
    'idx_events_date',
    'idx_incidents_status',
    'idx_incidents_unit',
    'idx_announcements_pinned',
    'idx_announcements_expires',
    'idx_documents_category',
    'idx_parceiros_categoria',
    'idx_parceiros_active',
    'idx_event_parceiros_event',
    'idx_event_parceiros_parceiro',
    'idx_inscricoes_event',
    'idx_inscricoes_user',
    'idx_inscricoes_status',
    'idx_assistente_perm_user',
    'idx_assistente_perm_modulo',
    'idx_portaria_reg_entrada',
    'idx_portaria_reg_status',
    'idx_classificados_created',
    'idx_classificados_cat',
    'idx_achados_created',
    'idx_achados_status',
    'idx_galeria_cat',
    'idx_galeria_created',
    'idx_bookings_area_id',
    'idx_bookings_ativo',
    'idx_bookings_status_pgto',
    'idx_areas_ativo',
    'idx_areas_reservavel',
    'idx_telefones_categoria',
    'idx_telefones_ordem',
    'idx_telefones_active',
    'idx_secretarias_telefone_id',
    'idx_secretarias_ordem'
  )
ORDER BY tablename, indexname;


-- ── 1F. Políticas RLS por tabela (inventário completo) ───────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd         AS operacao,
  qual        AS using_expr,
  with_check  AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ── 1G. Resumo geral de saúde do schema ──────────────────────────
SELECT
  (SELECT count(*) FROM pg_tables       WHERE schemaname = 'public')                           AS total_tabelas,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public') AS total_funcoes,
  (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public')           AS total_triggers,
  (SELECT count(*) FROM pg_indexes      WHERE schemaname = 'public')                           AS total_indices,
  (SELECT count(*) FROM pg_policies     WHERE schemaname = 'public')                           AS total_policies;


-- ================================================================
-- SEÇÃO 2 — LIMPEZA (execute SOMENTE após revisar a Seção 1)
-- Cole aqui os DROP statements gerados pela Seção 1 que você
-- confirmou serem seguros para remover.
-- ================================================================

-- Exemplo (descomente e ajuste conforme o resultado da Seção 1):
--
-- DROP TABLE public.tabela_orfan CASCADE;
-- DROP FUNCTION public.funcao_orfan();
-- DROP TRIGGER trigger_orfan ON public.alguma_tabela;
-- DROP INDEX IF EXISTS public.idx_orfan;
