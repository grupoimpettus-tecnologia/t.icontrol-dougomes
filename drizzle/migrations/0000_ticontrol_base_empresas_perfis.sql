-- Enum de perfis
CREATE TYPE public.app_role AS ENUM ('master', 'admin', 'tecnico', 'viewer');

-- Perfis de usuário
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  role_global public.app_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Empresas (workspaces)
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  segmento text,
  logo_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Vínculo usuário <-> empresa
CREATE TABLE public.user_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role_no_workspace public.app_role NOT NULL DEFAULT 'viewer',
  ultimo_acesso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, workspace_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_workspaces TO authenticated;
GRANT ALL ON public.user_workspaces TO service_role;
ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;

-- Convites
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nome text,
  role public.app_role NOT NULL DEFAULT 'viewer',
  workspace_ids uuid[] NOT NULL DEFAULT '{}',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expira_em timestamptz NOT NULL DEFAULT now() + interval '7 days',
  aceito_em timestamptz,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Auditoria
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  acao text NOT NULL,
  entidade text,
  entidade_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares (security definer evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role_global = 'master');
$$;

CREATE OR REPLACE FUNCTION public.my_workspace_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM public.user_workspaces WHERE profile_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.workspace_role(_user_id uuid, _workspace_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_master(_user_id) THEN 'master'::public.app_role ELSE (
    SELECT role_no_workspace FROM public.user_workspaces
    WHERE profile_id = _user_id AND workspace_id = _workspace_id
  ) END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_master(_user_id)
     OR public.workspace_role(_user_id, _workspace_id) = 'admin';
$$;

-- Primeiro usuário do sistema vira Master
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first;
  INSERT INTO public.profiles (id, nome, email, avatar_url, role_global)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE WHEN is_first THEN 'master'::public.app_role ELSE 'viewer'::public.app_role END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas: profiles
CREATE POLICY "profiles_select_self_or_master" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_master(auth.uid()));
CREATE POLICY "profiles_update_self_or_master" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_master(auth.uid()))
WITH CHECK (id = auth.uid() OR public.is_master(auth.uid()));

-- Políticas: workspaces
CREATE POLICY "workspaces_select_vinculadas" ON public.workspaces FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "workspaces_insert_master" ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (public.is_master(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.workspaces));
CREATE POLICY "workspaces_update_master_admin" ON public.workspaces FOR UPDATE TO authenticated
USING (public.can_manage_workspace(auth.uid(), id))
WITH CHECK (public.can_manage_workspace(auth.uid(), id));
CREATE POLICY "workspaces_delete_master" ON public.workspaces FOR DELETE TO authenticated
USING (public.is_master(auth.uid()));

-- Políticas: user_workspaces
CREATE POLICY "uw_select" ON public.user_workspaces FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.can_manage_workspace(auth.uid(), workspace_id));
CREATE POLICY "uw_insert" ON public.user_workspaces FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_workspace(auth.uid(), workspace_id)
  OR (profile_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()))
);
CREATE POLICY "uw_update" ON public.user_workspaces FOR UPDATE TO authenticated
USING (profile_id = auth.uid() OR public.can_manage_workspace(auth.uid(), workspace_id))
WITH CHECK (profile_id = auth.uid() OR public.can_manage_workspace(auth.uid(), workspace_id));
CREATE POLICY "uw_delete" ON public.user_workspaces FOR DELETE TO authenticated
USING (public.can_manage_workspace(auth.uid(), workspace_id));

-- Políticas: invites
CREATE POLICY "invites_select" ON public.invites FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR criado_por = auth.uid());
CREATE POLICY "invites_insert" ON public.invites FOR INSERT TO authenticated
WITH CHECK (
  criado_por = auth.uid()
  AND (public.is_master(auth.uid())
       OR EXISTS (SELECT 1 FROM unnest(workspace_ids) ws(id)
                  WHERE public.can_manage_workspace(auth.uid(), ws.id)))
);
CREATE POLICY "invites_update" ON public.invites FOR UPDATE TO authenticated
USING (public.is_master(auth.uid()) OR criado_por = auth.uid())
WITH CHECK (public.is_master(auth.uid()) OR criado_por = auth.uid());
CREATE POLICY "invites_delete" ON public.invites FOR DELETE TO authenticated
USING (public.is_master(auth.uid()) OR criado_por = auth.uid());

-- Políticas: audit_logs
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());