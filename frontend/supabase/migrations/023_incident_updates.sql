-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 023 — Linha do tempo e respostas em ocorrências
-- ================================================================

-- ── TABELA: incident_updates ──────────────────────────────────────
-- Cada linha é um evento na vida da ocorrência:
--   'criado'         → criação inicial (inserida via trigger)
--   'status'         → mudança de status pelo gestor
--   'comentario'     → mensagem/resposta do gestor sem mudar status
--   'resolucao'      → resposta final ao marcar como resolvido
CREATE TABLE public.incident_updates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID        NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo            TEXT        NOT NULL CHECK (tipo IN ('criado','status','comentario','resolucao')),
  status_anterior TEXT,
  status_novo     TEXT,
  mensagem        TEXT,       -- resposta/nota do gestor (opcional em 'status', obrigatória em 'comentario'/'resolucao')
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inc_updates_incident ON public.incident_updates(incident_id, created_at);
CREATE INDEX idx_inc_updates_user     ON public.incident_updates(user_id);

ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- Morador vê atualizações das próprias ocorrências; gestor vê todas
CREATE POLICY "inc_updates_select"
  ON public.incident_updates FOR SELECT
  USING (
    public.is_gestor()
    OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id AND i.user_id = auth.uid()
    )
  );

-- Apenas gestores inserem atualizações
CREATE POLICY "inc_updates_insert_gestor"
  ON public.incident_updates FOR INSERT
  WITH CHECK (public.is_gestor());

-- ── TRIGGER: inserir evento 'criado' automaticamente ─────────────
CREATE OR REPLACE FUNCTION public.incident_auto_create_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.incident_updates (incident_id, user_id, tipo, status_novo, mensagem)
  VALUES (NEW.id, NEW.user_id, 'criado', NEW.status, 'Ocorrência registrada pelo morador.');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER incident_on_create
  AFTER INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.incident_auto_create_update();

-- ── CAMPO: seen_by_gestor_at — "visto pela gestão" ──────────────
-- Permite ao morador ver quando o gestor visualizou pela primeira vez.
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS seen_by_gestor_at TIMESTAMPTZ;

-- ── Habilitar Realtime nesta tabela ─────────────────────────────
-- Execute no Supabase Dashboard → Database → Replication, ou via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_updates;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
