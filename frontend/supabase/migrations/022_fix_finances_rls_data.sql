-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 022 — Fix RLS finances + seed dados reais (Nov/2025–Abr/2026)
-- Execute no Supabase SQL Editor
-- ================================================================

-- ── 1. CORRIGIR RLS: transparência para todos autenticados ───────
DROP POLICY IF EXISTS "financeiro_leitura"     ON public.finances;
DROP POLICY IF EXISTS "financeiro_gestor_total" ON public.finances;

-- Todos os usuários autenticados veem despesas gerais (unit_id NULL)
-- Gestores veem tudo; moradores veem também o próprio unit_id
CREATE POLICY "financeiro_leitura"
  ON public.finances FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_gestor()
      OR unit_id IS NULL
      OR unit_id = my_unit_id()
    )
  );

CREATE POLICY "financeiro_gestor_total"
  ON public.finances FOR ALL
  USING (is_gestor());

-- ── 2. SEED: inserir dados reais se tabela vazia ─────────────────
DO $$
DECLARE
  adm UUID;
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.finances;
  IF cnt > 0 THEN
    RAISE NOTICE 'Tabela finances já contém % registros. Seed ignorado.', cnt;
    RETURN;
  END IF;

  SELECT id INTO adm FROM public.profiles
  WHERE role IN ('admin', 'sindico') ORDER BY created_at LIMIT 1;

  -- ════════════════════ NOV/2025 ════════════════════
  INSERT INTO public.finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by) VALUES
    ('despesa','Despesas com Pessoal',     'Folha de Pagamento',                    33275.62, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas com Pessoal',     'Adiantamento',                          10494.43, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Básica',                          12605.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas com Pessoal',     'Secovimed',                              1031.66, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas com Pessoal',     'Seguro de Vida - Liberty 09/12',          590.55, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas com Pessoal',     'Uniforme',                               3046.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas com Pessoal',     'Serviço de Vigilância',                 14240.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas com Pessoal',     'Pensão Alimentícia',                     1414.73, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Encargos Sociais',         'FGTS sobre Folha de Pagamento',          5653.91, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Encargos Sociais',         'IRRF',                                     92.65, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Encargos Sociais',         'INSS / PIS / DARF',                     24179.23, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Síndico',                 3036.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas Administrativas', 'Serviços Contábeis',                     2654.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas Administrativas', 'Treinamentos e Cursos',                  3200.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas Administrativas', 'Material de Escritório',                   96.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Subsíndico',               540.41, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Manutenção',               'Manutenções Gerais',                      500.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Manutenção',               'Manutenção de Máq. e Equipamentos',      1247.52, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Manutenção',               'Despesas com Veículos',                  1387.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Manutenção',               'Manutenção do Portão',                    700.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Manutenção',               'Serviços de Pintura',                    5417.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Manutenção',               'Licença Mensal Módulos Guarita',          451.44, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Manutenção',               'Manutenção Elétrica',                     500.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Consumo Faturado',         'Água e Esgoto',                           413.82, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Consumo Faturado',         'Energia Elétrica',                       4604.62, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Consumo Faturado',         'Internet',                                200.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Material de Consumo',      'Material Elétrico',                       394.70, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Material de Consumo',      'Material de Construção',                  426.02, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Material de Consumo',      'Combustível / Lubrificantes',            1620.24, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Material de Consumo',      'Uso e Consumo',                           163.40, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Material de Consumo',      'Materiais de Pintura',                   1975.76, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Seguros Obrigatórios',     'Seguro do Condomínio 4/10',              1011.18, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Custas Advocatícias',      'Honorário Advocatício / Custas',         1000.00, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Aquisição de Bens',        'Móveis e Utensílios',                    1341.20, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Aquisição de Bens',        'Placas de Sinalização',                  2831.79, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Benfeitorias / Reformas',  'Painel Solar Fotovoltaico',              6467.15, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Benfeitorias / Reformas',  'Pavimentação da Estrada',               39999.98, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Despesas Bancárias',       'Despesas Bancárias',                      627.76, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Fundo de Reserva',         'Fundo de Reserva — Nov/2025',           18943.08, '2025-12-10','2025-12-10','pago','2025-11', adm),
    ('despesa','Fundo de Férias / 13º',    'Fundo de Férias e 13º Salário',          8754.01, '2025-12-10','2025-12-10','pago','2025-11', adm);

  -- ════════════════════ DEZ/2025 ════════════════════
  INSERT INTO public.finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by) VALUES
    ('despesa','Despesas com Pessoal',     'Folha de Pagamento',                    30886.80, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas com Pessoal',     'Adiantamento',                          10897.66, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Básica',                          12605.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas com Pessoal',     'Secovimed',                              1031.66, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas com Pessoal',     'Seguro de Vida - Liberty 10/12',          590.55, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas com Pessoal',     'Serviço de Vigilância',                 14240.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas com Pessoal',     'Pensão Alimentícia',                     1240.25, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Encargos Sociais',         'FGTS sobre Folha de Pagamento',          6332.63, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Encargos Sociais',         'IRRF',                                    527.26, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Encargos Sociais',         'INSS / PIS / DARF',                     23117.71, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Síndico',                 3036.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas Administrativas', 'Serviços Contábeis',                     2654.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas Administrativas', 'Material de Escritório',                   58.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Subsíndico',               540.41, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Manutenção de Internet',                  400.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Manutenções Gerais',                     2709.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Manutenção Sistema de Segurança',        1635.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Despesas com Veículos',                  4328.80, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Manutenção do Portão',                    900.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Manutenção Iluminação Pública',          6041.40, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Serviços de Pintura',                    5417.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Manutenção',               'Licença Mensal Módulos Guarita',          451.44, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Consumo Faturado',         'Água e Esgoto',                           362.08, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Consumo Faturado',         'Energia Elétrica',                       4559.85, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Consumo Faturado',         'Internet',                                200.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Material de Consumo',      'Material de Limpeza',                      86.70, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Material de Consumo',      'Material Elétrico',                       125.04, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Material de Consumo',      'Material de Construção',                 1497.50, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Material de Consumo',      'Combustível / Lubrificantes',            7345.79, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Material de Consumo',      'Uso e Consumo',                           321.70, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Material de Consumo',      'Materiais de Pintura',                    967.51, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Seguros Obrigatórios',     'Seguro do Condomínio 5/10',              1011.18, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Custas Advocatícias',      'Honorário Advocatício / Custas',         1600.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Aquisição de Bens',        'Máquinas e Equipamentos',                2310.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Aquisição de Bens',        'Móveis e Utensílios',                    1275.55, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Aquisição de Bens',        'Placas de Sinalização',                  3641.16, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Benfeitorias / Reformas',  'Painel Solar Fotovoltaico',              6467.15, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Benfeitorias / Reformas',  'Pavimentação da Estrada',               40000.13, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Benfeitorias / Reformas',  'Manutenção das Estradas',                5335.85, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Rateio Individual',        'Locação de Banheiro Químico',             500.00, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Despesas Bancárias',       'Despesas Bancárias',                      634.64, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Fundo de Reserva',         'Fundo de Reserva — Dez/2025',           20788.24, '2026-01-10','2026-01-10','pago','2025-12', adm),
    ('despesa','Fundo de Férias / 13º',    'Fundo de Férias e 13º Salário',          8356.89, '2026-01-10','2026-01-10','pago','2025-12', adm);

  -- ════════════════════ JAN/2026 ════════════════════
  INSERT INTO public.finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by) VALUES
    ('despesa','Despesas com Pessoal',     'Folha de Pagamento',                    36252.93, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas com Pessoal',     'Adiantamento',                          11220.25, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Básica',                          12605.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas com Pessoal',     'Secovimed',                              1031.66, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas com Pessoal',     'Seguro de Vida - Liberty 11/12',          590.55, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Natalina 1/2',                     3236.25, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas com Pessoal',     'Serviço de Vigilância',                 14240.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas com Pessoal',     'Pensão Alimentícia',                     2292.43, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Encargos Sociais',         'FGTS sobre Folha de Pagamento',          8919.08, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Encargos Sociais',         'IRRF',                                   1117.39, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Encargos Sociais',         'INSS / PIS / DARF',                     26974.76, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Síndico',                 3036.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas Administrativas', 'Serviços Contábeis',                     2654.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas Administrativas', 'Material de Escritório',                  377.14, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Subsíndico',               540.41, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Manutenção',               'Manutenções Gerais',                     4508.78, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Manutenção',               'Manutenção de Câmeras',                   650.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Manutenção',               'Despesas com Veículos',                  3829.65, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Manutenção',               'Manutenção Iluminação Pública',          2213.40, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Manutenção',               'Licença Mensal Módulos Guarita',          451.44, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Manutenção',               'Manutenção Elétrica',                    1700.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Consumo Faturado',         'Água e Esgoto',                           432.19, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Consumo Faturado',         'Energia Elétrica',                       4604.34, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Consumo Faturado',         'Internet',                                200.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Material de Consumo',      'Material de Limpeza',                     426.83, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Material de Consumo',      'Material Elétrico',                       686.68, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Material de Consumo',      'Material de Construção',                  951.35, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Material de Consumo',      'Combustível / Lubrificantes',            2072.61, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Material de Consumo',      'Uso e Consumo',                           177.50, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Material de Consumo',      'Equipamentos Eletrônicos',               1983.67, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Seguros Obrigatórios',     'Seguro do Condomínio 6/10',              1011.18, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Custas Advocatícias',      'Honorário Advocatício / Custas',         1600.00, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Aquisição de Bens',        'Máquinas e Equipamentos',                 951.80, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Aquisição de Bens',        'Móveis e Utensílios',                    2252.77, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Aquisição de Bens',        'Placas de Sinalização',                  3641.16, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Benfeitorias / Reformas',  'Painel Solar Fotovoltaico',              6467.15, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Benfeitorias / Reformas',  'Pavimentação da Estrada',               40000.13, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Benfeitorias / Reformas',  'Manutenção das Estradas',                1818.05, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Despesas Bancárias',       'Despesas Bancárias',                      725.57, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Fundo de Reserva',         'Fundo de Reserva — Jan/2026',           20844.41, '2026-02-10','2026-02-10','pago','2026-01', adm),
    ('despesa','Fundo de Férias / 13º',    'Fundo de Férias e 13º Salário',          9494.64, '2026-02-10','2026-02-10','pago','2026-01', adm);

  -- ════════════════════ FEV/2026 ════════════════════
  INSERT INTO public.finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by) VALUES
    ('despesa','Despesas com Pessoal',     'Folha de Pagamento',                    31238.70, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Adiantamento',                          11235.84, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Básica',                          13505.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Secovimed',                              1031.66, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Seguro de Vida - Liberty 12/12',          590.55, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Natalina 2/2',                     3236.25, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Uniforme',                               1411.75, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Serviço de Vigilância',                 15681.80, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas com Pessoal',     'Pensão Alimentícia',                     1818.24, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Encargos Sociais',         'FGTS sobre Folha de Pagamento',          8401.60, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Encargos Sociais',         'IRRF',                                     98.80, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Encargos Sociais',         'INSS / PIS / DARF',                     23006.54, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Síndico',                 3036.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas Administrativas', 'Serviços Contábeis',                     2654.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas Administrativas', 'Material de Escritório',                  227.93, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Subsíndico',               540.41, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Manutenção',               'Manutenção de Internet',                  300.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Manutenção',               'Manutenções Gerais',                     6386.66, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Manutenção',               'Manutenção de Máq. e Equipamentos',       253.37, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Manutenção',               'Despesas com Veículos',                  2122.05, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Manutenção',               'Manutenção Iluminação Pública',          2213.40, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Manutenção',               'Licença Mensal Módulos Guarita',          451.44, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Consumo Faturado',         'Água e Esgoto',                           535.42, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Consumo Faturado',         'Energia Elétrica',                       4831.75, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Consumo Faturado',         'Telefone',                                 80.77, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Consumo Faturado',         'Internet',                                200.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Material de Consumo',      'Material de Limpeza',                     426.82, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Material de Consumo',      'Material de Construção',                 2849.68, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Material de Consumo',      'Combustível / Lubrificantes',            2337.68, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Material de Consumo',      'Uso e Consumo',                           123.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Material de Consumo',      'Equipamentos Eletrônicos',               1171.67, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Material de Consumo',      'Materiais de Pintura',                    838.10, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Seguros Obrigatórios',     'Seguro do Condomínio 7/10',              1011.18, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Custas Advocatícias',      'Honorário Advocatício / Custas',         1000.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Aquisição de Bens',        'Máquinas e Equipamentos',                 691.80, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Aquisição de Bens',        'Móveis e Utensílios',                    1931.32, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Aquisição de Bens',        'Placas de Sinalização',                  3641.16, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Benfeitorias / Reformas',  'Painel Solar Fotovoltaico',              6467.15, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Benfeitorias / Reformas',  'Pavimentação da Estrada',               38000.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Benfeitorias / Reformas',  'Obra do Beach Tennis',                   1088.00, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Despesas Bancárias',       'Despesas Bancárias',                      622.04, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Fundo de Reserva',         'Fundo de Reserva — Fev/2026',           19728.95, '2026-03-10','2026-03-10','pago','2026-02', adm),
    ('despesa','Fundo de Férias / 13º',    'Fundo de Férias e 13º Salário',          8494.91, '2026-03-10','2026-03-10','pago','2026-02', adm);

  -- ════════════════════ MAR/2026 ════════════════════
  INSERT INTO public.finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by) VALUES
    ('despesa','Despesas com Pessoal',     'Folha de Pagamento',                    35261.54, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas com Pessoal',     'Adiantamento',                          11100.21, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Básica',                          13505.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas com Pessoal',     'Secovimed',                              1105.35, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas com Pessoal',     'Seguro de Vida - Liberty 01/12',          614.76, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas com Pessoal',     'Uniforme',                                994.20, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas com Pessoal',     'Serviço de Vigilância',                 14240.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas com Pessoal',     'Pensão Alimentícia',                     2208.61, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Encargos Sociais',         'FGTS sobre Folha de Pagamento',          6935.39, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Encargos Sociais',         'IRRF',                                    224.43, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Encargos Sociais',         'INSS / PIS / DARF',                     23818.82, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Síndico',                 3242.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas Administrativas', 'Serviços Contábeis',                     2797.50, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Subsíndico',               577.08, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas Administrativas', 'RAIS',                                    490.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Manutenção',               'Manutenção de Máq. e Equipamentos',       253.37, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Manutenção',               'Manutenção de Câmeras',                  1000.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Manutenção',               'Despesas com Veículos',                  1583.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Manutenção',               'Manutenção Iluminação Pública',          1964.50, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Manutenção',               'Licença Mensal Módulos Guarita',          451.44, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Reparos e Consertos',      'Bomba D''Água',                           640.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Consumo Faturado',         'Água e Esgoto',                           331.70, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Consumo Faturado',         'Energia Elétrica',                       4222.60, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Consumo Faturado',         'Telefone',                                 91.98, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Consumo Faturado',         'Internet',                                200.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Material de Consumo',      'Material de Limpeza',                     917.50, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Material de Consumo',      'Material de Construção',                  422.20, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Material de Consumo',      'Combustível / Lubrificantes',            3516.77, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Material de Consumo',      'Uso e Consumo',                           286.20, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Material de Consumo',      'Equipamentos Eletrônicos',                883.67, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Seguros Obrigatórios',     'Seguro do Condomínio 8/10',              1011.18, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Custas Advocatícias',      'Honorário Advocatício / Custas',         2500.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Aquisição de Bens',        'Máquinas e Equipamentos',                3943.70, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Aquisição de Bens',        'Móveis e Utensílios',                    1025.55, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Aquisição de Bens',        'Placas de Sinalização',                  2472.48, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Benfeitorias / Reformas',  'Painel Solar Fotovoltaico',              6467.15, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Benfeitorias / Reformas',  'Pavimentação da Estrada',               38000.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Benfeitorias / Reformas',  'Trapiche',                                120.00, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Despesas Bancárias',       'Despesas Bancárias',                      599.84, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Fundo de Reserva',         'Fundo de Reserva — Mar/2026',           19001.97, '2026-04-10','2026-04-10','pago','2026-03', adm),
    ('despesa','Fundo de Férias / 13º',    'Fundo de Férias e 13º Salário',          9272.35, '2026-04-10','2026-04-10','pago','2026-03', adm);

  -- ════════════════════ ABR/2026 ════════════════════
  INSERT INTO public.finances (type, category, description, amount, due_date, payment_date, status, reference_month, created_by) VALUES
    ('despesa','Despesas com Pessoal',     'Folha de Pagamento',                    34399.21, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas com Pessoal',     'Adiantamento',                          10238.38, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas com Pessoal',     'Cesta Básica',                          13505.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas com Pessoal',     'Secovimed',                              1105.35, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas com Pessoal',     'Seguro de Vida - Liberty 02/12',          735.22, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas com Pessoal',     'Serviço de Vigilância',                 14240.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas com Pessoal',     'Exames Ocupacionais',                      35.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas com Pessoal',     'Pensão Alimentícia',                      933.20, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Encargos Sociais',         'FGTS sobre Folha de Pagamento',          7334.86, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Encargos Sociais',         'IRRF',                                     78.06, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Encargos Sociais',         'INSS / PIS / DARF',                     24557.53, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Serviços Terceirizados',   'Certificado Digital',                     175.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Síndico',                 3242.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas Administrativas', 'Serviços Contábeis',                     2797.50, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas Administrativas', 'Material de Escritório',                  137.10, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas Administrativas', 'Remuneração de Subsíndico',               577.08, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Manutenção',               'Manutenções Gerais',                     3150.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Manutenção',               'Manutenção de Máq. e Equipamentos',       681.38, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Manutenção',               'Despesas com Veículos',                   538.50, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Manutenção',               'Manutenção Iluminação Pública',          4177.90, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Manutenção',               'Licença Mensal Módulos Guarita',          451.44, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Consumo Faturado',         'Água e Esgoto',                           454.36, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Consumo Faturado',         'Energia Elétrica',                       4173.71, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Consumo Faturado',         'Telefone',                                 93.16, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Consumo Faturado',         'Internet',                                200.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Material de Consumo',      'Material Elétrico',                       136.97, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Material de Consumo',      'Material de Construção',                 2422.35, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Material de Consumo',      'Combustível / Lubrificantes',            2055.48, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Seguros Obrigatórios',     'Seguro do Condomínio 9/10',              1011.18, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Custas Advocatícias',      'Honorário Advocatício / Custas',          800.00, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Aquisição de Bens',        'Máquinas e Equipamentos',                3480.25, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Aquisição de Bens',        'Móveis e Utensílios',                    2031.75, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Aquisição de Bens',        'Placas de Sinalização',                  2736.87, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Benfeitorias / Reformas',  'Painel Solar Fotovoltaico',              6467.15, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Benfeitorias / Reformas',  'Pavimentação da Estrada',               37999.91, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Despesas Bancárias',       'Despesas Bancárias',                      635.34, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Fundo de Reserva',         'Fundo de Reserva — Abr/2026',           18778.82, '2026-05-10', NULL,'pendente','2026-04', adm),
    ('despesa','Fundo de Férias / 13º',    'Fundo de Férias e 13º Salário',          8927.52, '2026-05-10', NULL,'pendente','2026-04', adm);

  RAISE NOTICE 'Seed concluído: % registros inseridos.', (SELECT COUNT(*) FROM public.finances);
END;
$$;
