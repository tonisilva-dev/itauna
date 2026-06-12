-- Migration 040 — Imagens Festa Junina → Galeria + Novas fotos Natureza
-- 1. Move imagens do evento Festa Junina para galeria_fotos (categoria Eventos)
-- 2. Remove image_url do registro do evento
-- 3. Adiciona as duas novas fotos de natureza

-- Adicionar categoria 'Eventos' ao check constraint se existir
-- (galeria_fotos não tem check constraint de categoria, pode inserir livremente)

-- 1. Migrar imagens da Festa Junina para galeria_fotos
INSERT INTO public.galeria_fotos (src, caption, category)
SELECT
  image_url,
  title || ' — ' || to_char(event_date, 'DD/MM/YYYY'),
  'Eventos'
FROM public.events
WHERE title ILIKE '%junina%'
  AND image_url IS NOT NULL
  AND image_url <> '';

-- 2. Limpar image_url do evento Festa Junina
UPDATE public.events
SET image_url = NULL
WHERE title ILIKE '%junina%';

-- 3. Adicionar as duas novas fotos de natureza
INSERT INTO public.galeria_fotos (src, caption, category) VALUES
  ('/galeria/natureza/3bf099c2-98f9-4d01-9f11-0ca74937d0f9.jpg', 'Natureza — Chácaras Itaúna', 'Natureza'),
  ('/galeria/natureza/5d6cc820-c066-4baa-b726-3de4e623003c.jpg', 'Paisagem natural — Itaúna',  'Natureza');
