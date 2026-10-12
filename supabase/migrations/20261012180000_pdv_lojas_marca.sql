CREATE TABLE IF NOT EXISTS public.pdv_loja_api_estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  codigo_franquia integer NOT NULL,
  codigo_loja integer NOT NULL,
  marca text NOT NULL,
  nome text NOT NULL,
  cnpj text NOT NULL,
  visto_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, codigo_franquia, codigo_loja)
);

CREATE TABLE IF NOT EXISTS public.pdv_loja_atualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  codigo_franquia integer NOT NULL,
  codigo_loja integer NOT NULL,
  marca text NOT NULL,
  nome text NOT NULL,
  cnpj_anterior text NOT NULL,
  cnpj_novo text NOT NULL,
  vigente_ate timestamptz NOT NULL,
  alterado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, codigo_franquia, codigo_loja, cnpj_anterior, cnpj_novo)
);

CREATE INDEX IF NOT EXISTS pdv_loja_api_estado_workspace_idx ON public.pdv_loja_api_estado (workspace_id);
CREATE INDEX IF NOT EXISTS pdv_loja_atualizacoes_workspace_idx ON public.pdv_loja_atualizacoes (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_loja_api_estado TO authenticated;
GRANT ALL ON public.pdv_loja_api_estado TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_loja_atualizacoes TO authenticated;
GRANT ALL ON public.pdv_loja_atualizacoes TO service_role;

ALTER TABLE public.pdv_loja_api_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_loja_atualizacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdv api estado visiveis" ON public.pdv_loja_api_estado;
DROP POLICY IF EXISTS "pdv api estado insert" ON public.pdv_loja_api_estado;
DROP POLICY IF EXISTS "pdv api estado update" ON public.pdv_loja_api_estado;
DROP POLICY IF EXISTS "pdv api estado delete" ON public.pdv_loja_api_estado;
DROP POLICY IF EXISTS "pdv atualizacoes visiveis" ON public.pdv_loja_atualizacoes;
DROP POLICY IF EXISTS "pdv atualizacoes insert" ON public.pdv_loja_atualizacoes;
DROP POLICY IF EXISTS "pdv atualizacoes delete" ON public.pdv_loja_atualizacoes;

CREATE POLICY "pdv api estado visiveis" ON public.pdv_loja_api_estado FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv api estado insert" ON public.pdv_loja_api_estado FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv api estado update" ON public.pdv_loja_api_estado FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.my_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv api estado delete" ON public.pdv_loja_api_estado FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

CREATE POLICY "pdv atualizacoes visiveis" ON public.pdv_loja_atualizacoes FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv atualizacoes insert" ON public.pdv_loja_atualizacoes FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv atualizacoes delete" ON public.pdv_loja_atualizacoes FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS audit_pdv_loja_api_estado ON public.pdv_loja_api_estado;
DROP TRIGGER IF EXISTS audit_pdv_loja_atualizacoes ON public.pdv_loja_atualizacoes;

CREATE TRIGGER audit_pdv_loja_api_estado
AFTER INSERT OR UPDATE OR DELETE ON public.pdv_loja_api_estado
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TRIGGER audit_pdv_loja_atualizacoes
AFTER INSERT OR UPDATE OR DELETE ON public.pdv_loja_atualizacoes
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

NOTIFY pgrst, 'reload schema';
