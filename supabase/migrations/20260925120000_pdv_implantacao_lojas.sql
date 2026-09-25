CREATE TABLE IF NOT EXISTS public.pdv_lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  marca text NOT NULL,
  cnpj text NOT NULL,
  status text NOT NULL DEFAULT 'fase_inicial'
    CHECK (status = ANY (ARRAY['fase_inicial','em_andamento','em_lancamento','concluida'])),
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pdv_loja_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.pdv_lojas(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  etapa_id text NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  evidencia_html text,
  concluida_em timestamptz,
  concluida_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id, etapa_id)
);

CREATE INDEX IF NOT EXISTS pdv_lojas_workspace_idx ON public.pdv_lojas (workspace_id);
CREATE INDEX IF NOT EXISTS pdv_loja_etapas_loja_idx ON public.pdv_loja_etapas (loja_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_lojas TO authenticated;
GRANT ALL ON public.pdv_lojas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_loja_etapas TO authenticated;
GRANT ALL ON public.pdv_loja_etapas TO service_role;

ALTER TABLE public.pdv_lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_loja_etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdv lojas visiveis" ON public.pdv_lojas;
DROP POLICY IF EXISTS "pdv lojas insert" ON public.pdv_lojas;
DROP POLICY IF EXISTS "pdv lojas update" ON public.pdv_lojas;
DROP POLICY IF EXISTS "pdv lojas delete" ON public.pdv_lojas;
DROP POLICY IF EXISTS "pdv etapas visiveis" ON public.pdv_loja_etapas;
DROP POLICY IF EXISTS "pdv etapas insert" ON public.pdv_loja_etapas;
DROP POLICY IF EXISTS "pdv etapas update" ON public.pdv_loja_etapas;
DROP POLICY IF EXISTS "pdv etapas delete" ON public.pdv_loja_etapas;

CREATE POLICY "pdv lojas visiveis" ON public.pdv_lojas FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv lojas insert" ON public.pdv_lojas FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "pdv lojas update" ON public.pdv_lojas FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "pdv lojas delete" ON public.pdv_lojas FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

CREATE POLICY "pdv etapas visiveis" ON public.pdv_loja_etapas FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "pdv etapas insert" ON public.pdv_loja_etapas FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "pdv etapas update" ON public.pdv_loja_etapas FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "pdv etapas delete" ON public.pdv_loja_etapas FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS audit_pdv_lojas ON public.pdv_lojas;
DROP TRIGGER IF EXISTS audit_pdv_loja_etapas ON public.pdv_loja_etapas;

CREATE TRIGGER audit_pdv_lojas
AFTER INSERT OR UPDATE OR DELETE ON public.pdv_lojas
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TRIGGER audit_pdv_loja_etapas
AFTER INSERT OR UPDATE OR DELETE ON public.pdv_loja_etapas
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

NOTIFY pgrst, 'reload schema';
