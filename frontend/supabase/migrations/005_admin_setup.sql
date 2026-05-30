-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 005 — Setup do administrador e configurações
-- Execute APÓS criar o usuário no Supabase Auth
-- ================================================================

-- ── PASSO 1: Promover usuário a admin ───────────────────────────
-- Substitua pelo e-mail real do administrador
UPDATE public.profiles
SET role = 'admin',
    full_name = 'Administrador Itaúna'   -- ajuste o nome
WHERE email = 'admin@itauna.org';        -- ← ALTERE AQUI

-- ── PASSO 2: Promover síndico ────────────────────────────────────
-- UPDATE public.profiles
-- SET role = 'sindico',
--     full_name = 'JBembem'             -- ajuste o nome
-- WHERE email = 'sindico@itauna.org';   -- ← ALTERE AQUI

-- ── PASSO 3: Vincular morador à chácara ─────────────────────────
-- Após o morador criar conta, vincule à unidade:
-- UPDATE public.profiles
-- SET unit_number = 12,                 -- número da chácara
--     phone = '(19) 99999-0001'
-- WHERE email = 'joao@email.com';

-- UPDATE public.units
-- SET owner_id = (SELECT id FROM public.profiles WHERE email = 'joao@email.com'),
--     owner_name = 'João Silva'
-- WHERE unit_number = 12;

-- ── PASSO 4: Verificar configuração ─────────────────────────────
SELECT
  p.full_name,
  p.email,
  p.role,
  p.unit_number,
  p.is_active,
  u.status AS unit_status
FROM public.profiles p
LEFT JOIN public.units u ON u.unit_number = p.unit_number
ORDER BY p.role, p.full_name;

-- ── PASSO 5: Verificar RLS ────────────────────────────────────────
-- Confirmar que as funções auxiliares estão corretas:
SELECT public.get_my_role();   -- retorna null se não autenticado
SELECT public.is_gestor();     -- retorna false se não autenticado
