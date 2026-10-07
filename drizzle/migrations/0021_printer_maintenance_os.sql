-- Campos da OS na baixa de manutenção (após 0020_printer_maintenances).
ALTER TABLE public.printer_maintenances
  ADD COLUMN IF NOT EXISTS os_numero text,
  ADD COLUMN IF NOT EXISTS os_foto_path text;

DO $$
DECLARE
  nome_check text;
BEGIN
  SELECT con.conname INTO nome_check
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'printer_maintenances'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%agendada%';

  IF nome_check IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.printer_maintenances DROP CONSTRAINT %I', nome_check);
  END IF;
END $$;

ALTER TABLE public.printer_maintenances
  ADD CONSTRAINT printer_maintenances_status_dados_check CHECK (
    (
      status = 'agendada'
      AND tecnico_nome IS NULL
      AND responsavel_nome IS NULL
      AND resolvido_em IS NULL
      AND resolucao IS NULL
      AND os_numero IS NULL
      AND os_foto_path IS NULL
    )
    OR
    (
      status = 'concluida'
      AND tecnico_nome IS NOT NULL
      AND responsavel_nome IS NOT NULL
      AND resolvido_em IS NOT NULL
      AND resolucao IS NOT NULL
    )
  );

-- Master também precisa enviar anexos (foto da OS).
DROP POLICY IF EXISTS "anexos: enviar no meu workspace" ON storage.objects;
CREATE POLICY "anexos: enviar no meu workspace"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND (
    public.is_master(auth.uid())
    OR public.workspace_role(auth.uid(), ((storage.foldername(name))[1])::uuid) IN ('master','admin','tecnico')
  )
);

DROP POLICY IF EXISTS "anexos: atualizar no meu workspace" ON storage.objects;
CREATE POLICY "anexos: atualizar no meu workspace"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.is_master(auth.uid())
    OR public.workspace_role(auth.uid(), ((storage.foldername(name))[1])::uuid) IN ('master','admin','tecnico')
  )
);

DROP POLICY IF EXISTS "anexos: excluir no meu workspace" ON storage.objects;
CREATE POLICY "anexos: excluir no meu workspace"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.is_master(auth.uid())
    OR public.workspace_role(auth.uid(), ((storage.foldername(name))[1])::uuid) IN ('master','admin','tecnico')
  )
);

NOTIFY pgrst, 'reload schema';
