-- ================================================================
-- AUDITORIA E LIMPEZA DO BANCO — Condomínio Chácaras Itaúna
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor)
--
-- RESULTADO DA AUDITORIA INICIAL (2026-05-30): banco 100% limpo.
-- Nenhum objeto órfão encontrado — todas as queries 1A–1E retornam
-- vazio quando o banco está sincronizado com as migrations.
--
-- INSTRUÇÕES:
--   1. Execute a SEÇÃO 1 (somente SELECT) para auditar o banco.
--   2. Revise os resultados — confirme que não há nada legítimo.
--   3. Execute a SEÇÃO 2 (DROP) somente após revisar.
-- ================================================================


-- ================================================================
-- SEÇÃO 1 — AUDITORIA (apenas leitura, execute sempre)
-- ================================================================

-- ── 1A. Tabelas órfãs (existem mas não são do projeto) ───────────
SELECT
  tablename,
  'DROP TABLE public.' || quote_ident(tablename) || ' CASCADE;' AS drop_stmt
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    'profiles','units','finances','bookings','events','incidents',
    'announcements','documents','parceiros','event_parceiros',
    'event_inscricoes','assistente_permissoes','portaria_registros',
    'portaria_autorizados','classificados','achados_perdidos',
    'galeria_fotos','areas_comuns','telefones_uteis','telefones_secretarias'
  )
ORDER BY tablename;


-- ── 1B. Tabelas do projeto ausentes no banco ──────────────────────
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


-- ── 1C. Funções órfãs ────────────────────────────────────────────
SELECT
  p.proname AS funcao,
  pg_get_function_identity_arguments(p.oid) AS argumentos,
  'DROP FUNCTION public.' || quote_ident(p.proname)
    || '(' || pg_get_function_identity_arguments(p.oid) || ');' AS drop_stmt
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname NOT IN (
    -- Funções do projeto (migrations 001–016)
    'set_updated_at',
    'get_my_role',
    'is_gestor',
    'my_unit_id',
    'assistente_pode_ver',
    'assistente_pode_inserir',
    'assistente_pode_alterar',
    'assistente_pode_excluir',
    'pode_gerir',
    'init_assistente_permissoes',
    -- Supabase Auth trigger (cria profile ao registrar usuário)
    'handle_new_user',
    -- Extensão pg_trgm (busca fuzzy por nome em profiles e units)
    'gin_extract_query_trgm','gin_extract_value_trgm',
    'gin_trgm_consistent','gin_trgm_triconsistent',
    'gtrgm_compress','gtrgm_consistent','gtrgm_decompress',
    'gtrgm_distance','gtrgm_in','gtrgm_options','gtrgm_out',
    'gtrgm_penalty','gtrgm_picksplit','gtrgm_same','gtrgm_union',
    'set_limit','show_limit','show_trgm','similarity',
    'similarity_dist','similarity_op',
    'strict_word_similarity','strict_word_similarity_commutator_op',
    'strict_word_similarity_dist_commutator_op','strict_word_similarity_dist_op',
    'strict_word_similarity_op','word_similarity',
    'word_similarity_commutator_op','word_similarity_dist_commutator_op',
    'word_similarity_dist_op','word_similarity_op'
  )
ORDER BY p.proname;


-- ── 1D. Triggers órfãos ──────────────────────────────────────────
SELECT
  trigger_name,
  event_object_table AS tabela,
  'DROP TRIGGER ' || quote_ident(trigger_name)
    || ' ON public.' || quote_ident(event_object_table) || ';' AS drop_stmt
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name NOT IN (
    -- Triggers do projeto (um updated_at por tabela + especiais)
    'profiles_updated_at','units_updated_at','finances_updated_at',
    'bookings_updated_at','events_updated_at','incidents_updated_at',
    'announcements_updated_at','documents_updated_at',
    'parceiros_updated_at','inscricoes_updated_at',
    'assistente_permissoes_updated_at','trigger_init_assistente',
    'telefones_uteis_updated_at','telefones_secretarias_updated_at',
    'areas_comuns_updated_at',
    -- Supabase Auth
    'on_auth_user_created'
  )
ORDER BY event_object_table, trigger_name;


-- ── 1E. Índices órfãos ───────────────────────────────────────────
SELECT
  indexname, tablename,
  'DROP INDEX IF EXISTS public.' || quote_ident(indexname) || ';' AS drop_stmt
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
  AND indexname NOT IN (
    -- ── Índices nomeados (migrations 001–016) ──
    -- finances
    'idx_finances_unit','idx_finances_status','idx_finances_month',
    'idx_finances_due_date','idx_finances_type',
    -- bookings
    'idx_bookings_unit','idx_bookings_date','idx_bookings_area',
    'idx_bookings_area_id','idx_bookings_ativo','idx_bookings_status_pgto',
    'no_booking_overlap',
    -- events
    'idx_events_date',
    -- incidents
    'idx_incidents_status','idx_incidents_unit',
    'idx_incidents_assigned','idx_incidents_priority',
    -- announcements
    'idx_announcements_pinned','idx_announcements_expires',
    'idx_announcements_priority',
    -- documents
    'idx_documents_category',
    -- profiles
    'idx_profiles_role','idx_profiles_unit','idx_profiles_name_trgm',
    -- units
    'idx_units_status','idx_units_owner','idx_units_owner_trgm',
    -- parceiros
    'idx_parceiros_categoria','idx_parceiros_active',
    -- event_parceiros / event_inscricoes
    'idx_event_parceiros_event','idx_event_parceiros_parceiro',
    'idx_inscricoes_event','idx_inscricoes_user','idx_inscricoes_status',
    -- assistente_permissoes
    'idx_assistente_perm_user','idx_assistente_perm_modulo',
    -- portaria
    'idx_portaria_reg_entrada','idx_portaria_reg_status',
    -- classificados / achados
    'idx_classificados_created','idx_classificados_cat',
    'idx_achados_created','idx_achados_status',
    -- galeria / areas_comuns
    'idx_galeria_cat','idx_galeria_created',
    'idx_areas_ativo','idx_areas_reservavel',
    -- telefones
    'idx_telefones_categoria','idx_telefones_ordem','idx_telefones_active',
    'idx_secretarias_telefone_id','idx_secretarias_ordem',
    -- ── Índices de UNIQUE constraints (criados pelo PostgreSQL) ──
    'profiles_email_key',
    'units_unit_number_key',
    'areas_comuns_nome_key',
    'assistente_permissoes_user_id_modulo_key',
    'event_parceiros_event_id_parceiro_id_key'
  )
ORDER BY tablename, indexname;


-- ── 1F. Políticas RLS por tabela (inventário completo) ───────────
SELECT
  tablename, policyname,
  cmd AS operacao, qual AS using_expr, with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ── 1G. Resumo geral de saúde do schema ──────────────────────────
-- Estado esperado após sincronização completa:
--   total_tabelas : 20
--   total_funcoes : 42  (10 projeto + 1 auth + 31 pg_trgm)
--   total_triggers: 14
--   total_indices : 74
--   total_policies: 63
SELECT
  (SELECT count(*) FROM pg_tables
    WHERE schemaname = 'public')                                                                   AS total_tabelas,
  (SELECT count(*) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public')                      AS total_funcoes,
  (SELECT count(*) FROM information_schema.triggers
    WHERE trigger_schema = 'public')                                                               AS total_triggers,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public')                                                                   AS total_indices,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public')                                                                   AS total_policies;


-- ================================================================
-- SEÇÃO 2 — LIMPEZA (execute SOMENTE após revisar a Seção 1)
-- Cole aqui os DROP statements gerados pelas queries acima que
-- você confirmou serem seguros para remover.
-- ================================================================

-- (vazio — banco 100% limpo em 2026-05-30)
