-- ================================================================
-- SEED FINANCEIRO FICTÍCIO — para visualização dos gráficos
-- Execute no SQL Editor do Supabase
-- ================================================================

DO $$
DECLARE
  admin_id UUID;
  mes TEXT;
  i INT;
BEGIN
  SELECT id INTO admin_id FROM public.profiles
  WHERE role IN ('admin', 'sindico') ORDER BY created_at LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'Nenhum admin encontrado.';
    RETURN;
  END IF;

  -- 6 meses de histórico (mês atual até -5)
  FOR i IN 0..5 LOOP
    mes := TO_CHAR(NOW() - (i || ' months')::INTERVAL, 'YYYY-MM');

    -- ── RECEITAS ─────────────────────────────────────────────────

    -- Rateio condominial (360 chácaras × R$120)
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('receita', 'Rateio Individual',
      'Rateio condominial — ' || TO_CHAR(NOW() - (i || ' months')::INTERVAL, 'MM/YYYY'),
      43200.00,
      (mes || '-10')::DATE,
      CASE WHEN i > 0 THEN (mes || '-12')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Fundo de reserva
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('receita', 'Fundo de Reserva',
      'Fundo de reserva — ' || TO_CHAR(NOW() - (i || ' months')::INTERVAL, 'MM/YYYY'),
      7200.00,
      (mes || '-10')::DATE,
      CASE WHEN i > 0 THEN (mes || '-12')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Multas e juros (valor variável)
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('receita', 'Despesas Administrativas',
      'Multas e juros por inadimplência',
      (800 + (random() * 1200)::INT)::NUMERIC,
      (mes || '-15')::DATE,
      CASE WHEN i > 0 THEN (mes || '-16')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- ── DESPESAS ─────────────────────────────────────────────────

    -- Pessoal
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Despesas com Pessoal',
      'Folha de pagamento — porteiros e zelador',
      8600.00,
      (mes || '-05')::DATE,
      CASE WHEN i > 0 THEN (mes || '-05')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Encargos sociais
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Encargos Sociais',
      'FGTS + INSS + encargos trabalhistas',
      2800.00,
      (mes || '-07')::DATE,
      CASE WHEN i > 0 THEN (mes || '-07')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Serviços terceirizados (jardinagem/limpeza)
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Serviços Terceirizados',
      'Jardinagem e limpeza de áreas comuns',
      (2200 + (random() * 600)::INT)::NUMERIC,
      (mes || '-08')::DATE,
      CASE WHEN i > 0 THEN (mes || '-09')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Consumo (água/energia)
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Consumo Faturado',
      'Energia elétrica — áreas comuns e portaria',
      (1800 + (random() * 700)::INT)::NUMERIC,
      (mes || '-10')::DATE,
      CASE WHEN i > 0 THEN (mes || '-11')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Manutenção (variável)
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Manutenção',
      'Manutenção preventiva — bomba d''água e portões',
      (900 + (random() * 1800)::INT)::NUMERIC,
      (mes || '-12')::DATE,
      CASE WHEN i > 1 THEN (mes || '-13')::DATE ELSE NULL END,
      CASE WHEN i > 1 THEN 'pago' WHEN i = 1 THEN 'pendente' ELSE 'pendente' END,
      mes, admin_id);

    -- Despesas administrativas
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Despesas Administrativas',
      'Administradora — taxa de gestão condominial',
      1400.00,
      (mes || '-05')::DATE,
      CASE WHEN i > 0 THEN (mes || '-05')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Seguros
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Seguros Obrigatórios',
      'Seguro condominial obrigatório',
      680.00,
      (mes || '-15')::DATE,
      CASE WHEN i > 0 THEN (mes || '-15')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

    -- Despesas bancárias
    INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
    VALUES ('despesa', 'Despesas Bancárias',
      'Tarifas bancárias e IOF',
      (120 + (random() * 80)::INT)::NUMERIC,
      (mes || '-20')::DATE,
      CASE WHEN i > 0 THEN (mes || '-20')::DATE ELSE NULL END,
      CASE WHEN i > 0 THEN 'pago' ELSE 'pendente' END,
      mes, admin_id);

  END LOOP;

  -- ── DESPESAS EVENTUAIS (não mensais) ─────────────────────────

  -- Benfeitoria 3 meses atrás
  INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
  VALUES ('despesa', 'Benfeitorias / Reformas',
    'Reforma da guarita — portaria principal',
    18500.00,
    (TO_CHAR(NOW() - '3 months'::INTERVAL, 'YYYY-MM') || '-20')::DATE,
    (TO_CHAR(NOW() - '3 months'::INTERVAL, 'YYYY-MM') || '-22')::DATE,
    'pago',
    TO_CHAR(NOW() - '3 months'::INTERVAL, 'YYYY-MM'),
    admin_id);

  -- Reparo 2 meses atrás
  INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
  VALUES ('despesa', 'Reparos e Consertos',
    'Reparo da rede de drenagem pluvial',
    6300.00,
    (TO_CHAR(NOW() - '2 months'::INTERVAL, 'YYYY-MM') || '-18')::DATE,
    (TO_CHAR(NOW() - '2 months'::INTERVAL, 'YYYY-MM') || '-19')::DATE,
    'pago',
    TO_CHAR(NOW() - '2 months'::INTERVAL, 'YYYY-MM'),
    admin_id);

  -- Material mês passado
  INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
  VALUES ('despesa', 'Material de Consumo',
    'Compra de materiais de limpeza e EPI',
    890.00,
    (TO_CHAR(NOW() - '1 month'::INTERVAL, 'YYYY-MM') || '-10')::DATE,
    (TO_CHAR(NOW() - '1 month'::INTERVAL, 'YYYY-MM') || '-11')::DATE,
    'pago',
    TO_CHAR(NOW() - '1 month'::INTERVAL, 'YYYY-MM'),
    admin_id);

  -- Custas advocatícias
  INSERT INTO finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by)
  VALUES ('despesa', 'Custas Advocatícias',
    'Honorários advocatícios — cobrança de inadimplentes',
    2100.00,
    (TO_CHAR(NOW() - '1 month'::INTERVAL, 'YYYY-MM') || '-25')::DATE,
    NULL,
    'pendente',
    TO_CHAR(NOW() - '1 month'::INTERVAL, 'YYYY-MM'),
    admin_id);

  RAISE NOTICE 'Seed financeiro inserido com sucesso para admin_id = %', admin_id;
END $$;
