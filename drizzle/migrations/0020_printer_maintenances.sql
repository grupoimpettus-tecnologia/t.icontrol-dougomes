CREATE TABLE IF NOT EXISTS public.printer_maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  printer_id uuid NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'concluida')),
  problema text NOT NULL,
  agendado_em date NOT NULL,
  tecnico_nome text,
  responsavel_nome text,
  resolvido_em date,
  resolucao text,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'agendada' AND tecnico_nome IS NULL AND responsavel_nome IS NULL AND resolvido_em IS NULL AND resolucao IS NULL)
    OR
    (status = 'concluida' AND tecnico_nome IS NOT NULL AND responsavel_nome IS NOT NULL AND resolvido_em IS NOT NULL AND resolucao IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS printer_maintenances_aberta_unica
  ON public.printer_maintenances (printer_id)
  WHERE status = 'agendada';

CREATE INDEX IF NOT EXISTS printer_maintenances_printer_id_idx
  ON public.printer_maintenances (printer_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.printer_maintenances TO authenticated;
GRANT ALL ON public.printer_maintenances TO service_role;
ALTER TABLE public.printer_maintenances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manutencoes impressora visiveis" ON public.printer_maintenances;
CREATE POLICY "manutencoes impressora visiveis" ON public.printer_maintenances FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
DROP POLICY IF EXISTS "manutencoes impressora insert" ON public.printer_maintenances;
CREATE POLICY "manutencoes impressora insert" ON public.printer_maintenances FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "manutencoes impressora update" ON public.printer_maintenances;
CREATE POLICY "manutencoes impressora update" ON public.printer_maintenances FOR UPDATE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]))
  WITH CHECK (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS "manutencoes impressora delete" ON public.printer_maintenances;
CREATE POLICY "manutencoes impressora delete" ON public.printer_maintenances FOR DELETE TO authenticated
  USING (public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['master','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS audit_printer_maintenances ON public.printer_maintenances;
CREATE TRIGGER audit_printer_maintenances
AFTER INSERT OR UPDATE OR DELETE ON public.printer_maintenances
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
    registro_novo->>'cor', registro_antigo->>'cor',
    registro_novo->>'problema', registro_antigo->>'problema',
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
    WHEN 'printer_maintenances' THEN 'Impressoras'
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

NOTIFY pgrst, 'reload schema';
