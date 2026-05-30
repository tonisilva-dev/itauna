-- ================================================================
-- CONDOMÍNIO DE CHÁCARAS ITAÚNA
-- Script 003 — Seed: Dados iniciais (comunicados, eventos, docs)
-- Execute APÓS Scripts 001 e 002
-- ATENÇÃO: substitua <UUID_DO_ADMIN> pelo ID real do usuário admin
--          criado no Supabase Auth.
-- ================================================================

-- ── Variável: ID do administrador ───────────────────────────────
-- Crie primeiro o usuário no Supabase Auth (Dashboard → Authentication → Users)
-- Depois rode:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@itauna.org';
-- E use o ID retornado abaixo:
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM public.profiles
  WHERE role IN ('admin', 'sindico')
  ORDER BY created_at
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'Nenhum admin encontrado. Crie um usuário admin primeiro.';
    RETURN;
  END IF;

  -- ── COMUNICADOS ───────────────────────────────────────────────
  INSERT INTO public.announcements
    (title, content, category, priority, target_roles, is_pinned, created_by)
  VALUES
    (
      'Bem-vindos ao portal do Condomínio Itaúna!',
      'Este é o sistema oficial de gestão do Condomínio de Chácaras Itaúna. '
      'Aqui você pode acompanhar suas taxas, fazer agendamentos, consultar '
      'documentos e se comunicar com a administração.',
      'Informativo', 'normal',
      '{condominino,sindico,admin}', true,
      admin_id
    ),
    (
      'Regras para uso das áreas comuns — 2026',
      'Lembramos a todos os condôminos as regras para uso das áreas comuns: '
      '1) Piscina: horário 08h às 21h, touca obrigatória; '
      '2) Salão de festas: reservar com 7 dias de antecedência; '
      '3) Quadra: até 4h por reserva; '
      '4) Respeitar silêncio após 22h.',
      'Regulamento', 'importante',
      '{condominino,sindico,admin}', true,
      admin_id
    ),
    (
      'Atenção: Manutenção do sistema de abastecimento d''água',
      'Informamos que nos dias 10 e 11 de junho haverá interrupção no '
      'fornecimento de água para manutenção preventiva do sistema. '
      'Por favor, faça a reserva de água antecipadamente.',
      'Manutenção', 'urgente',
      '{condominino,sindico,admin}', false,
      admin_id
    ),
    (
      'Assembleia Geral Ordinária — 15/06/2026',
      'Convocamos todos os condôminos para a Assembleia Geral Ordinária '
      'a ser realizada no dia 15 de junho de 2026, às 19h00, no Salão de Festas. '
      'Pauta: prestação de contas 2025/26, eleição do síndico, aprovação do orçamento 2027.',
      'Reunião', 'urgente',
      '{condominino,sindico,admin}', true,
      admin_id
    );

  -- ── EVENTOS ───────────────────────────────────────────────────
  INSERT INTO public.events
    (title, description, event_date, start_time, end_time, location, category, max_participants, created_by)
  VALUES
    (
      'Assembleia Geral Ordinária 2026',
      'Prestação de contas, eleição do síndico e aprovação do orçamento 2027.',
      '2026-06-15', '19:00', '22:00', 'Salão de Festas', 'Reunião', NULL, admin_id
    ),
    (
      'Festa Junina do Condomínio 2026',
      'Tradicional festa junina com quadrilha, comidas típicas, forró ao vivo e muita diversão para toda a família!',
      '2026-06-27', '16:00', '23:00', 'Área da Piscina', 'Social', 300, admin_id
    ),
    (
      'Torneio de Futebol Society — Taça Itaúna',
      'Campeonato interno entre as chácaras. Inscrições abertas para times de 7 jogadores. Troféu e medalhas para os 3 primeiros colocados.',
      '2026-07-12', '08:00', '18:00', 'Campo de Futebol', 'Esporte', 140, admin_id
    ),
    (
      'Confraternização de Fim de Ano 2026',
      'Grande festa de encerramento com ceia coletiva, sorteios de brindes e animação ao vivo.',
      '2026-12-19', '19:00', '01:00', 'Salão de Festas', 'Social', 400, admin_id
    ),
    (
      'Mutirão de Limpeza Ecológica',
      'Limpeza coletiva da represa e áreas verdes. Evento já realizado com sucesso — 80 participantes.',
      '2025-10-25', '07:00', '12:00', 'Represa', 'Ambiental', 80, admin_id
    );

  -- ── DOCUMENTOS ────────────────────────────────────────────────
  INSERT INTO public.documents
    (title, description, category, file_url, file_name, file_type, is_public, access_roles, created_by)
  VALUES
    (
      'Rateio — Novembro 2025',
      'Demonstrativo de rateio das taxas condominiais com vencimento 10/11/2025',
      'Financeiro',
      '/documentos/anexo_ITAUNA - RATEIO VENC 10-11-2025.pdf',
      'ITAUNA - RATEIO VENC 10-11-2025.pdf',
      'pdf', true, '{condominino,sindico,admin}', admin_id
    ),
    (
      'Rateio — Outubro 2025',
      'Demonstrativo de rateio das taxas condominiais com vencimento 10/10/2025',
      'Financeiro',
      '/documentos/anexo_Itauna - Rateio vencimento 10-10-25.pdf',
      'Itauna - Rateio vencimento 10-10-25.pdf',
      'pdf', true, '{condominino,sindico,admin}', admin_id
    ),
    (
      'Rateio — Julho 2025',
      'Demonstrativo de rateio das taxas condominiais com vencimento 10/07/2025',
      'Financeiro',
      '/documentos/anexo_ITAUNA - RATEIO VENC 10-07-25.pdf',
      'ITAUNA - RATEIO VENC 10-07-25.pdf',
      'pdf', true, '{condominino,sindico,admin}', admin_id
    ),
    (
      'Regulamento Interno 2026',
      'Regimento interno atualizado com todas as normas de convivência do condomínio.',
      'Regulamento',
      '/documentos/regulamento-interno-2026.pdf',
      'regulamento-interno-2026.pdf',
      'pdf', true, '{condominino,sindico,admin}', admin_id
    ),
    (
      'Ata da Assembleia Geral — 2025',
      'Ata da Assembleia Geral Ordinária realizada em novembro de 2025.',
      'Atas',
      '/documentos/ata-ago-2025.pdf',
      'ata-ago-2025.pdf',
      'pdf', false, '{sindico,admin}', admin_id
    );

  RAISE NOTICE 'Dados iniciais inseridos com sucesso! Admin ID: %', admin_id;
END;
$$;
