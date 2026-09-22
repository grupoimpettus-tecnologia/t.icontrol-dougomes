import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function tokenAleatorio() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "tic_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Gera (ou renova) o token do agente de um equipamento. Token exibido apenas uma vez. */
export const gerarTokenAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ equipmentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: equipamento, error } = await context.supabase
      .from("equipments")
      .select("id, workspace_id, patrimonio")
      .eq("id", data.equipmentId)
      .maybeSingle();
    if (error) throw error;
    if (!equipamento) throw new Error("Equipamento não encontrado");

    const { data: podeGerenciar } = await context.supabase.rpc("can_manage_workspace", {
      _user_id: context.userId,
      _workspace_id: equipamento.workspace_id,
    });
    const { data: papel } = await context.supabase.rpc("workspace_role", {
      _user_id: context.userId,
      _workspace_id: equipamento.workspace_id,
    });
    if (!podeGerenciar && papel !== "tecnico") throw new Error("Sem permissão para gerar token");

    const token = tokenAleatorio();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: erroUpdate } = await supabaseAdmin
      .from("equipments")
      .update({
        agent_token_hash: await hashToken(token),
        agent_status: "offline",
        ultimo_heartbeat: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", equipamento.id);
    if (erroUpdate) throw erroUpdate;

    await supabaseAdmin.from("audit_logs").insert({
      workspace_id: equipamento.workspace_id,
      user_id: context.userId,
      acao: "token_agente_gerado",
      modulo: "Equipamentos",
      entidade: "equipments",
      entidade_id: equipamento.id,
      item_nome: equipamento.patrimonio,
      metadata: {},
    });

    return { token, patrimonio: equipamento.patrimonio };
  });

/** Liga ou desliga o modo de manutenção de um equipamento. */
export const definirManutencao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ equipmentId: z.string().uuid(), manutencao: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("equipments")
      .update({
        manutencao: data.manutencao,
        agent_status: data.manutencao ? "manutencao" : "offline",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.equipmentId);
    if (error) throw error;
    return { ok: true };
  });
