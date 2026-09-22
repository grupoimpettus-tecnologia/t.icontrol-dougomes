import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const esquema = z.object({
  hostname: z.string().max(200).nullish(),
  sistema_operacional: z.string().max(200).nullish(),
  cpu: z.string().max(200).nullish(),
  memoria: z.string().max(100).nullish(),
  disco: z.string().max(100).nullish(),
  ip: z.string().max(100).nullish(),
  mac: z.string().max(100).nullish(),
  metricas: z.record(z.string(), z.unknown()).optional(),
});

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function receber(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return new Response("Token ausente", { status: 401 });

  let corpo: z.infer<typeof esquema>;
  try {
    corpo = esquema.parse(await request.json());
  } catch {
    return new Response("Payload inválido", { status: 400 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await hashToken(token);

  const { data: equipamento } = await supabaseAdmin
    .from("equipments")
    .select("id, workspace_id, manutencao")
    .eq("agent_token_hash", hash)
    .maybeSingle();

  if (!equipamento) return new Response("Token inválido", { status: 401 });

  const agora = new Date().toISOString();

  await supabaseAdmin.from("equipment_heartbeats").insert({
    equipment_id: equipamento.id,
    workspace_id: equipamento.workspace_id,
    recebido_em: agora,
    metricas: (corpo.metricas ?? {}) as Record<string, unknown>,
  });

  const atualizacao: Record<string, unknown> = {
    ultimo_heartbeat: agora,
    agent_status: equipamento.manutencao ? "manutencao" : "online",
    updated_at: agora,
  };
  for (const campo of [
    "hostname",
    "sistema_operacional",
    "cpu",
    "memoria",
    "disco",
    "ip",
    "mac",
  ] as const) {
    const valor = corpo[campo];
    if (valor) atualizacao[campo] = valor;
  }

  await supabaseAdmin.from("equipments").update(atualizacao).eq("id", equipamento.id);

  return Response.json({ ok: true, recebido_em: agora });
}

export const Route = createFileRoute("/api/public/agent/heartbeat")({
  server: {
    handlers: {
      POST: ({ request }) => receber(request),
    },
  },
});
