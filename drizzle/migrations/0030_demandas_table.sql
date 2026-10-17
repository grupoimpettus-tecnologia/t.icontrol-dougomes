CREATE TABLE IF NOT EXISTS public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  data_inicio date NOT NULL,
  data_pedida date NOT NULL,
  data_entrega date NOT NULL,
  observacoes_html text,
  escopo text,
  escopo_nome text,
  classificacao text,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, data_entrega)
);

ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS observacoes_html text;
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

CREATE INDEX IF NOT EXISTS demandas_workspace_idx ON public.demandas (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT ALL ON public.demandas TO service_role;

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demandas visiveis" ON public.demandas;
DROP POLICY IF EXISTS "demandas insert" ON public.demandas;
DROP POLICY IF EXISTS "demandas update" ON public.demandas;
DROP POLICY IF EXISTS "demandas delete" ON public.demandas;

CREATE POLICY "demandas visiveis" ON public.demandas FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "demandas insert" ON public.demandas FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "demandas update" ON public.demandas FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "demandas delete" ON public.demandas FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));

DROP TRIGGER IF EXISTS audit_demandas ON public.demandas;

CREATE TRIGGER audit_demandas
AFTER INSERT OR UPDATE OR DELETE ON public.demandas
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

NOTIFY pgrst, 'reload schema';