import { createFileRoute } from "@tanstack/react-router";
import { executarCheck, registrarResultado, type Monitor } from "@/lib/monitor-runner.server";

async function executar(request: Request) {
  const aceitos = [
    process.env["MONITOR_CRON_SECRET"],
    process.env["LOVABLE_CRON_SECRET"],
  ].filter(Boolean) as string[];
  const enviado =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  if (!aceitos.length || !aceitos.includes(enviado)) {
    return new Response("Não autorizado", { status: 401 });
  }


  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: monitores, error } = await supabaseAdmin
    .from("monitors")
    .select("*")
    .eq("ativo", true)
    .neq("status", "pausado");

  if (error) return new Response(error.message, { status: 500 });

  const agora = Date.now();
  const devidos = (monitores ?? []).filter((m) => {
    if (!m.ultima_verificacao) return true;
    const proximo =
      new Date(m.ultima_verificacao).getTime() + (m.intervalo_segundos || 300) * 1000;
    return agora >= proximo;
  }) as Monitor[];

  const resultados = await Promise.all(
    devidos.map(async (monitor) => {
      const resultado = await executarCheck(monitor);
      const info = await registrarResultado(monitor, resultado);
      return { monitor: monitor.nome, ok: resultado.ok, status: info.status };
    }),
  );

  // Equipamentos sem sinal do agente há mais de 3 minutos passam a offline.
  const limite = new Date(agora - 3 * 60 * 1000).toISOString();
  const { data: expirados } = await supabaseAdmin
    .from("equipments")
    .update({ agent_status: "offline" })
    .not("agent_token_hash", "is", null)
    .eq("manutencao", false)
    .eq("agent_status", "online")
    .lt("ultimo_heartbeat", limite)
    .select("id");

  return Response.json({
    verificados: resultados.length,
    resultados,
    equipamentos_offline: expirados?.length ?? 0,
  });
}

export const Route = createFileRoute("/api/public/cron/run-checks")({
  server: {
    handlers: {
      GET: ({ request }) => executar(request),
      POST: ({ request }) => executar(request),
    },
  },
});
