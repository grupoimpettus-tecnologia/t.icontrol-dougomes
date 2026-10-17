ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS status text;

UPDATE public.demandas
SET status = CASE
  WHEN data_entrega < CURRENT_DATE THEN 'concluida'
  WHEN data_inicio > CURRENT_DATE THEN 'a_fazer'
  ELSE 'em_andamento'
END
WHERE status IS NULL;

ALTER TABLE public.demandas ALTER COLUMN status SET DEFAULT 'a_fazer';

DO $$ BEGIN
  ALTER TABLE public.demandas ADD CONSTRAINT demandas_status_check
    CHECK (status IS NULL OR status IN ('a_fazer', 'em_andamento', 'concluida'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.demanda_atualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id),
  texto_html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demanda_atualizacoes_demanda_idx ON public.demanda_atualizacoes (demanda_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demanda_atualizacoes TO authenticated;
GRANT ALL ON public.demanda_atualizacoes TO service_role;

ALTER TABLE public.demanda_atualizacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demanda_atualizacoes visiveis" ON public.demanda_atualizacoes;
DROP POLICY IF EXISTS "demanda_atualizacoes insert" ON public.demanda_atualizacoes;

CREATE POLICY "demanda_atualizacoes visiveis" ON public.demanda_atualizacoes FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));
CREATE POLICY "demanda_atualizacoes insert" ON public.demanda_atualizacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_master(auth.uid()) OR workspace_id IN (SELECT public.my_workspace_ids(auth.uid())));

DROP TRIGGER IF EXISTS audit_demanda_atualizacoes ON public.demanda_atualizacoes;

CREATE TRIGGER audit_demanda_atualizacoes
AFTER INSERT OR UPDATE OR DELETE ON public.demanda_atualizacoes
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

NOTIFY pgrst, 'reload schema';
