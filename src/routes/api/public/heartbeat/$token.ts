import { createFileRoute } from "@tanstack/react-router";

async function fecharIncidentesAbertos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  monitorId: string,
  agoraIso: string,
) {
  const { data: abertos } = await supabaseAdmin
    .from("monitor_incidents")
    .select("id, iniciado_em")
    .eq("monitor_id", monitorId)
    .is("resolvido_em", null);
  for (const aberto of abertos ?? []) {
    const duracao = Math.round((Date.now() - new Date(aberto.iniciado_em).getTime()) / 1000);
    await supabaseAdmin
      .from("monitor_incidents")
      .update({ resolvido_em: agoraIso, duracao_segundos: duracao })
      .eq("id", aberto.id);
  }
}

async function bater(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: monitor } = await supabaseAdmin
    .from("monitors")
    .select("*")
    .eq("heartbeat_token", token)
    .eq("tipo", "heartbeat")
    .maybeSingle();

  if (!monitor) return new Response("Monitor não encontrado", { status: 404 });

  const agora = new Date().toISOString();
  const estavaFora = monitor.status === "fora";

  await supabaseAdmin.from("monitor_checks").insert({
    monitor_id: monitor.id,
    workspace_id: monitor.workspace_id,
    ok: true,
    mensagem: "Sinal recebido",
  });

  // Fecha todos os incidentes abertos (evita ficar "Em aberto" após recuperação).
  await fecharIncidentesAbertos(supabaseAdmin, monitor.id, agora);

  await supabaseAdmin
    .from("monitors")
    .update({
      status: "ativo",
      ultima_verificacao: agora,
      ultima_mensagem: "Sinal recebido",
      falhas_consecutivas: 0,
      sucessos_consecutivos: monitor.sucessos_consecutivos + 1,
      updated_at: agora,
    })
    .eq("id", monitor.id);

  if (estavaFora) {
    try {
      const { enviarAlertasMonitor } = await import("@/lib/notifications.server");
      await enviarAlertasMonitor(
        monitor,
        { mensagem: "Sinal recebido", latencia_ms: null },
        "recuperado",
      );
    } catch {
      // alerta opcional
    }
  }

  return Response.json({ ok: true });
}

export const Route = createFileRoute("/api/public/heartbeat/$token")({
  server: {
    handlers: {
      GET: ({ params }) => bater(params.token),
      POST: ({ params }) => bater(params.token),
    },
  },
});
