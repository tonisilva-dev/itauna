-- ================================================================
-- Condomínio Chácaras Itaúna
-- Migration 020 — Análise de Cenários + Checklist do Tomador
-- ================================================================

-- ── TABELA: cenarios_orcamentarios ───────────────────────────────
-- Simula o impacto financeiro de decisões antes da aprovação.
CREATE TABLE public.cenarios_orcamentarios (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT          NOT NULL,
  tipo            TEXT          NOT NULL
                                  CHECK (tipo IN (
                                    'contratacao','terceirizacao','obra',
                                    'equipamento','seguranca','financiamento',
                                    'reajuste','outro'
                                  )),
  descricao       TEXT,
  -- Custo recorrente mensal (salário, contrato, prestação...)
  custo_mensal    DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Custo único (obra, compra) amortizado em periodo_meses
  custo_unico     DECIMAL(12,2) NOT NULL DEFAULT 0,
  periodo_meses   INT,          -- NULL = permanente / recorrente
  data_inicio     DATE,
  -- Status: rascunho → em_análise → aprovado / rejeitado
  status          TEXT          NOT NULL DEFAULT 'rascunho'
                                  CHECK (status IN (
                                    'rascunho','em_analise','aprovado','rejeitado'
                                  )),
  num_unidades    INT           NOT NULL DEFAULT 360,
  created_by      UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER cenarios_updated_at
  BEFORE UPDATE ON public.cenarios_orcamentarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_cenarios_status ON public.cenarios_orcamentarios(status);
CREATE INDEX idx_cenarios_tipo   ON public.cenarios_orcamentarios(tipo);

ALTER TABLE public.cenarios_orcamentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cenarios_gestor_total"
  ON public.cenarios_orcamentarios FOR ALL
  USING (public.is_gestor())
  WITH CHECK (public.is_gestor());

-- ── TABELA: servicos_checklist ────────────────────────────────────
-- Checklist do tomador de serviço: acompanha a contratação de
-- prestadores externos com itens de verificação obrigatória.
CREATE TABLE public.servicos_checklist (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  servico       TEXT        NOT NULL,    -- ex: "Manutenção da bomba d'água"
  prestador     TEXT,                    -- empresa ou autônomo
  contato       TEXT,
  data_inicio   DATE,
  data_fim      DATE,
  valor         DECIMAL(12,2),
  status        TEXT        NOT NULL DEFAULT 'aberto'
                              CHECK (status IN ('aberto','em_andamento','concluido','cancelado')),
  observacoes   TEXT,
  created_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER checklist_updated_at
  BEFORE UPDATE ON public.servicos_checklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── TABELA: servicos_checklist_itens ─────────────────────────────
-- Itens individuais do checklist (ex: "Verificar habilitação CREA")
CREATE TABLE public.servicos_checklist_itens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  UUID        NOT NULL REFERENCES public.servicos_checklist(id) ON DELETE CASCADE,
  descricao     TEXT        NOT NULL,
  concluido     BOOLEAN     NOT NULL DEFAULT false,
  ordem         INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_itens_parent ON public.servicos_checklist_itens(checklist_id);

ALTER TABLE public.servicos_checklist       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos_checklist_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_gestor_total"
  ON public.servicos_checklist FOR ALL
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

CREATE POLICY "checklist_itens_gestor_total"
  ON public.servicos_checklist_itens FOR ALL
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

-- ── SEED: itens padrão de checklist (templates reutilizáveis) ────
-- Inseridos como um checklist modelo para o síndico copiar/adaptar
INSERT INTO public.servicos_checklist
  (servico, prestador, status, observacoes)
VALUES
  ('Modelo — Contratação de Prestador de Serviço', NULL, 'aberto',
   'Checklist padrão. Duplique e adapte para cada contratação.');

-- Itens padrão do checklist de contratação
INSERT INTO public.servicos_checklist_itens (checklist_id, descricao, ordem)
SELECT id, item.descricao, item.ordem
FROM public.servicos_checklist,
(VALUES
  (1,  'Verificar CNPJ / CPF do prestador (Receita Federal)'),
  (2,  'Consultar CREA/CAU/CRM conforme a atividade'),
  (3,  'Solicitar certidão negativa de débitos (CND Federal)'),
  (4,  'Solicitar certidão negativa estadual e municipal'),
  (5,  'Verificar alvará de funcionamento (empresa)'),
  (6,  'Solicitar apólice de seguro de responsabilidade civil'),
  (7,  'Conferir referências de serviços anteriores'),
  (8,  'Solicitar orçamento detalhado por escrito'),
  (9,  'Obter pelo menos 3 orçamentos para comparação'),
  (10, 'Revisar contrato com cláusulas de prazo e garantia'),
  (11, 'Definir cronograma de execução e marcos de entrega'),
  (12, 'Registrar ART/RRT se obra ou serviço técnico'),
  (13, 'Comunicar moradores sobre data/horário dos serviços'),
  (14, 'Registrar entrada e saída dos prestadores na portaria'),
  (15, 'Vistoriar e assinar aceite após conclusão do serviço')
) AS item(ordem, descricao)
WHERE servico = 'Modelo — Contratação de Prestador de Serviço';
