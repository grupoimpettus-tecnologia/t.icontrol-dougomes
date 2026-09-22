ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS modulo text,
  ADD COLUMN IF NOT EXISTS item_nome text,
  ADD COLUMN IF NOT EXISTS dados_anteriores jsonb,
  ADD COLUMN IF NOT EXISTS dados_novos jsonb;

ALTER POLICY audit_select ON public.audit_logs
  USING (public.is_master(auth.uid()));

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
    registro_novo->>'responsavel', registro_antigo->>'responsavel',
    registro_novo->>'email', registro_antigo->>'email',
    registro_id
  );

  modulo_nome := CASE TG_TABLE_NAME
    WHEN 'access_entries' THEN 'Mapa de acessos'
    WHEN 'service_assets' THEN 'Serviços & ativos'
    WHEN 'equipments' THEN 'Equipamentos'
    WHEN 'phone_lines' THEN 'Linhas e celulares'
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

CREATE TRIGGER audit_access_entries
AFTER INSERT OR UPDATE OR DELETE ON public.access_entries
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_service_assets
AFTER INSERT OR UPDATE OR DELETE ON public.service_assets
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_equipments
AFTER INSERT OR UPDATE OR DELETE ON public.equipments
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_phone_lines
AFTER INSERT OR UPDATE OR DELETE ON public.phone_lines
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_monitors
AFTER INSERT OR UPDATE OR DELETE ON public.monitors
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_workspaces
AFTER INSERT OR UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_user_workspaces
AFTER INSERT OR UPDATE OR DELETE ON public.user_workspaces
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER audit_invites
AFTER INSERT OR UPDATE OR DELETE ON public.invites
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TABLE public.monitor_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  canal text NOT NULL CHECK (canal IN ('email', 'push')),
  email text,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((canal = 'email' AND email IS NOT NULL AND profile_id IS NULL) OR (canal = 'push' AND profile_id IS NOT NULL AND email IS NULL)),
  UNIQUE (monitor_id, canal, email, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitor_notification_recipients TO authenticated;
GRANT ALL ON public.monitor_notification_recipients TO service_role;
ALTER TABLE public.monitor_notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_recipients_select" ON public.monitor_notification_recipients
FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "notification_recipients_insert" ON public.monitor_notification_recipients
FOR INSERT TO authenticated
WITH CHECK (public.is_master(auth.uid()) OR public.workspace_role(auth.uid(), workspace_id) IN ('admin', 'tecnico'));
CREATE POLICY "notification_recipients_update" ON public.monitor_notification_recipients
FOR UPDATE TO authenticated
USING (public.is_master(auth.uid()) OR public.workspace_role(auth.uid(), workspace_id) IN ('admin', 'tecnico'))
WITH CHECK (public.is_master(auth.uid()) OR public.workspace_role(auth.uid(), workspace_id) IN ('admin', 'tecnico'));
CREATE POLICY "notification_recipients_delete" ON public.monitor_notification_recipients
FOR DELETE TO authenticated
USING (public.is_master(auth.uid()) OR public.workspace_role(auth.uid(), workspace_id) IN ('admin', 'tecnico'));

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  plataforma text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_own_select" ON public.push_subscriptions
FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "push_subscriptions_own_insert" ON public.push_subscriptions
FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "push_subscriptions_own_update" ON public.push_subscriptions
FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "push_subscriptions_own_delete" ON public.push_subscriptions
FOR DELETE TO authenticated USING (profile_id = auth.uid());

CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid REFERENCES public.monitors(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  canal text NOT NULL CHECK (canal IN ('email', 'push', 'webhook')),
  destinatario text,
  evento text NOT NULL CHECK (evento IN ('indisponivel', 'recuperado')),
  enviado boolean NOT NULL DEFAULT false,
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_logs_select" ON public.notification_logs
FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));

CREATE INDEX monitor_notification_recipients_monitor_idx ON public.monitor_notification_recipients(monitor_id);
CREATE INDEX push_subscriptions_profile_idx ON public.push_subscriptions(profile_id);
CREATE INDEX notification_logs_monitor_created_idx ON public.notification_logs(monitor_id, created_at DESC);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX audit_logs_module_idx ON public.audit_logs(modulo, created_at DESC);