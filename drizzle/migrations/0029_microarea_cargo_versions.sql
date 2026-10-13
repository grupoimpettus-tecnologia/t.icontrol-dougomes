CREATE TABLE public.microarea_cargo_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 nome text NOT NULL CHECK (length(trim(nome)) > 0),
 periodo text,
 atual boolean NOT NULL DEFAULT false,
 funcoes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(funcoes) = 'array'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.microarea_cargo_versions TO authenticated;
GRANT ALL ON public.microarea_cargo_versions TO service_role;
ALTER TABLE public.microarea_cargo_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cargo_versions_read ON public.microarea_cargo_versions FOR SELECT TO authenticated USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY cargo_versions_insert ON public.microarea_cargo_versions FOR INSERT TO authenticated WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id));
CREATE POLICY cargo_versions_update ON public.microarea_cargo_versions FOR UPDATE TO authenticated USING (public.can_manage_workspace(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id));
CREATE UNIQUE INDEX cargo_versions_current ON public.microarea_cargo_versions(workspace_id) WHERE atual;
CREATE TRIGGER cargo_versions_audit AFTER INSERT OR UPDATE ON public.microarea_cargo_versions FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
INSERT INTO public.microarea_cargo_versions (workspace_id, nome, atual, funcoes)
SELECT workspace_id, 'Visão atual', true, jsonb_agg(jsonb_build_object('microarea', microarea, 'cargo', cargo, 'funcoes_html', funcoes_html) ORDER BY microarea, cargo)
FROM public.microarea_role_functions GROUP BY workspace_id;