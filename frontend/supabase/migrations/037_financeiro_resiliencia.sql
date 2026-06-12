-- ================================================================
-- Migração 037 — Resiliência financeira
--
-- 1. Adiciona cobranca_id em finances para idempotência do webhook
-- 2. Cron diário via pg_cron para marcar cobranças vencidas
-- 3. Cron diário para invocar reconciliação com Asaas via pg_net
-- ================================================================

-- 1. Liga extensões necessárias (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Adiciona coluna de referência à cobrança original
ALTER TABLE public.finances
  ADD COLUMN IF NOT EXISTS cobranca_id UUID REFERENCES public.cobrancas(id) ON DELETE SET NULL;

-- Índice para lookup rápido e garantia de unicidade por cobrança
CREATE UNIQUE INDEX IF NOT EXISTS idx_finances_cobranca_id
  ON public.finances (cobranca_id)
  WHERE cobranca_id IS NOT NULL;

-- 3. Função SQL: marca cobranças vencidas
--    Roda via cron todo dia à meia-noite
CREATE OR REPLACE FUNCTION public.marcar_cobrancas_vencidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.cobrancas
  SET    status     = 'vencido',
         updated_at = NOW()
  WHERE  status   = 'pendente'
  AND    due_date < CURRENT_DATE;
END;
$$;

-- 4. Cron: marcar vencidos todo dia às 00:05 BRT (03:05 UTC)
SELECT cron.schedule(
  'marcar-cobrancas-vencidas',
  '5 3 * * *',
  'SELECT public.marcar_cobrancas_vencidas()'
);

-- 5. Cron: reconciliação com Asaas todo dia às 03:00 BRT (06:00 UTC)
--    Chama a Edge Function asaas-reconciliacao via HTTP interno
SELECT cron.schedule(
  'asaas-reconciliacao-diaria',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/asaas-reconciliacao',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || current_setting('app.service_role_key')
               ),
    body    := '{}'::jsonb
  )
  $$
);
