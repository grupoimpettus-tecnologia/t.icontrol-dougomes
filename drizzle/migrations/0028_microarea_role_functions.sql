CREATE TABLE public.microarea_role_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  microarea text NOT NULL CHECK (microarea IN ('Infraestrutura', 'Segurança', 'Sistema PDV', 'Implantação PDV')),
  cargo text NOT NULL CHECK (cargo IN ('Gestor', 'Analista', 'Assistente')),
  funcoes_html text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, microarea, cargo)
);
GRANT SELECT, INSERT, UPDATE ON public.microarea_role_functions TO authenticated;
GRANT ALL ON public.microarea_role_functions TO service_role;
ALTER TABLE public.microarea_role_functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY microarea_functions_read ON public.microarea_role_functions FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY microarea_functions_insert ON public.microarea_role_functions FOR INSERT TO authenticated
WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id));
CREATE POLICY microarea_functions_update ON public.microarea_role_functions FOR UPDATE TO authenticated
USING (public.can_manage_workspace(auth.uid(), workspace_id))
WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id));
CREATE TRIGGER microarea_functions_audit AFTER INSERT OR UPDATE ON public.microarea_role_functions
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();