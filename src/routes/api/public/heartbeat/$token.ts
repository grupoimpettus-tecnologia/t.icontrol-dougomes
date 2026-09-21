import { createFileRoute } from "@tanstack/react-router";

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

  await supabaseAdmin.from("monitor_checks").insert({
    monitor_id: monitor.id,
    workspace_id: monitor.workspace_id,
    ok: true,
    mensagem: "Sinal recebido",
  });

  if (monitor.status === "fora") {
    const { data: aberto } = await supabaseAdmin
      .from("monitor_incidents")
      .select("id, iniciado_em")
      .eq("monitor_id", monitor.id)
      .is("resolvido_em", null)
      .order("iniciado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aberto) {
      await supabaseAdmin
        .from("monitor_incidents")
        .update({
          resolvido_em: agora,
          duracao_segundos: Math.round(
            (Date.now() - new Date(aberto.iniciado_em).getTime()) / 1000,
          ),
        })
        .eq("id", aberto.id);
    }
  }

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
