CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invites%ROWTYPE;
  ws uuid;
  uid uuid := auth.uid();
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'nao_autenticado');
  END IF;

  SELECT email INTO user_email FROM public.profiles WHERE id = uid;

  SELECT * INTO inv FROM public.invites WHERE token = _token;
  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'convite_invalido');
  END IF;
  IF inv.aceito_em IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'convite_ja_utilizado');
  END IF;
  IF inv.expira_em < now() THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'convite_expirado');
  END IF;
  IF lower(inv.email) <> lower(coalesce(user_email, '')) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'email_diferente');
  END IF;

  FOREACH ws IN ARRAY inv.workspace_ids LOOP
    INSERT INTO public.user_workspaces (profile_id, workspace_id, role_no_workspace)
    VALUES (uid, ws, inv.role)
    ON CONFLICT (profile_id, workspace_id)
    DO UPDATE SET role_no_workspace = EXCLUDED.role_no_workspace;
  END LOOP;

  UPDATE public.invites SET aceito_em = now() WHERE id = inv.id;

  INSERT INTO public.audit_logs (workspace_id, user_id, acao, entidade, entidade_id)
  VALUES (NULL, uid, 'convite_aceito', 'invites', inv.id::text);

  RETURN jsonb_build_object('ok', true, 'empresas', to_jsonb(inv.workspace_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;