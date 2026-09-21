GRANT SELECT ON public.workspaces TO anon;

CREATE POLICY "empresas com status publico" ON public.workspaces
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.monitors m WHERE m.workspace_id = workspaces.id AND m.publico));