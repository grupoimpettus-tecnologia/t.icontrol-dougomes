-- Renomeia situação legada "Reposição de Peças" para "Descarte".
UPDATE public.equipments
SET
  status = 'Descarte',
  updated_at = now()
WHERE lower(trim(status)) IN (
  'reposição de peças',
  'reposicao de pecas',
  'reposição de pecas',
  'reposicao de peças'
);
