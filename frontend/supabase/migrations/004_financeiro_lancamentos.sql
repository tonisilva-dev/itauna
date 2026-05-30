-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 004 — Seed: Lançamentos financeiros de exemplo
-- Execute APÓS Scripts 001, 002 e 003
-- ================================================================

DO $$
DECLARE
  admin_id  UUID;
  u_id      UUID;
  mes       TEXT;
  n         INT;
BEGIN
  SELECT id INTO admin_id FROM public.profiles
  WHERE role IN ('admin', 'sindico') ORDER BY created_at LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'Admin não encontrado. Execute o script 003 primeiro.';
    RETURN;
  END IF;

  -- ── DESPESAS FIXAS (últimos 6 meses) ────────────────────────
  FOR i IN 0..5 LOOP
    mes := TO_CHAR(NOW() - (i || ' months')::INTERVAL, 'YYYY-MM');

    -- Segurança
    INSERT INTO public.finances (unit_id, type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES (NULL, 'despesa', 'Segurança', 'Vigilância mensal — empresa contratada', 4500.00,
      (mes || '-01')::DATE + 0,
      CASE WHEN i > 0 THEN (mes || '-01')::DATE + 1 ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Limpeza
    INSERT INTO public.finances (unit_id, type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES (NULL, 'despesa', 'Limpeza', 'Limpeza das vias e áreas comuns', 3200.00,
      (mes || '-05')::DATE,
      CASE WHEN i > 0 THEN (mes || '-05')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Energia elétrica
    INSERT INTO public.finances (unit_id, type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES (NULL, 'despesa', 'Energia', 'Energia elétrica — áreas comuns e iluminação', 2100.00,
      (mes || '-15')::DATE,
      CASE WHEN i > 0 THEN (mes || '-16')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Água / esgoto
    INSERT INTO public.finances (unit_id, type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES (NULL, 'despesa', 'Água', 'Sistema de abastecimento e manutenção', 1400.00,
      (mes || '-10')::DATE,
      CASE WHEN i > 0 THEN (mes || '-10')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Administração
    INSERT INTO public.finances (unit_id, type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES (NULL, 'despesa', 'Administração', 'Taxa de administração — escritório contábil', 1200.00,
      (mes || '-05')::DATE,
      CASE WHEN i > 0 THEN (mes || '-05')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);
  END LOOP;

  -- ── RECEITAS: TAXAS CONDOMINIAIS (mês atual) ─────────────────
  mes := TO_CHAR(NOW(), 'YYYY-MM');

  -- Seleciona 15 unidades aleatórias como exemplo
  FOR n IN 1..15 LOOP
    SELECT id INTO u_id FROM public.units
    WHERE unit_number = (n * 24) % 360 + 1;

    IF u_id IS NOT NULL THEN
      INSERT INTO public.finances (unit_id, type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
      VALUES (
        u_id, 'receita', 'Taxa Condominial',
        'Taxa condominial — ' || TO_CHAR(NOW(), 'Mon/YYYY'),
        135.00,
        (mes || '-10')::DATE,
        CASE WHEN n % 3 != 0 THEN (mes || '-0' || (7 + n % 3)::TEXT)::DATE ELSE NULL END,
        CASE WHEN n % 4 = 0 THEN 'vencido'
             WHEN n % 3 = 0 THEN 'pendente'
             ELSE 'pago' END,
        mes, admin_id
      );
    END IF;
  END LOOP;

  -- ── MANUTENÇÃO EXTRAORDINÁRIA ────────────────────────────────
  INSERT INTO public.finances (unit_id, type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
  VALUES
    (NULL, 'despesa', 'Manutenção', 'Reparo do portão eletrônico da entrada principal', 1850.00,
     NOW()::DATE - 16, NOW()::DATE - 15, 'pago',
     TO_CHAR(NOW() - '1 month'::INTERVAL, 'YYYY-MM'), admin_id),
    (NULL, 'despesa', 'Manutenção', 'Troca de lâmpadas LED — iluminação pública interna', 980.00,
     NOW()::DATE - 10, NOW()::DATE - 9, 'pago',
     TO_CHAR(NOW(), 'YYYY-MM'), admin_id),
    (NULL, 'despesa', 'Jardinagem', 'Poda de árvores e manutenção do paisagismo', 2400.00,
     NOW()::DATE + 5, NULL, 'pendente',
     TO_CHAR(NOW(), 'YYYY-MM'), admin_id),
    (NULL, 'receita', 'Multa', 'Multa por infração ao regulamento — uso indevido de área comum', 270.00,
     NOW()::DATE - 5, NOW()::DATE - 4, 'pago',
     TO_CHAR(NOW(), 'YYYY-MM'), admin_id);

  RAISE NOTICE 'Lançamentos financeiros inseridos com sucesso!';
END;
$$;
