ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS escopo text;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS escopo_nome text;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS classificacao text;

DO $$ BEGIN
  ALTER TABLE public.demandas ADD CONSTRAINT demandas_escopo_check
    CHECK (escopo IS NULL OR escopo IN ('empresa', 'unidade', 'marca'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.demandas ADD CONSTRAINT demandas_classificacao_check
    CHECK (classificacao IS NULL OR classificacao IN ('baixa', 'media', 'alta'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
