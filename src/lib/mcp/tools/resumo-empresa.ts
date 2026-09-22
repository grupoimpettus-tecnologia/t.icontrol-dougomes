import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolverEmpresa, textoJson } from "../helpers";

export default defineTool({
  name: "resumo_empresa",
  title: "Resumo da empresa",
  description:
    "Resumo da infraestrutura de uma empresa: totais de equipamentos, acessos, serviços, linhas e monitores fora do ar.",
  inputSchema: {
    empresa: z.string().optional().describe("Nome, slug ou id da empresa."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ empresa }, ctx) => {
    const { supabase, empresa: ws } = await resolverEmpresa(ctx, empresa);
    const contar = async (tabela: "equipments" | "access_entries" | "service_assets" | "phone_lines") => {
      const { count } = await supabase
        .from(tabela)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws.id);
      return count ?? 0;
    };

    const [equipamentos, acessos, servicos, linhas] = await Promise.all([
      contar("equipments"),
      contar("access_entries"),
      contar("service_assets"),
      contar("phone_lines"),
    ]);

    const { data: monitores } = await supabase
      .from("monitors")
      .select("nome, status, ativo")
      .eq("workspace_id", ws.id);

    const ativos = (monitores ?? []).filter((m) => m.ativo);
    const fora = ativos.filter((m) => String(m.status) === "fora").map((m) => m.nome);

    const resumo = {
      empresa: ws.nome,
      equipamentos,
      acessos,
      servicos,
      linhas,
      monitores_ativos: ativos.length,
      monitores_fora_do_ar: fora,
    };

    return {
      content: [{ type: "text", text: textoJson(resumo) }],
      structuredContent: { resumo },
    };
  },
});
