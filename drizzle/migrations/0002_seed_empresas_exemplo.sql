INSERT INTO public.workspaces (nome, slug, segmento, ativo)
VALUES
  ('Grupo Impettus', 'grupo-impettus', 'Varejo', true),
  ('Impettus Tecnologia', 'impettus-tecnologia', 'Tecnologia', true)
ON CONFLICT (slug) DO NOTHING;