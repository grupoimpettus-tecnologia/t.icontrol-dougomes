import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Executa a verificação de um monitor sob demanda, respeitando o acesso do usuário. */
export const verificarAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ monitorId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: permitido, error } = await context.supabase
      .from("monitors")
      .select("id")
      .eq("id", data.monitorId)
      .maybeSingle();
    if (error) throw error;
    if (!permitido) throw new Error("Monitor não encontrado");

    const { executarCheck, registrarResultado } = await import("@/lib/monitor-runner.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: monitor } = await supabaseAdmin
      .from("monitors")
      .select("*")
      .eq("id", data.monitorId)
      .single();

    const resultado = await executarCheck(monitor!);
    const info = await registrarResultado(monitor!, resultado);
    return { ...resultado, status: info.status };
  });

/**
 * Simula alerta de monitor caído: dispara o mesmo fluxo de e-mail/push
 * sem alterar o status real do monitor nem abrir incidente.
 */
export const simularQuedaMonitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ monitorId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: monitorAcesso, error } = await context.supabase
      .from("monitors")
      .select("id, workspace_id")
      .eq("id", data.monitorId)
      .maybeSingle();
    if (error) throw error;
    if (!monitorAcesso) throw new Error("Monitor não encontrado");

    const { data: podeGerenciar } = await context.supabase.rpc("can_manage_workspace", {
      _user_id: context.userId,
      _workspace_id: monitorAcesso.workspace_id,
    });
    const { data: papel } = await context.supabase.rpc("workspace_role", {
      _user_id: context.userId,
      _workspace_id: monitorAcesso.workspace_id,
    });
    if (!podeGerenciar && papel !== "tecnico") {
      throw new Error("Sem permissão para simular alerta");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: monitor, error: erroMonitor } = await supabaseAdmin
      .from("monitors")
      .select("*")
      .eq("id", data.monitorId)
      .single();
    if (erroMonitor) throw erroMonitor;
    if (!monitor) throw new Error("Monitor não encontrado");

    const { data: destinos } = await supabaseAdmin
      .from("monitor_notification_recipients")
      .select("canal, email, profile_id")
      .eq("monitor_id", monitor.id);

    const emails = (destinos ?? [])
      .filter((item) => item.canal === "email" && item.email)
      .map((item) => item.email as string);
    if (!emails.length) {
      throw new Error("Configure ao menos um e-mail em Alertas antes de simular.");
    }

    const smtpOk = Boolean(
      process.env["DEFAULT_SMTP_HOST"] &&
        process.env["DEFAULT_SMTP_USER"] &&
        process.env["DEFAULT_SMTP_PASSWORD"] &&
        process.env["DEFAULT_SMTP_FROM"],
    );
    if (!smtpOk) {
      throw new Error(
        "SMTP não configurado no servidor (DEFAULT_SMTP_HOST/USER/PASSWORD/FROM).",
      );
    }

    const { enviarAlertasMonitor } = await import("@/lib/notifications.server");
    await enviarAlertasMonitor(
      monitor,
      {
        mensagem: "TESTE de simulação: monitor tratado como fora do ar.",
        latencia_ms: null,
      },
      "indisponivel",
    );

    const { data: logs } = await supabaseAdmin
      .from("notification_logs")
      .select("destinatario, enviado, mensagem, created_at")
      .eq("monitor_id", monitor.id)
      .eq("evento", "indisponivel")
      .eq("canal", "email")
      .order("created_at", { ascending: false })
      .limit(emails.length);

    return {
      ok: true,
      monitor: monitor.nome,
      destinatarios: emails,
      logs: logs ?? [],
    };
  });
