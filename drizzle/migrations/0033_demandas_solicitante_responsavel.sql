ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS solicitante_nome text;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS responsavel_nome text;

NOTIFY pgrst, 'reload schema';
