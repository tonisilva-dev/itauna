-- ================================================================
-- Migração 038 — LGPD Real
--
-- 1. Tabela lgpd_solicitacoes  — Art. 18: direitos do titular
-- 2. Tabela lgpd_registro_atividades — Art. 37: registro de tratamento
-- 3. Função anonimizar_perfil() — anonimização real no banco
-- 4. Cron para processar solicitações aprovadas após 7 dias
-- ================================================================

-- ── 1. Solicitações dos titulares ─────────────────────────────────────────
CREATE TABLE public.lgpd_solicitacoes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo           TEXT        NOT NULL
                               CHECK (tipo IN ('exclusao', 'portabilidade', 'correcao', 'oposicao')),
  status         TEXT        NOT NULL DEFAULT 'pendente'
                               CHECK (status IN ('pendente', 'em_analise', 'aprovada', 'rejeitada', 'concluida')),
  descricao      TEXT,                          -- campo livre do titular
  motivo_rejeicao TEXT,                         -- preenchido pelo gestor ao rejeitar
  processado_por UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  processado_em  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lgpd_sol_user   ON public.lgpd_solicitacoes (user_id);
CREATE INDEX idx_lgpd_sol_status ON public.lgpd_solicitacoes (status);

CREATE TRIGGER lgpd_sol_updated_at
  BEFORE UPDATE ON public.lgpd_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY lgpd_sol_ver_propria ON public.lgpd_solicitacoes
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','sindico')
    )
  );

CREATE POLICY lgpd_sol_inserir ON public.lgpd_solicitacoes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY lgpd_sol_gestores ON public.lgpd_solicitacoes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','sindico')
    )
  );

-- ── 2. Registro de atividades de tratamento (Art. 37) ─────────────────────
CREATE TABLE public.lgpd_registro_atividades (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade         TEXT    NOT NULL,   -- nome da atividade
  finalidade        TEXT    NOT NULL,   -- para que serve
  base_legal        TEXT    NOT NULL,   -- Art. 7º LGPD: contrato, interesse legítimo, etc.
  dados_tratados    TEXT[]  NOT NULL,   -- array de tipos de dados
  prazo_retencao    TEXT    NOT NULL,   -- ex: "enquanto ativo + 5 anos"
  compartilhamento  TEXT,               -- com quem é compartilhado e por quê
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lgpd_registro_atividades ENABLE ROW LEVEL SECURITY;

-- Apenas gestores gerenciam; todos autenticados podem consultar
CREATE POLICY lgpd_reg_leitura ON public.lgpd_registro_atividades
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY lgpd_reg_gestores ON public.lgpd_registro_atividades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','sindico')
    )
  );

-- Seed com as atividades reais do condomínio
INSERT INTO public.lgpd_registro_atividades
  (atividade, finalidade, base_legal, dados_tratados, prazo_retencao, compartilhamento)
VALUES
  (
    'Autenticação e controle de acesso',
    'Verificar identidade e conceder acesso ao sistema',
    'Execução de contrato (Art. 7º, V)',
    ARRAY['e-mail','senha (hash)','data/hora de login','IP de acesso'],
    'Enquanto o usuário estiver ativo; logs de acesso por 12 meses',
    'Supabase Auth (processador de dados)'
  ),
  (
    'Gestão de moradores e unidades',
    'Administrar o vínculo entre morador, unidade e condomínio',
    'Execução de contrato (Art. 7º, V)',
    ARRAY['nome completo','CPF','e-mail','telefone','número da unidade','foto de perfil'],
    'Enquanto ativo no condomínio; anonimizado em até 90 dias após saída',
    'Apenas administradores e síndico do condomínio'
  ),
  (
    'Cobrança e controle financeiro',
    'Gerar boletos/PIX, registrar pagamentos e controlar inadimplência',
    'Execução de contrato (Art. 7º, V) e obrigação legal (Art. 7º, II)',
    ARRAY['nome','CPF','unidade','valor pago','data de pagamento','método de pagamento'],
    '5 anos após o exercício financeiro (obrigação fiscal)',
    'Asaas Serviços Financeiros Ltda. (processador); autoridades fiscais quando exigido por lei'
  ),
  (
    'Controle de acesso — portaria',
    'Registrar entrada e saída de visitantes e prestadores de serviço',
    'Interesse legítimo — segurança patrimonial (Art. 7º, IX)',
    ARRAY['nome do visitante','CPF (opcional)','telefone (opcional)','veículo','horário','unidade destino'],
    '90 dias após o registro',
    'Apenas funcionários da portaria e administração'
  ),
  (
    'Notificações e comunicados',
    'Enviar avisos, comunicados e notificações push ao morador',
    'Execução de contrato (Art. 7º, V) e consentimento (Art. 7º, I)',
    ARRAY['e-mail','token de notificação push','unidade'],
    'Enquanto o morador mantiver o consentimento ou vínculo ativo',
    'Supabase (e-mail transacional); Web Push API (sem terceiros)'
  ),
  (
    'Agendamentos de áreas comuns',
    'Registrar reservas da piscina, salão de festas e demais áreas',
    'Execução de contrato (Art. 7º, V)',
    ARRAY['nome','unidade','data/hora da reserva','área reservada'],
    '24 meses após a data da reserva',
    'Apenas administração'
  ),
  (
    'Registro de ocorrências e manutenções',
    'Receber, acompanhar e resolver solicitações de manutenção',
    'Execução de contrato (Art. 7º, V)',
    ARRAY['nome','unidade','descrição da ocorrência','fotos (opcional)'],
    '5 anos (responsabilidade civil)',
    'Administração e prestadores de serviço vinculados à ocorrência'
  );

-- ── 3. Função de anonimização real ────────────────────────────────────────
-- Remove PII mantendo registros financeiros e operacionais intactos
CREATE OR REPLACE FUNCTION public.anonimizar_perfil(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Perfil: apaga todos os dados pessoais identificáveis
  UPDATE public.profiles
  SET
    full_name   = 'Usuário Removido',
    email       = 'anon_' || p_user_id || '@removido.local',
    phone       = NULL,
    cpf         = NULL,
    avatar_url  = NULL,
    is_active   = false,
    updated_at  = NOW()
  WHERE id = p_user_id;

  -- Convites de portaria emitidos pelo morador
  UPDATE public.portaria_convites
  SET
    visitante_nome = 'ANONIMIZADO',
    visitante_cpf  = NULL,
    visitante_tel  = NULL
  WHERE morador_id = p_user_id;

  -- Visitantes recorrentes autorizados pelo morador
  DELETE FROM public.portaria_recorrentes
  WHERE morador_id = p_user_id;

  -- Achados e perdidos: anonimiza contato mas mantém o registro
  UPDATE public.achados_perdidos
  SET
    nome_contato     = 'ANONIMIZADO',
    telefone_contato = NULL
  WHERE user_id = p_user_id;

  -- Classificados: remove telefone de contato
  UPDATE public.classificados
  SET phone = NULL
  WHERE user_id = p_user_id;
END;
$$;

-- ── 4. Função para processar solicitação de exclusão aprovada ─────────────
CREATE OR REPLACE FUNCTION public.processar_exclusao_lgpd(p_solicitacao_id UUID, p_gestor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.lgpd_solicitacoes
  WHERE id = p_solicitacao_id AND tipo = 'exclusao' AND status = 'aprovada';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou não está aprovada';
  END IF;

  -- Anonimiza dados pessoais
  PERFORM public.anonimizar_perfil(v_user_id);

  -- Marca solicitação como concluída
  UPDATE public.lgpd_solicitacoes
  SET
    status        = 'concluida',
    processado_por = p_gestor_id,
    processado_em  = NOW()
  WHERE id = p_solicitacao_id;
END;
$$;
