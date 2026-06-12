-- 039 — Adiciona Portaria Limoeiro e Portaria Pioneiros
-- Execute no SQL Editor do Supabase

INSERT INTO public.telefones_uteis
  (nome, categoria, telefone, descricao, emoji, ordem, is_active)
VALUES
  ('Portaria Limoeiro',  'Condomínio', '(43) 99999-0003', 'Portaria 24h — controle de acesso', '🏡', 2, true),
  ('Portaria Pioneiros', 'Condomínio', '(43) 99999-0004', 'Portaria 24h — controle de acesso', '🏡', 3, true)
ON CONFLICT DO NOTHING;
