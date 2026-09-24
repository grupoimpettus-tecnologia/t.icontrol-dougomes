-- Garante o e-mail padrão de alerta em monitores sem destinatário de e-mail.
INSERT INTO public.monitor_notification_recipients (monitor_id, workspace_id, canal, email)
SELECT m.id, m.workspace_id, 'email', 'ti@grupoimpettus.com.br'
FROM public.monitors m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.monitor_notification_recipients r
  WHERE r.monitor_id = m.id
    AND r.canal = 'email'
);
