-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 016 — Telefones Úteis + Secretarias
-- Tabela pública (sem auth) para leitura; somente admin gerencia.
-- ================================================================

-- ── TABELA PRINCIPAL ─────────────────────────────────────────────
CREATE TABLE public.telefones_uteis (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT          NOT NULL,
  categoria   TEXT          NOT NULL DEFAULT 'Outros'
                              CHECK (categoria IN (
                                'Emergência','Saúde','Utilidades',
                                'Poder Público','Condomínio','Outros'
                              )),
  telefone    TEXT          NOT NULL,
  telefone2   TEXT,
  descricao   TEXT,
  emoji       TEXT          NOT NULL DEFAULT '📞',
  ordem       INT           NOT NULL DEFAULT 0,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_by  UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER telefones_uteis_updated_at
  BEFORE UPDATE ON public.telefones_uteis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_telefones_categoria ON public.telefones_uteis(categoria);
CREATE INDEX idx_telefones_ordem     ON public.telefones_uteis(ordem, nome);
CREATE INDEX idx_telefones_active    ON public.telefones_uteis(is_active);

-- ── TABELA DE SECRETARIAS (sub-registros de órgãos públicos) ─────
-- Vinculada a qualquer entrada de telefones_uteis, mas concebida
-- para Prefeituras e órgãos com múltiplas secretarias/setores.
CREATE TABLE public.telefones_secretarias (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone_id  UUID        NOT NULL REFERENCES public.telefones_uteis(id) ON DELETE CASCADE,
  nome         TEXT        NOT NULL,   -- ex: "Secretaria de Tributação e Finanças"
  email        TEXT,
  telefone     TEXT,
  ordem        INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER telefones_secretarias_updated_at
  BEFORE UPDATE ON public.telefones_secretarias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_secretarias_telefone_id ON public.telefones_secretarias(telefone_id);
CREATE INDEX idx_secretarias_ordem       ON public.telefones_secretarias(telefone_id, ordem);

-- ── RLS: telefones_uteis ─────────────────────────────────────────
ALTER TABLE public.telefones_uteis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telefones_leitura_publica"
  ON public.telefones_uteis FOR SELECT
  USING (is_active = true);

CREATE POLICY "telefones_admin_total"
  ON public.telefones_uteis FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── RLS: telefones_secretarias ───────────────────────────────────
ALTER TABLE public.telefones_secretarias ENABLE ROW LEVEL SECURITY;

-- Leitura pública: secretaria visível se o pai estiver ativo
CREATE POLICY "secretarias_leitura_publica"
  ON public.telefones_secretarias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.telefones_uteis t
      WHERE t.id = telefone_id AND t.is_active = true
    )
  );

CREATE POLICY "secretarias_admin_total"
  ON public.telefones_secretarias FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ═══════════════════════════════════════════════════════════════
-- SEED — Telefones principais
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.telefones_uteis
  (nome, categoria, telefone, telefone2, descricao, emoji, ordem)
VALUES
  -- Emergências
  ('SAMU',                            'Emergência',   '192',             NULL,               'Serviço de Atendimento Móvel de Urgência',                       '🚑', 10),
  ('SIATE',                           'Emergência',   '192',             NULL,               'Serviço Integrado de Atendimento ao Trauma em Emergência (PR)',  '🚒', 11),
  ('Bombeiros',                       'Emergência',   '193',             NULL,               'Corpo de Bombeiros — emergências, incêndios e resgates',         '🔥', 12),
  ('Polícia Militar',                 'Emergência',   '190',             NULL,               'Atendimento de urgência policial',                               '🚔', 13),
  ('Defesa Civil',                    'Emergência',   '199',             NULL,               'Desastres naturais, deslizamentos e enchentes',                  '⛑️', 14),

  -- Saúde
  ('UPA Ibiporã',                     'Saúde',        '(43) 3252-6900',  NULL,               'Unidade de Pronto Atendimento 24h de Ibiporã',                   '🏥', 20),
  ('Hospital Universitário (HU/UEL)', 'Saúde',        '(43) 3371-2000',  NULL,               'Hospital de referência em Londrina',                             '🏥', 21),
  ('CVV — Centro de Valorização',     'Saúde',        '188',             NULL,               'Apoio emocional e prevenção ao suicídio — 24h',                  '💙', 22),

  -- Utilidades
  ('SAMAE Ibiporã',                   'Utilidades',   '(43) 3252-1655',  '(43) 3252-4100',   'Saneamento — água e esgoto de Ibiporã',                          '💧', 30),
  ('COPEL',                           'Utilidades',   '0800 723 2302',   NULL,               'Energia elétrica — emergências e falta de luz',                  '⚡', 31),
  ('Gás Natural Paraná',              'Utilidades',   '0800 644 1900',   NULL,               'Emergências com gás encanado',                                   '🔥', 32),

  -- Poder Público
  ('Prefeitura de Ibiporã',           'Poder Público','(43) 3252-1500',  NULL,               'Prefeitura Municipal de Ibiporã — Paço Municipal',               '🏛️', 40),
  ('Prefeitura de Londrina',          'Poder Público','(43) 3372-4000',  NULL,               'Prefeitura Municipal de Londrina',                               '🏛️', 41),
  ('Registro de Imóveis de Ibiporã',  'Poder Público','(43) 3252-1306',  NULL,               'Cartório de Registro de Imóveis da Comarca de Ibiporã',          '📜', 42),
  ('Procon Ibiporã',                  'Poder Público','(43) 3252-1500',  NULL,               'Proteção e defesa do consumidor — Ramal Prefeitura',             '⚖️', 43),

  -- Condomínio
  ('Portaria Itaúna',                 'Condomínio',   '(43) 99999-0001', NULL,               'Portaria 24h — controle de acesso',                              '🏡', 50),
  ('Síndico',                         'Condomínio',   '(43) 99999-0002', NULL,               'Contato direto com a administração',                             '👤', 51);

-- ═══════════════════════════════════════════════════════════════
-- SEED — Secretarias das Prefeituras
-- ═══════════════════════════════════════════════════════════════

-- Secretarias de Ibiporã
INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria de Tributação e Finanças',       'tributacao@ibipora.pr.gov.br',   '(43) 3252-1500', 10 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Ibiporã';

INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria do Meio Ambiente',               'meioambiente@ibipora.pr.gov.br', '(43) 3252-1500', 20 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Ibiporã';

INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria de Obras e Infraestrutura',      'obras@ibipora.pr.gov.br',        '(43) 3252-1500', 30 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Ibiporã';

INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria de Saúde',                       'saude@ibipora.pr.gov.br',        '(43) 3252-1500', 40 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Ibiporã';

INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria de Educação',                    'educacao@ibipora.pr.gov.br',     '(43) 3252-1500', 50 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Ibiporã';

-- Secretarias de Londrina
INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria Municipal de Fazenda',           'smf@londrina.pr.gov.br',         '(43) 3372-4000', 10 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Londrina';

INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria do Ambiente',                    'sema@londrina.pr.gov.br',        '(43) 3372-4000', 20 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Londrina';

INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria de Obras e Pavimentação',        'soplan@londrina.pr.gov.br',      '(43) 3372-4000', 30 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Londrina';

INSERT INTO public.telefones_secretarias (telefone_id, nome, email, telefone, ordem)
SELECT id, 'Secretaria Municipal de Saúde',             'sms@londrina.pr.gov.br',         '(43) 3372-4000', 40 FROM public.telefones_uteis WHERE nome = 'Prefeitura de Londrina';
