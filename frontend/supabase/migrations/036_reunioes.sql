-- Módulo de Reuniões Condominiais — Fase 1
-- Integração: Google Calendar API + Meet + Resend + Push PWA

/* ─── 1. Reuniões ─────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS public.meetings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT         DEFAULT 60,
  google_event_id VARCHAR(255),
  meet_link       VARCHAR(500),
  status          VARCHAR(20) DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','cancelled','done')),
  agenda_locked   BOOLEAN     DEFAULT FALSE,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON public.meetings (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status    ON public.meetings (status);

/* ─── 2. Itens de pauta ───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS public.agenda_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID        NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  position    INT         NOT NULL DEFAULT 1,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  doc_url     TEXT,
  status      VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','deferred')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agenda_meeting ON public.agenda_items (meeting_id);

/* ─── 3. RSVP (confirmações de presença) ─────────────────────── */
CREATE TABLE IF NOT EXISTS public.meeting_rsvp (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID        NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_number  INT,
  response     VARCHAR(20) DEFAULT 'pending'
                 CHECK (response IN ('pending','confirmed','declined')),
  responded_at TIMESTAMPTZ,
  UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvp_meeting ON public.meeting_rsvp (meeting_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_user    ON public.meeting_rsvp (user_id);

/* ─── 4. Log de notificações (compliance LGPD) ───────────────── */
CREATE TABLE IF NOT EXISTS public.notification_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID        REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id),
  channel    VARCHAR(20) NOT NULL CHECK (channel IN ('email','push','whatsapp')),
  status     VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','delivered','failed')),
  sent_at    TIMESTAMPTZ DEFAULT NOW(),
  metadata   JSONB
);

CREATE INDEX IF NOT EXISTS idx_notif_meeting ON public.notification_log (meeting_id);

/* ─── 5. Tokens Google OAuth (refresh_token criptografado AES-256) ─ */
CREATE TABLE IF NOT EXISTS public.google_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account       VARCHAR(100) NOT NULL UNIQUE,  -- 'itauna'
  access_token  TEXT        NOT NULL,          -- AES-GCM Base64
  refresh_token TEXT        NOT NULL,          -- AES-GCM Base64
  expiry_date   BIGINT,                        -- epoch ms
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

/* ─── RLS ─────────────────────────────────────────────────────── */
ALTER TABLE public.meetings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_rsvp   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens  ENABLE ROW LEVEL SECURITY;

-- meetings: todos os autenticados vêem; gestores gerenciam
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "meetings_gestor" ON public.meetings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sindico','assistente')));

-- agenda_items: todos vêem; gestores gerenciam
CREATE POLICY "agenda_select" ON public.agenda_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "agenda_gestor"  ON public.agenda_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sindico','assistente')));

-- meeting_rsvp: todos vêem; cada usuário gerencia o próprio RSVP
CREATE POLICY "rsvp_select"  ON public.meeting_rsvp FOR SELECT TO authenticated USING (true);
CREATE POLICY "rsvp_own_upsert" ON public.meeting_rsvp FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "rsvp_own_update" ON public.meeting_rsvp FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- notification_log: apenas gestores
CREATE POLICY "notif_gestor" ON public.notification_log FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sindico','assistente')));

-- google_tokens: sem acesso direto (service_role only)
CREATE POLICY "gtokens_deny" ON public.google_tokens FOR ALL TO authenticated USING (false);

/* ─── Trigger updated_at em meetings ─────────────────────────── */
CREATE OR REPLACE FUNCTION public.set_meetings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_meetings_updated_at();
