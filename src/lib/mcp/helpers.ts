import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

export function clienteAutenticado(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) throw new ToolError("É necessário estar autenticado.");
  return supabaseForUser(ctx);
}

/**
 * Resolve a empresa (workspace) alvo. Aceita id ou parte do nome.
 * Sem argumento, usa a única empresa acessível ao usuário.
 */
export async function resolverEmpresa(ctx: ToolContext, empresa?: string) {
  const supabase = clienteAutenticado(ctx);
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, nome, slug, ativo")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new ToolError(error.message);
  const empresas = data ?? [];
  if (empresas.length === 0) throw new ToolError("Nenhuma empresa ativa disponível para este usuário.");

  if (!empresa) {
    if (empresas.length > 1) {
      throw new ToolError(
        `Informe a empresa. Disponíveis: ${empresas.map((e) => e.nome).join(", ")}.`,
      );
    }
    return { supabase, empresa: empresas[0]! };
  }

  const alvo = empresa.trim().toLowerCase();
  const achado =
    empresas.find((e) => e.id === empresa) ??
    empresas.find((e) => e.slug?.toLowerCase() === alvo) ??
    empresas.find((e) => e.nome.toLowerCase() === alvo) ??
    empresas.find((e) => e.nome.toLowerCase().includes(alvo));
  if (!achado) {
    throw new ToolError(
      `Empresa "${empresa}" não encontrada. Disponíveis: ${empresas.map((e) => e.nome).join(", ")}.`,
    );
  }
  return { supabase, empresa: achado };
}

export function textoJson(valor: unknown) {
  return JSON.stringify(valor, null, 2);
}
