-- Adiciona campo de localização em texto livre na tabela de ocorrências.
-- Permite que o morador informe "Chácara 034", "Rua 3", "Área da piscina", etc.
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location TEXT;
