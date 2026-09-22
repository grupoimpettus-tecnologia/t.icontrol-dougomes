import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolverEmpresa, textoJson } from "../helpers";

export default defineTool({
  name: "listar_equipamentos",
  title: "Listar equipamentos",
  description: "Lista os equipamentos de T.I de uma empresa (patrimônio, responsável, setor, status).",
  inputSchema: {
    empresa: z.string().optional().describe("Nome, slug ou id da empresa."),
    busca: z.string().optional().describe("Texto para filtrar por patrimônio, responsável, modelo ou setor."),
    limite: z.number().int().min(1).max(200).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ empresa, busca, limite }, ctx) => {
    const { supabase, empresa: ws } = await resolverEmpresa(ctx, empresa);
    let query = supabase
      .from("equipments")
      .select("id, patrimonio, responsavel, setor, tipo, marca, modelo, numero_serie, ip, local, status, condicao")
      .eq("workspace_id", ws.id)
      .order("patrimonio")
      .limit(limite ?? 50);
    if (busca) {
      const t = `%${busca}%`;
      query = query.or(
        `patrimonio.ilike.${t},responsavel.ilike.${t},modelo.ilike.${t},setor.ilike.${t},marca.ilike.${t}`,
      );
    }
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const equipamentos = (data ?? []).map((e) => ({ ...e }));
    return {
      content: [{ type: "text", text: textoJson({ empresa: ws.nome, equipamentos }) }],
      structuredContent: { empresa: ws.nome, equipamentos },
    };
  },
});
