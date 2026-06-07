-- RPC: agrega receitas e despesas por mês no servidor (evita full-table scan no cliente)
CREATE OR REPLACE FUNCTION public.finance_trend()
RETURNS TABLE(mes TEXT, receitas NUMERIC, despesas NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    reference_month                                          AS mes,
    COALESCE(SUM(amount) FILTER (WHERE type = 'receita'), 0) AS receitas,
    COALESCE(SUM(amount) FILTER (WHERE type = 'despesa'), 0) AS despesas
  FROM finances
  GROUP BY reference_month
  ORDER BY reference_month;
$$;

GRANT EXECUTE ON FUNCTION public.finance_trend() TO authenticated, anon;
