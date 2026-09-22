import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolverEmpresa, textoJson } from "../helpers";

export default defineTool({
  name: "listar_linhas",
  title: "Listar linhas e celulares",
  description: "Lista linhas telefônicas e celulares de uma empresa, com responsável, operadora, plano e valor.",
  inputSchema: {
    empresa: z.string().optional().describe("Nome, slug ou id da empresa."),
    busca: z.string().optional().describe("Texto para filtrar por responsável, linha, operadora ou setor."),
    limite: z.number().int().min(1).max(200).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ empresa, busca, limite }, ctx) => {
    const { supabase, empresa: ws } = await resolverEmpresa(ctx, empresa);
    let query = supabase
      .from("phone_lines")
      .select("id, responsavel, linha, operadora, plano, valor, setor, status, marca, modelo, tipo_linha, tem_aparelho")
      .eq("workspace_id", ws.id)
      .order("responsavel")
      .limit(limite ?? 50);
    if (busca) {
      const t = `%${busca}%`;
      query = query.or(`responsavel.ilike.${t},linha.ilike.${t},operadora.ilike.${t},setor.ilike.${t}`);
    }
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const linhas = (data ?? []).map((l) => ({ ...l }));
    return {
      content: [{ type: "text", text: textoJson({ empresa: ws.nome, linhas }) }],
      structuredContent: { empresa: ws.nome, linhas },
    };
  },
});
