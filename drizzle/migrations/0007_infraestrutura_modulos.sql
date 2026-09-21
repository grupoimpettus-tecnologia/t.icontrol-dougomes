CREATE TABLE public.access_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo text,
  tipo text,
  url text,
  usuario text,
  ambiente text,
  custo_mensal numeric(12,2),
  observacoes text,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_entries TO authenticated;
GRANT ALL ON public.access_entries TO service_role;
ALTER TABLE public.access_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acessos visiveis" ON public.access_entries FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "acessos insert" ON public.access_entries FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "acessos update" ON public.access_entries FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "acessos delete" ON public.access_entries FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

CREATE TABLE public.service_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo text,
  tipo_contrato text,
  fornecedor text,
  custo numeric(12,2),
  status text,
  renovacao_em date,
  contrato_url text,
  observacoes text,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_assets TO authenticated;
GRANT ALL ON public.service_assets TO service_role;
ALTER TABLE public.service_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos visiveis" ON public.service_assets FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "servicos insert" ON public.service_assets FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "servicos update" ON public.service_assets FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "servicos delete" ON public.service_assets FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

CREATE TABLE public.equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  patrimonio text NOT NULL,
  tipo text,
  marca text,
  modelo text,
  configuracao text,
  responsavel text,
  setor text,
  local text,
  condicao text,
  status text,
  custo_compra numeric(12,2),
  numero_serie text,
  ip text,
  termo_url text,
  grupo text,
  observacoes text,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipments TO authenticated;
GRANT ALL ON public.equipments TO service_role;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipamentos visiveis" ON public.equipments FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "equipamentos insert" ON public.equipments FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "equipamentos update" ON public.equipments FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "equipamentos delete" ON public.equipments FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

CREATE TABLE public.phone_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  responsavel text NOT NULL,
  linha text,
  operadora text,
  plano text,
  valor numeric(12,2),
  tipo_linha text,
  pacote_extra text,
  setor text,
  status text,
  condicoes text,
  tem_aparelho boolean NOT NULL DEFAULT false,
  marca text,
  modelo text,
  sistema text,
  imei text,
  fidelidade_ate date,
  grupo text,
  observacoes text,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_lines TO authenticated;
GRANT ALL ON public.phone_lines TO service_role;
ALTER TABLE public.phone_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "linhas visiveis" ON public.phone_lines FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "linhas insert" ON public.phone_lines FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "linhas update" ON public.phone_lines FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
CREATE POLICY "linhas delete" ON public.phone_lines FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));