-- Políticas de acesso ao bucket privado "anexos": pasta raiz = workspace_id
CREATE POLICY "anexos: ler do meu workspace"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.is_master(auth.uid())
    OR ((storage.foldername(name))[1])::uuid IN (SELECT public.my_workspace_ids(auth.uid()))
  )
);

CREATE POLICY "anexos: enviar no meu workspace"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND (
    public.is_master(auth.uid())
    OR public.workspace_role(auth.uid(), ((storage.foldername(name))[1])::uuid) IN ('admin','tecnico')
  )
);

CREATE POLICY "anexos: atualizar no meu workspace"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.is_master(auth.uid())
    OR public.workspace_role(auth.uid(), ((storage.foldername(name))[1])::uuid) IN ('admin','tecnico')
  )
);

CREATE POLICY "anexos: excluir no meu workspace"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.is_master(auth.uid())
    OR public.workspace_role(auth.uid(), ((storage.foldername(name))[1])::uuid) IN ('admin','tecnico')
  )
);
