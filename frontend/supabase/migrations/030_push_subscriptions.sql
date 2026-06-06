-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 030 — Push subscriptions para notificações PWA
-- ================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada usuário gerencia apenas as próprias subscriptions
CREATE POLICY "owner" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Service role (Edge Function) pode ler todas para enviar pushes
CREATE POLICY "service_read" ON public.push_subscriptions
  FOR SELECT USING (true);

COMMENT ON TABLE public.push_subscriptions IS 'Subscriptions Web Push dos dispositivos dos moradores';
