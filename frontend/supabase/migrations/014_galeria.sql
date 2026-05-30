-- Galeria fotográfica do condomínio
CREATE TABLE public.galeria_fotos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  src         TEXT        NOT NULL,
  caption     TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'Natureza',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_galeria_cat     ON public.galeria_fotos(category);
CREATE INDEX idx_galeria_created ON public.galeria_fotos(created_at DESC);

ALTER TABLE public.galeria_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "galeria_select" ON public.galeria_fotos FOR SELECT USING (is_active = true);
CREATE POLICY "galeria_insert" ON public.galeria_fotos FOR INSERT WITH CHECK (public.is_gestor());
CREATE POLICY "galeria_update" ON public.galeria_fotos FOR UPDATE USING (public.is_gestor());

-- Seed das fotos existentes (arquivos servidos do /public/galeria/)
INSERT INTO public.galeria_fotos (src, caption, category) VALUES
  ('/galeria/natureza/unnamed.webp',                              'Lago ao entardecer',              'Natureza'),
  ('/galeria/natureza/unnamed%20(1).webp',                        'Pôr do sol no lago',              'Natureza'),
  ('/galeria/natureza/unnamed%20(2).webp',                        'Gansos no lago',                  'Natureza'),
  ('/galeria/natureza/unnamed%20(5).webp',                        'Pelicanos na represa',            'Natureza'),
  ('/galeria/natureza/unnamed%20(8).webp',                        'Vista panorâmica da região',      'Natureza'),
  ('/galeria/natureza/unnamed%20(9).webp',                        'Lago e mata nativa',              'Natureza'),
  ('/galeria/natureza/unnamed%20(12).webp',                       'Campos verdes do entorno',        'Natureza'),
  ('/galeria/infraestrutura/unnamed%20(4).webp',                  'Portaria — entrada principal',    'Infraestrutura'),
  ('/galeria/infraestrutura/unnamed%20(6).webp',                  'Sede do condomínio à noite',      'Infraestrutura'),
  ('/galeria/natureza/unnamed%20(3).webp',                        'Área de pesca e descanso',        'Lazer'),
  ('/galeria/natureza/unnamed%20(11).webp',                       'Calçada à beira do lago',         'Lazer'),
  ('/galeria/lazer/unnamed%20(10).webp',                          'Fogueira noturna',                'Lazer'),
  ('/galeria/esportes/bfa38d32-829f-46ba-8e8d-6e55d1a61893.jpg', 'Quadra de futsal',                'Esportes');

-- Bucket público para novas fotos da galeria
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('galeria', 'galeria', true, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "galeria_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'galeria');
CREATE POLICY "galeria_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'galeria' AND public.is_gestor());
