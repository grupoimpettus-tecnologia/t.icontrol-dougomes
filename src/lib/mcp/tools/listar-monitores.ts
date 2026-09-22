import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolverEmpresa, textoJson } from "../helpers";

export default defineTool({
  name: "listar_monitores",
  title: "Listar monitores",
  description:
    "Lista os monitores de disponibilidade de uma empresa, com status atual, última verificação e latência.",
  inputSchema: {
    empresa: z.string().optional().describe("Nome, slug ou id da empresa. Opcional se houver apenas uma."),
    status: z.enum(["ativo", "fora", "pausado", "pendente"]).optional().describe("Filtra por status atual."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ empresa, status }, ctx) => {
    const { supabase, empresa: ws } = await resolverEmpresa(ctx, empresa);
    let query = supabase
      .from("monitors")
      .select(
        "id, nome, tipo, status, ativo, url, hostname, porta, intervalo_segundos, ultima_verificacao, ultima_latencia_ms, ultima_mensagem",
      )
      .eq("workspace_id", ws.id)
      .order("nome");
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const monitores = (data ?? []).map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: String(m.tipo),
      status: String(m.status),
      ativo: m.ativo,
      alvo: m.url ?? [m.hostname, m.porta].filter(Boolean).join(":") ?? null,
      intervalo_segundos: m.intervalo_segundos,
      ultima_verificacao: m.ultima_verificacao,
      latencia_ms: m.ultima_latencia_ms,
      mensagem: m.ultima_mensagem,
    }));
    return {
      content: [{ type: "text", text: textoJson({ empresa: ws.nome, monitores }) }],
      structuredContent: { empresa: ws.nome, monitores },
    };
  },
});
