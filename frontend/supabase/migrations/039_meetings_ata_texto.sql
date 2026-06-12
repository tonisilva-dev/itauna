-- Adiciona coluna para armazenar a ata oficial confirmada pelo gestor
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ata_texto text;
