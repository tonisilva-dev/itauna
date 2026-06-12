-- ================================================================
-- 038 — Garante finance_trend RPC + re-seed histórico 6 meses
-- Execute no SQL Editor do Supabase (idempotente)
-- ================================================================

-- 1. Recria a função (garante que existe no remoto)
CREATE OR REPLACE FUNCTION public.finance_trend()
RETURNS TABLE(mes TEXT, receitas NUMERIC, despesas NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    reference_month,
    COALESCE(SUM(amount) FILTER (WHERE type = 'receita'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'despesa'), 0)
  FROM finances
  GROUP BY reference_month
  ORDER BY reference_month;
$$;

GRANT EXECUTE ON FUNCTION public.finance_trend() TO authenticated, anon;

-- 2. Remove seed anterior para reinserir limpo
DELETE FROM finances
WHERE description ILIKE '%seed%'
   OR description ILIKE '%rateio condominial%'
   OR description ILIKE '%folha de pagamento%'
   OR description ILIKE '%fgts%'
   OR description ILIKE '%jardinagem%'
   OR description ILIKE '%energia elétrica%'
   OR description ILIKE '%manutenção preventiva%'
   OR description ILIKE '%taxa de gestão%'
   OR description ILIKE '%seguro condominial%'
   OR description ILIKE '%tarifas bancárias%'
   OR description ILIKE '%reforma da guarita%'
   OR description ILIKE '%reparo da rede%'
   OR description ILIKE '%materiais de limpeza%'
   OR description ILIKE '%honorários advocatícios%'
   OR description ILIKE '%multas e juros%'
   OR description ILIKE '%fundo de reserva%';

-- 3. Re-seed com 6 meses (idempotente após o DELETE acima)
DO $$
DECLARE
  admin_id UUID;
  mes      TEXT;
  i        INT;
BEGIN
  SELECT id INTO admin_id FROM public.profiles
  WHERE role IN ('admin','sindico') ORDER BY created_at LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum admin/síndico encontrado em profiles.';
  END IF;

  FOR i IN 0..5 LOOP
    mes := TO_CHAR(NOW() - (i || ' months')::INTERVAL, 'YYYY-MM');

    -- Receitas
    INSERT INTO finances (type,category,description,amount,due_date,payment_date,status,reference_month,created_by) VALUES
      ('receita','Rateio Individual',
       'Rateio condominial — '||TO_CHAR(NOW()-(i||' months')::INTERVAL,'MM/YYYY'),
       43200.00,(mes||'-10')::DATE,
       CASE WHEN i>0 THEN (mes||'-12')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('receita','Fundo de Reserva',
       'Fundo de reserva — '||TO_CHAR(NOW()-(i||' months')::INTERVAL,'MM/YYYY'),
       7200.00,(mes||'-10')::DATE,
       CASE WHEN i>0 THEN (mes||'-12')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('receita','Despesas Administrativas',
       'Multas e juros por inadimplência',
       (800+(random()*1200)::INT)::NUMERIC,(mes||'-15')::DATE,
       CASE WHEN i>0 THEN (mes||'-16')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id);

    -- Despesas fixas
    INSERT INTO finances (type,category,description,amount,due_date,payment_date,status,reference_month,created_by) VALUES
      ('despesa','Despesas com Pessoal',
       'Folha de pagamento — porteiros e zelador',
       8600.00,(mes||'-05')::DATE,
       CASE WHEN i>0 THEN (mes||'-05')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('despesa','Encargos Sociais',
       'FGTS + INSS + encargos trabalhistas',
       2800.00,(mes||'-07')::DATE,
       CASE WHEN i>0 THEN (mes||'-07')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('despesa','Serviços Terceirizados',
       'Jardinagem e limpeza de áreas comuns',
       (2200+(random()*600)::INT)::NUMERIC,(mes||'-08')::DATE,
       CASE WHEN i>0 THEN (mes||'-09')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('despesa','Consumo Faturado',
       'Energia elétrica — áreas comuns e portaria',
       (1800+(random()*700)::INT)::NUMERIC,(mes||'-10')::DATE,
       CASE WHEN i>0 THEN (mes||'-11')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('despesa','Manutenção',
       'Manutenção preventiva — bomba d''água e portões',
       (900+(random()*1800)::INT)::NUMERIC,(mes||'-12')::DATE,
       CASE WHEN i>1 THEN (mes||'-13')::DATE END,
       CASE WHEN i>1 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('despesa','Despesas Administrativas',
       'Taxa de gestão condominial',
       1400.00,(mes||'-05')::DATE,
       CASE WHEN i>0 THEN (mes||'-05')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('despesa','Seguros Obrigatórios',
       'Seguro condominial obrigatório',
       680.00,(mes||'-15')::DATE,
       CASE WHEN i>0 THEN (mes||'-15')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id),

      ('despesa','Despesas Bancárias',
       'Tarifas bancárias e IOF',
       (120+(random()*80)::INT)::NUMERIC,(mes||'-20')::DATE,
       CASE WHEN i>0 THEN (mes||'-20')::DATE END,
       CASE WHEN i>0 THEN 'pago' ELSE 'pendente' END, mes, admin_id);
  END LOOP;

  -- Despesas eventuais
  INSERT INTO finances (type,category,description,amount,due_date,payment_date,status,reference_month,created_by) VALUES
    ('despesa','Benfeitorias / Reformas',
     'Reforma da guarita — portaria principal',18500.00,
     (TO_CHAR(NOW()-'3 months'::INTERVAL,'YYYY-MM')||'-20')::DATE,
     (TO_CHAR(NOW()-'3 months'::INTERVAL,'YYYY-MM')||'-22')::DATE,
     'pago',TO_CHAR(NOW()-'3 months'::INTERVAL,'YYYY-MM'),admin_id),

    ('despesa','Reparos e Consertos',
     'Reparo da rede de drenagem pluvial',6300.00,
     (TO_CHAR(NOW()-'2 months'::INTERVAL,'YYYY-MM')||'-18')::DATE,
     (TO_CHAR(NOW()-'2 months'::INTERVAL,'YYYY-MM')||'-19')::DATE,
     'pago',TO_CHAR(NOW()-'2 months'::INTERVAL,'YYYY-MM'),admin_id),

    ('despesa','Material de Consumo',
     'Materiais de limpeza e EPI',890.00,
     (TO_CHAR(NOW()-'1 month'::INTERVAL,'YYYY-MM')||'-10')::DATE,
     (TO_CHAR(NOW()-'1 month'::INTERVAL,'YYYY-MM')||'-11')::DATE,
     'pago',TO_CHAR(NOW()-'1 month'::INTERVAL,'YYYY-MM'),admin_id),

    ('despesa','Custas Advocatícias',
     'Honorários advocatícios — cobrança de inadimplentes',2100.00,
     (TO_CHAR(NOW()-'1 month'::INTERVAL,'YYYY-MM')||'-25')::DATE,
     NULL,'pendente',TO_CHAR(NOW()-'1 month'::INTERVAL,'YYYY-MM'),admin_id);

  RAISE NOTICE 'Seed OK — % registros em finances', (SELECT COUNT(*) FROM finances);
END $$;
