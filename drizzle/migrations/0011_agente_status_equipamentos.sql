ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS hostname text,
  ADD COLUMN IF NOT EXISTS sistema_operacional text,
  ADD COLUMN IF NOT EXISTS cpu text,
  ADD COLUMN IF NOT EXISTS memoria text,
  ADD COLUMN IF NOT EXISTS disco text,
  ADD COLUMN IF NOT EXISTS mac text,
  ADD COLUMN IF NOT EXISTS agent_token_hash text,
  ADD COLUMN IF NOT EXISTS agent_status text NOT NULL DEFAULT 'sem_agente',
  ADD COLUMN IF NOT EXISTS ultimo_heartbeat timestamptz,
  ADD COLUMN IF NOT EXISTS manutencao boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS equipments_agent_token_hash_key
  ON public.equipments (agent_token_hash) WHERE agent_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.equipment_heartbeats (
  id bigserial PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  metricas jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS equipment_heartbeats_equipment_idx
  ON public.equipment_heartbeats (equipment_id, recebido_em DESC);
CREATE INDEX IF NOT EXISTS equipment_heartbeats_workspace_idx
  ON public.equipment_heartbeats (workspace_id, recebido_em DESC);

GRANT SELECT ON public.equipment_heartbeats TO authenticated;
GRANT ALL ON public.equipment_heartbeats TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.equipment_heartbeats_id_seq TO service_role;

ALTER TABLE public.equipment_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membros leem heartbeats" ON public.equipment_heartbeats;
CREATE POLICY "membros leem heartbeats"
ON public.equipment_heartbeats
FOR SELECT
TO authenticated
USING (
  public.is_master(auth.uid())
  OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid()))
);