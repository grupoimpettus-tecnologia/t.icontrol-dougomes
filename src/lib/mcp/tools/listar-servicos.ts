import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolverEmpresa, textoJson } from "../helpers";

export default defineTool({
  name: "listar_servicos",
  title: "Listar serviços e ativos",
  description: "Lista serviços e ativos contratados de uma empresa, com fornecedor, custo e data de renovação.",
  inputSchema: {
    empresa: z.string().optional().describe("Nome, slug ou id da empresa."),
    busca: z.string().optional().describe("Texto para filtrar por nome, fornecedor ou grupo."),
    limite: z.number().int().min(1).max(200).optional().describe("Máximo de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ empresa, busca, limite }, ctx) => {
    const { supabase, empresa: ws } = await resolverEmpresa(ctx, empresa);
    let query = supabase
      .from("service_assets")
      .select("id, nome, fornecedor, grupo, tipo_contrato, custo, renovacao_em, status")
      .eq("workspace_id", ws.id)
      .order("nome")
      .limit(limite ?? 50);
    if (busca) {
      const t = `%${busca}%`;
      query = query.or(`nome.ilike.${t},fornecedor.ilike.${t},grupo.ilike.${t}`);
    }
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const servicos = (data ?? []).map((s) => ({ ...s }));
    return {
      content: [{ type: "text", text: textoJson({ empresa: ws.nome, servicos }) }],
      structuredContent: { empresa: ws.nome, servicos },
    };
  },
});
