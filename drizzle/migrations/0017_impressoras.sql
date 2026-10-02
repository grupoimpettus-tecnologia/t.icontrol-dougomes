CREATE TABLE IF NOT EXISTS public.printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  local text,
  modelo text,
  tipo_contrato text,
  ip text,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.printer_toner_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  printer_id uuid NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  cor text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (printer_id, cor)
);

CREATE TABLE IF NOT EXISTS public.printer_toner_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  printer_id uuid NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  cor text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'troca')),
  quantidade integer NOT NULL CHECK (quantidade > 0),
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES public.profiles(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.printers TO authenticated;
GRANT ALL ON public.printers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.printer_toner_stock TO authenticated;
GRANT ALL ON public.printer_toner_stock TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.printer_toner_movements TO authenticated;
GRANT ALL ON public.printer_toner_movements TO service_role;

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_toner_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_toner_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "impressoras visiveis" ON public.printers;
CREATE POLICY "impressoras visiveis" ON public.printers FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
DROP POLICY IF EXISTS "impressoras insert" ON public.printers;
CREATE POLICY "impressoras insert" ON public.printers FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "impressoras update" ON public.printers;
CREATE POLICY "impressoras update" ON public.printers FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "impressoras delete" ON public.printers;
CREATE POLICY "impressoras delete" ON public.printers FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

DROP POLICY IF EXISTS "toner visivel" ON public.printer_toner_stock;
CREATE POLICY "toner visivel" ON public.printer_toner_stock FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
DROP POLICY IF EXISTS "toner insert" ON public.printer_toner_stock;
CREATE POLICY "toner insert" ON public.printer_toner_stock FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "toner update" ON public.printer_toner_stock;
CREATE POLICY "toner update" ON public.printer_toner_stock FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "toner delete" ON public.printer_toner_stock;
CREATE POLICY "toner delete" ON public.printer_toner_stock FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

DROP POLICY IF EXISTS "movimentos toner visiveis" ON public.printer_toner_movements;
CREATE POLICY "movimentos toner visiveis" ON public.printer_toner_movements FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
DROP POLICY IF EXISTS "movimentos toner insert" ON public.printer_toner_movements;
CREATE POLICY "movimentos toner insert" ON public.printer_toner_movements FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "movimentos toner delete" ON public.printer_toner_movements;
CREATE POLICY "movimentos toner delete" ON public.printer_toner_movements FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS audit_printers ON public.printers;
CREATE TRIGGER audit_printers
AFTER INSERT OR UPDATE OR DELETE ON public.printers
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_printer_toner_stock ON public.printer_toner_stock;
CREATE TRIGGER audit_printer_toner_stock
AFTER INSERT OR UPDATE OR DELETE ON public.printer_toner_stock
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_printer_toner_movements ON public.printer_toner_movements;
CREATE TRIGGER audit_printer_toner_movements
AFTER INSERT OR UPDATE OR DELETE ON public.printer_toner_movements
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE OR REPLACE FUNCTION public.registrar_toner(
  _printer_id uuid,
  _cor text,
  _tipo text,
  _quantidade integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  ws uuid;
  atual integer;
BEGIN
  IF _tipo NOT IN ('entrada', 'troca') THEN
    RAISE EXCEPTION 'Tipo de movimento inválido';
  END IF;
  IF _cor NOT IN ('Preto', 'Ciano', 'Magenta', 'Amarelo') THEN
    RAISE EXCEPTION 'Cor de toner inválida';
  END IF;

  SELECT workspace_id INTO ws FROM public.printers WHERE id = _printer_id;
  IF ws IS NULL THEN
    RAISE EXCEPTION 'Impressora não encontrada';
  END IF;
  IF public.workspace_role(auth.uid(), ws) IS NULL
     OR public.workspace_role(auth.uid(), ws) NOT IN ('master', 'admin', 'tecnico') THEN
    RAISE EXCEPTION 'Sem permissão para movimentar toner';
  END IF;

  INSERT INTO public.printer_toner_stock (workspace_id, printer_id, cor, quantidade)
  VALUES (ws, _printer_id, _cor, 0)
  ON CONFLICT (printer_id, cor) DO NOTHING;

  SELECT quantidade INTO atual
  FROM public.printer_toner_stock
  WHERE printer_id = _printer_id AND cor = _cor
  FOR UPDATE;

  IF _tipo = 'troca' THEN
    IF COALESCE(atual, 0) < 1 THEN
      RAISE EXCEPTION 'Sem estoque de toner %', _cor;
    END IF;
    UPDATE public.printer_toner_stock
      SET quantidade = quantidade - 1, updated_at = now()
      WHERE printer_id = _printer_id AND cor = _cor;
    INSERT INTO public.printer_toner_movements (workspace_id, printer_id, cor, tipo, quantidade, criado_por)
    VALUES (ws, _printer_id, _cor, 'troca', 1, auth.uid());
  ELSE
    IF COALESCE(_quantidade, 0) < 1 THEN
      RAISE EXCEPTION 'Informe a quantidade da entrada';
    END IF;
    UPDATE public.printer_toner_stock
      SET quantidade = quantidade + _quantidade, updated_at = now()
      WHERE printer_id = _printer_id AND cor = _cor;
    INSERT INTO public.printer_toner_movements (workspace_id, printer_id, cor, tipo, quantidade, criado_por)
    VALUES (ws, _printer_id, _cor, 'entrada', _quantidade, auth.uid());
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_toner(uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_toner(uuid, text, text, integer) TO authenticated, service_role;

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
    registro_novo->>'cor', registro_antigo->>'cor',
    registro_id
  );

  modulo_nome := CASE TG_TABLE_NAME
    WHEN 'access_entries' THEN 'Mapa de acessos'
    WHEN 'service_assets' THEN 'Serviços & ativos'
    WHEN 'equipments' THEN 'Equipamentos'
    WHEN 'phone_lines' THEN 'Linhas e celulares'
    WHEN 'phone_stock' THEN 'Estoque Celulares'
    WHEN 'monitors' THEN 'Monitoramento'
    WHEN 'printers' THEN 'Impressoras'
    WHEN 'printer_toner_stock' THEN 'Impressoras'
    WHEN 'printer_toner_movements' THEN 'Impressoras'
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
