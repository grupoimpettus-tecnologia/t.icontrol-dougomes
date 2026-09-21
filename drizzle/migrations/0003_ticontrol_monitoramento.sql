CREATE TYPE public.monitor_type AS ENUM ('http','keyword','tcp','dns','heartbeat');
CREATE TYPE public.monitor_status AS ENUM ('pendente','ativo','fora','pausado');

CREATE TABLE public.monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo public.monitor_type NOT NULL DEFAULT 'http',
  url text,
  hostname text,
  porta integer,
  keyword text,
  dns_tipo text DEFAULT 'A',
  metodo text NOT NULL DEFAULT 'GET',
  status_codes_aceitos text NOT NULL DEFAULT '200-299',
  intervalo_segundos integer NOT NULL DEFAULT 300,
  timeout_segundos integer NOT NULL DEFAULT 15,
  falhas_para_alerta integer NOT NULL DEFAULT 2,
  ativo boolean NOT NULL DEFAULT true,
  status public.monitor_status NOT NULL DEFAULT 'pendente',
  ultima_verificacao timestamptz,
  ultima_latencia_ms integer,
  ultima_mensagem text,
  falhas_consecutivas integer NOT NULL DEFAULT 0,
  sucessos_consecutivos integer NOT NULL DEFAULT 0,
  heartbeat_token text UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  notificar_email boolean NOT NULL DEFAULT true,
  email_destinatario text,
  webhook_url text,
  publico boolean NOT NULL DEFAULT false,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.monitor_checks (
  id bigserial PRIMARY KEY,
  monitor_id uuid NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ok boolean NOT NULL,
  latencia_ms integer,
  status_code integer,
  mensagem text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_monitor_checks_monitor ON public.monitor_checks (monitor_id, criado_em DESC);

CREATE TABLE public.monitor_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,
  duracao_segundos integer,
  causa text
);
CREATE INDEX idx_monitor_incidents_monitor ON public.monitor_incidents (monitor_id, iniciado_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitors TO authenticated;
GRANT SELECT ON public.monitors TO anon;
GRANT ALL ON public.monitors TO service_role;
GRANT SELECT ON public.monitor_checks TO authenticated, anon;
GRANT ALL ON public.monitor_checks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.monitor_checks_id_seq TO service_role;
GRANT SELECT ON public.monitor_incidents TO authenticated, anon;
GRANT ALL ON public.monitor_incidents TO service_role;

ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitores visiveis para membros" ON public.monitors
FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));

CREATE POLICY "monitores publicos" ON public.monitors
FOR SELECT TO anon USING (publico = true);

CREATE POLICY "gerenciar monitores" ON public.monitors
FOR INSERT TO authenticated
WITH CHECK (public.workspace_role(auth.uid(), workspace_id) IN ('master','admin','tecnico'));

CREATE POLICY "editar monitores" ON public.monitors
FOR UPDATE TO authenticated
USING (public.workspace_role(auth.uid(), workspace_id) IN ('master','admin','tecnico'))
WITH CHECK (public.workspace_role(auth.uid(), workspace_id) IN ('master','admin','tecnico'));

CREATE POLICY "remover monitores" ON public.monitors
FOR DELETE TO authenticated
USING (public.workspace_role(auth.uid(), workspace_id) IN ('master','admin'));

CREATE POLICY "checks visiveis para membros" ON public.monitor_checks
FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));

CREATE POLICY "checks publicos" ON public.monitor_checks
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.monitors m WHERE m.id = monitor_id AND m.publico));

CREATE POLICY "incidentes visiveis para membros" ON public.monitor_incidents
FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));

CREATE POLICY "incidentes publicos" ON public.monitor_incidents
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.monitors m WHERE m.id = monitor_id AND m.publico));