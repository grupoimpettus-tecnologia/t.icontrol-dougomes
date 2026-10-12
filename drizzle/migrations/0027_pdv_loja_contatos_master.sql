CREATE TABLE public.pdv_loja_contatos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 codigo_franquia integer NOT NULL,
 codigo_loja integer NOT NULL,
 email text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id, codigo_franquia, codigo_loja)
);
GRANT SELECT, INSERT, UPDATE ON public.pdv_loja_contatos TO authenticated;
GRANT ALL ON public.pdv_loja_contatos TO service_role;
ALTER TABLE public.pdv_loja_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY contatos_leitura ON public.pdv_loja_contatos FOR SELECT TO authenticated USING (public.workspace_role(auth.uid(), workspace_id) IS NOT NULL);
CREATE POLICY contatos_master_inserir ON public.pdv_loja_contatos FOR INSERT TO authenticated WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY contatos_master_atualizar ON public.pdv_loja_contatos FOR UPDATE TO authenticated USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE TRIGGER audit_pdv_loja_contatos AFTER INSERT OR UPDATE OR DELETE ON public.pdv_loja_contatos FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
NOTIFY pgrst, 'reload schema';