import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolverEmpresa, textoJson } from "../helpers";

export default defineTool({
  name: "listar_acessos",
  title: "Listar mapa de acessos",
  description:
    "Lista os acessos cadastrados no mapa de acessos de uma empresa (nome, tipo, ambiente, URL e usuário). Nunca retorna senhas.",
  inputSchema: {
    empresa: z.string().optional().describe("Nome, slug ou id da empresa."),
    busca: z.string().optional().describe("Texto para filtrar por nome, tipo, grupo ou URL."),
    limite: z.number().int().min(1).max(200).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ empresa, busca, limite }, ctx) => {
    const { supabase, empresa: ws } = await resolverEmpresa(ctx, empresa);
    let query = supabase
      .from("access_entries")
      .select("id, nome, tipo, ambiente, grupo, url, usuario, custo_mensal")
      .eq("workspace_id", ws.id)
      .order("nome")
      .limit(limite ?? 50);
    if (busca) {
      const t = `%${busca}%`;
      query = query.or(`nome.ilike.${t},tipo.ilike.${t},grupo.ilike.${t},url.ilike.${t}`);
    }
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const acessos = (data ?? []).map((a) => ({ ...a }));
    return {
      content: [{ type: "text", text: textoJson({ empresa: ws.nome, acessos }) }],
      structuredContent: { empresa: ws.nome, acessos },
    };
  },
});
