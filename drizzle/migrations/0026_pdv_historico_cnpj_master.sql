DROP POLICY IF EXISTS "pdv api estado insert" ON public.pdv_loja_api_estado;
DROP POLICY IF EXISTS "pdv api estado update" ON public.pdv_loja_api_estado;
DROP POLICY IF EXISTS "pdv atualizacoes insert" ON public.pdv_loja_atualizacoes;

CREATE POLICY "pdv api estado insert" ON public.pdv_loja_api_estado FOR INSERT TO authenticated
  WITH CHECK (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv api estado update" ON public.pdv_loja_api_estado FOR UPDATE TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())))
  WITH CHECK (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv atualizacoes insert" ON public.pdv_loja_atualizacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));

NOTIFY pgrst, 'reload schema';