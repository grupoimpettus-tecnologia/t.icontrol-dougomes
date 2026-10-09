CREATE TABLE IF NOT EXISTS public.pdv_layout_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  periodo text,
  atual boolean NOT NULL DEFAULT false,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pdv_layout_versoes_workspace_idx ON public.pdv_layout_versoes (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_layout_versoes TO authenticated;
GRANT ALL ON public.pdv_layout_versoes TO service_role;

ALTER TABLE public.pdv_layout_versoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdv layout visiveis" ON public.pdv_layout_versoes;
DROP POLICY IF EXISTS "pdv layout insert" ON public.pdv_layout_versoes;
DROP POLICY IF EXISTS "pdv layout update" ON public.pdv_layout_versoes;
DROP POLICY IF EXISTS "pdv layout delete" ON public.pdv_layout_versoes;

CREATE POLICY "pdv layout visiveis" ON public.pdv_layout_versoes FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv layout insert" ON public.pdv_layout_versoes FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "pdv layout update" ON public.pdv_layout_versoes FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "pdv layout delete" ON public.pdv_layout_versoes FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));

DROP TRIGGER IF EXISTS audit_pdv_layout_versoes ON public.pdv_layout_versoes;

CREATE TRIGGER audit_pdv_layout_versoes
AFTER INSERT OR UPDATE OR DELETE ON public.pdv_layout_versoes
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

NOTIFY pgrst, 'reload schema';
