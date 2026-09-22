import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { clienteAutenticado, textoJson } from "../helpers";

export default defineTool({
  name: "listar_empresas",
  title: "Listar empresas",
  description: "Lista as empresas (workspaces) ativas às quais o usuário autenticado tem acesso no TIControl.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const supabase = clienteAutenticado(ctx);
    const { data, error } = await supabase
      .from("workspaces")
      .select("id, nome, slug, segmento, ativo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw new ToolError(error.message);
    const empresas = (data ?? []).map((e) => ({
      id: e.id,
      nome: e.nome,
      slug: e.slug,
      segmento: e.segmento,
    }));
    return {
      content: [{ type: "text", text: textoJson(empresas) }],
      structuredContent: { empresas },
    };
  },
});
