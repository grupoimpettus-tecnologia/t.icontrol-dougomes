CREATE TABLE IF NOT EXISTS public.phone_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  modelo text NOT NULL,
  status text NOT NULL DEFAULT 'Funcionando',
  estado text NOT NULL DEFAULT 'Novo',
  quantidade integer NOT NULL DEFAULT 0,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_stock TO authenticated;
GRANT ALL ON public.phone_stock TO service_role;
ALTER TABLE public.phone_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque celulares visiveis" ON public.phone_stock;
CREATE POLICY "estoque celulares visiveis" ON public.phone_stock FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
DROP POLICY IF EXISTS "estoque celulares insert" ON public.phone_stock;
CREATE POLICY "estoque celulares insert" ON public.phone_stock FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "estoque celulares update" ON public.phone_stock;
CREATE POLICY "estoque celulares update" ON public.phone_stock FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "estoque celulares delete" ON public.phone_stock;
CREATE POLICY "estoque celulares delete" ON public.phone_stock FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS audit_phone_stock ON public.phone_stock;
CREATE TRIGGER audit_phone_stock
AFTER INSERT OR UPDATE OR DELETE ON public.phone_stock
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  registro_antigo jsonb;
  registro_novo jsonb;
  ws uuid;
  registro_id text;
  nome_item text;
  modulo_nome text;
  acao_nome text;
BEGIN
  IF uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  registro_antigo := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  registro_novo := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;

  ws := COALESCE(
    NULLIF(COALESCE(registro_novo, registro_antigo)->>'workspace_id', '')::uuid,
    CASE WHEN TG_TABLE_NAME = 'workspaces' THEN NULLIF(COALESCE(registro_novo, registro_antigo)->>'id', '')::uuid ELSE NULL END
  );
  registro_id := COALESCE(registro_novo->>'id', registro_antigo->>'id');
  nome_item := COALESCE(
    registro_novo->>'nome', registro_antigo->>'nome',
    registro_novo->>'patrimonio', registro_antigo->>'patrimonio',
    registro_novo->>'modelo', registro_antigo->>'modelo',
    registro_novo->>'responsavel', registro_antigo->>'responsavel',
    registro_novo->>'email', registro_antigo->>'email',
    registro_id
  );

  modulo_nome := CASE TG_TABLE_NAME
    WHEN 'access_entries' THEN 'Mapa de acessos'
    WHEN 'service_assets' THEN 'Serviços & ativos'
    WHEN 'equipments' THEN 'Equipamentos'
    WHEN 'phone_lines' THEN 'Linhas e celulares'
    WHEN 'phone_stock' THEN 'Estoque Celulares'
    WHEN 'monitors' THEN 'Monitoramento'
    WHEN 'workspaces' THEN 'Empresas'
    WHEN 'user_workspaces' THEN 'Usuários'
    WHEN 'invites' THEN 'Convites'
    ELSE TG_TABLE_NAME
  END;

  acao_nome := CASE TG_OP WHEN 'INSERT' THEN 'criado' WHEN 'UPDATE' THEN 'alterado' ELSE 'excluido' END;

  INSERT INTO public.audit_logs (
    workspace_id, user_id, acao, entidade, entidade_id, modulo, item_nome,
    dados_anteriores, dados_novos, metadata
  ) VALUES (
    ws, uid, acao_nome, TG_TABLE_NAME, registro_id, modulo_nome, nome_item,
    registro_antigo, registro_novo,
    jsonb_build_object('operacao', TG_OP)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Dados iniciais do estoque de celulares (mesmos do inventário de referência).
INSERT INTO public.phone_stock (workspace_id, modelo, status, estado, quantidade)
SELECT w.id, seed.modelo, seed.status, seed.estado, seed.quantidade
FROM public.workspaces w
CROSS JOIN (
  VALUES
    ('Samsung A14 (128 GB M. Interna)', 'Funcionando', 'Novo', 2),
    ('LG K22 (32 GB M. Interna)', 'Funcionando', 'Antigo', 2),
    ('LG K22 (32 GB M. Interna)', 'Manutenção', 'Antigo', 1),
    ('Tecno K17', 'Manutenção', 'Antigo', 1),
    ('Samsung A26 5G (256 GB M. Interna)', 'Sem Estoque', 'Novo', 0)
) AS seed(modelo, status, estado, quantidade)
WHERE NOT EXISTS (
  SELECT 1 FROM public.phone_stock ps WHERE ps.workspace_id = w.id
);
