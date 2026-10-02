import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FORMATO = "ticontrol-backup";
const VERSAO = 1;

/** Tabelas da empresa. Contas (profiles), senhas e push ficam de fora. */
const TABELAS = [
  "workspaces",
  "user_workspaces",
  "invites",
  "access_entries",
  "service_assets",
  "equipments",
  "equipment_heartbeats",
  "phone_lines",
  "phone_stock",
  "team_members",
  "org_versions",
  "monitors",
  "monitor_checks",
  "monitor_incidents",
  "monitor_notification_recipients",
  "notification_logs",
  "pdv_lojas",
  "pdv_loja_etapas",
  "audit_logs",
] as const;

type Tabela = (typeof TABELAS)[number];
interface Linha {
  id?: string;
  workspace_id?: string | null;
  nome?: string;
  segmento?: string | null;
  logo_url?: string | null;
  ativo?: boolean;
  gestor_id?: string | null;
  loja_id?: string;
  monitor_id?: string | null;
  equipment_id?: string;
  profile_id?: string | null;
  workspace_ids?: string[];
  __pular?: boolean;
  [extra: string]: unknown;
}
type JsonSerial =
  | string
  | number
  | boolean
  | null
  | JsonSerial[]
  | { [chave: string]: JsonSerial };

const SERIAIS = new Set<Tabela>(["equipment_heartbeats", "monitor_checks"]);

const PAIS: Tabela[] = [
  "access_entries",
  "service_assets",
  "equipments",
  "phone_lines",
  "phone_stock",
  "org_versions",
  "monitors",
  "pdv_lojas",
];

const FILHOS_UUID: Tabela[] = [
  "pdv_loja_etapas",
  "monitor_incidents",
  "monitor_notification_recipients",
  "notification_logs",
];

/** Filhos antes dos pais, para a exclusão do que saiu do backup. */
const EXCLUIR_EXTRAS: Tabela[] = [
  "monitor_notification_recipients",
  "monitor_incidents",
  "notification_logs",
  "pdv_loja_etapas",
  "monitors",
  "equipments",
  "pdv_lojas",
  "team_members",
  "access_entries",
  "phone_lines",
  "phone_stock",
  "service_assets",
  "org_versions",
];

const CAMPOS_PERFIL: Partial<Record<Tabela, string[]>> = {
  access_entries: ["criado_por"],
  audit_logs: ["user_id"],
  equipments: ["criado_por"],
  invites: ["criado_por"],
  monitors: ["criado_por"],
  monitor_notification_recipients: ["profile_id"],
  pdv_lojas: ["criado_por"],
  pdv_loja_etapas: ["concluida_por"],
  phone_lines: ["criado_por"],
  phone_stock: ["criado_por"],
  service_assets: ["criado_por"],
};

const backupSchema = z.object({
  formato: z.literal(FORMATO),
  versao: z.literal(VERSAO),
  gerado_em: z.string(),
  workspace: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    slug: z.string(),
  }),
  tabelas: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

function lotes<T>(itens: T[], tamanho: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) grupos.push(itens.slice(i, i + tamanho));
  return grupos;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

async function exigirGestor(dbUsuario: Db, userId: string, workspaceId: string) {
  const { data: gestor, error } = await dbUsuario.rpc("can_manage_workspace", {
    _user_id: userId,
    _workspace_id: workspaceId,
  });
  if (error) throw error;
  if (!gestor) throw new Error("Sem permissão para backup desta empresa");

  const { data: empresa, error: erroEmpresa } = await dbUsuario
    .from("workspaces")
    .select("id, nome, slug")
    .eq("id", workspaceId)
    .maybeSingle();
  if (erroEmpresa) throw erroEmpresa;
  if (!empresa) throw new Error("Empresa não encontrada");
  return empresa as { id: string; nome: string; slug: string };
}

async function lerConvites(db: Db, workspaceId: string): Promise<Linha[]> {
  const linhas: Linha[] = [];
  const pagina = 1000;
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await db
      .from("invites")
      .select("*")
      .contains("workspace_ids", [workspaceId])
      .order("id", { ascending: true })
      .range(inicio, inicio + pagina - 1);
    if (error) throw new Error(`invites: ${error.message}`);
    linhas.push(...((data ?? []) as Linha[]));
    if (!data || data.length < pagina) break;
  }
  return linhas;
}

async function lerTudo(db: Db, tabela: string, coluna: string, valor: string): Promise<Linha[]> {
  const linhas: Linha[] = [];
  const pagina = 1000;
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await db
      .from(tabela)
      .select("*")
      .eq(coluna, valor)
      .order("id", { ascending: true })
      .range(inicio, inicio + pagina - 1);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas.push(...((data ?? []) as Linha[]));
    if (!data || data.length < pagina) break;
  }
  return linhas;
}

async function lerIds(db: Db, tabela: string, workspaceId: string): Promise<string[]> {
  const ids: string[] = [];
  const pagina = 1000;
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await db
      .from(tabela)
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("id", { ascending: true })
      .range(inicio, inicio + pagina - 1);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    ids.push(...((data ?? []) as { id: string }[]).map((item) => item.id));
    if (!data || data.length < pagina) break;
  }
  return ids;
}

async function apagarIds(db: Db, tabela: string, ids: string[], workspaceId?: string) {
  for (const lote of lotes(ids, 100)) {
    let consulta = db.from(tabela).delete().in("id", lote);
    if (workspaceId) consulta = consulta.eq("workspace_id", workspaceId);
    const { error } = await consulta;
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}

async function apagarWorkspace(db: Db, tabela: string, workspaceId: string) {
  const ids = await lerIds(db, tabela, workspaceId);
  await apagarIds(db, tabela, ids, workspaceId);
}

async function gravar(db: Db, tabela: string, linhas: Linha[]) {
  for (const lote of lotes(linhas, 200)) {
    const { error } = await db.from(tabela).upsert(lote, { onConflict: "id" });
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}

async function inserir(db: Db, tabela: string, linhas: Linha[]) {
  for (const lote of lotes(linhas, 200)) {
    const { error } = await db.from(tabela).insert(lote);
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor : "";
}

export const exportarBackupEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ workspaceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const empresa = await exigirGestor(context.supabase, context.userId, data.workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as Db;

    const tabelas: Record<string, Linha[]> = {};
    tabelas["workspaces"] = await lerTudo(db, "workspaces", "id", empresa.id);

    tabelas["invites"] = await lerConvites(db, empresa.id);

    for (const tabela of TABELAS) {
      if (tabela === "workspaces" || tabela === "invites") continue;
      tabelas[tabela] = await lerTudo(db, tabela, "workspace_id", empresa.id);
    }

    return JSON.parse(
      JSON.stringify({
        formato: FORMATO,
        versao: VERSAO,
        gerado_em: new Date().toISOString(),
        workspace: { id: empresa.id, nome: empresa.nome, slug: empresa.slug },
        tabelas,
      }),
    ) as JsonSerial;
  });

export const restaurarBackupEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        confirmacao: z.string().min(1),
        backup: backupSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const empresa = await exigirGestor(context.supabase, context.userId, data.workspaceId);
    if (data.backup.workspace.id !== empresa.id) {
      throw new Error("Este arquivo é de outra empresa. Restauração cancelada.");
    }
    if (data.confirmacao.trim() !== empresa.nome.trim()) {
      throw new Error("O nome digitado não confere com a empresa aberta.");
    }
    for (const tabela of TABELAS) {
      if (!Array.isArray(data.backup.tabelas[tabela])) {
        throw new Error(`Backup incompleto: falta a tabela ${tabela}.`);
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as Db;
    const tabelas = data.backup.tabelas;

    const perfis = new Set<string>();
    for (let inicio = 0; ; inicio += 1000) {
      const { data: pagina, error } = await db
        .from("profiles")
        .select("id")
        .order("id", { ascending: true })
        .range(inicio, inicio + 999);
      if (error) throw new Error(`profiles: ${error.message}`);
      for (const perfil of pagina ?? []) perfis.add(perfil.id as string);
      if (!pagina || pagina.length < 1000) break;
    }

    const preparado = new Map<Tabela, Linha[]>();
    for (const tabela of TABELAS) {
      const brutas = (tabelas[tabela] ?? []) as Linha[];
      const linhas: Linha[] = [];
      for (const bruta of brutas) {
        if (tabela !== "workspaces" && tabela !== "invites") {
          if (bruta.workspace_id !== empresa.id) {
            throw new Error(`Registro de ${tabela} pertence a outra empresa.`);
          }
        }
        const linha: Linha = { ...bruta };
        for (const campo of CAMPOS_PERFIL[tabela] ?? []) {
          const valor = linha[campo];
          if (typeof valor === "string" && valor && !perfis.has(valor)) {
            if (tabela === "user_workspaces" || (tabela === "monitor_notification_recipients" && campo === "profile_id")) {
              linha.__pular = true;
            } else linha[campo] = null;
          }
        }
        if (linha.__pular) continue;
        delete linha.__pular;
        if (SERIAIS.has(tabela)) delete linha.id;
        linhas.push(linha);
      }
      preparado.set(tabela, linhas);
    }

    const lojas = new Set((preparado.get("pdv_lojas") ?? []).map((item) => texto(item.id)));
    const monitores = new Set((preparado.get("monitors") ?? []).map((item) => texto(item.id)));
    const equipamentos = new Set((preparado.get("equipments") ?? []).map((item) => texto(item.id)));
    const membros = new Set((preparado.get("team_members") ?? []).map((item) => texto(item.id)));

    preparado.set(
      "pdv_loja_etapas",
      (preparado.get("pdv_loja_etapas") ?? []).filter((item) => lojas.has(texto(item.loja_id))),
    );
    preparado.set(
      "monitor_incidents",
      (preparado.get("monitor_incidents") ?? []).filter((item) => monitores.has(texto(item.monitor_id))),
    );
    preparado.set(
      "monitor_notification_recipients",
      (preparado.get("monitor_notification_recipients") ?? []).filter((item) => monitores.has(texto(item.monitor_id))),
    );
    preparado.set(
      "notification_logs",
      (preparado.get("notification_logs") ?? []).filter(
        (item) => !item.monitor_id || monitores.has(texto(item.monitor_id)),
      ),
    );
    preparado.set(
      "monitor_checks",
      (preparado.get("monitor_checks") ?? []).filter((item) => monitores.has(texto(item.monitor_id))),
    );
    preparado.set(
      "equipment_heartbeats",
      (preparado.get("equipment_heartbeats") ?? []).filter((item) => equipamentos.has(texto(item.equipment_id))),
    );
    for (const membro of preparado.get("team_members") ?? []) {
      if (membro.gestor_id && !membros.has(texto(membro.gestor_id))) membro.gestor_id = null;
    }

    const convites = (preparado.get("invites") ?? []).filter((item) => {
      const ids = Array.isArray(item.workspace_ids) ? (item.workspace_ids as string[]) : [];
      return ids.length > 0 && ids.every((id) => id === empresa.id);
    });

    await conferirDono(db, empresa.id, [
      ...PAIS,
      "team_members",
      ...FILHOS_UUID,
      "audit_logs",
      "user_workspaces",
    ], preparado);
    await conferirConvites(db, empresa.id, convites);

    const { data: vinculoAtual } = await db
      .from("user_workspaces")
      .select("*")
      .eq("workspace_id", empresa.id)
      .eq("profile_id", context.userId)
      .maybeSingle();

    const empresaBackup = (preparado.get("workspaces") ?? [])[0];
    if (!empresaBackup || empresaBackup.id !== empresa.id) {
      throw new Error("O backup não contém esta empresa.");
    }
    const { error: erroEmpresa } = await db
      .from("workspaces")
      .update({
        nome: empresaBackup.nome,
        segmento: empresaBackup.segmento ?? null,
        logo_url: empresaBackup.logo_url ?? null,
        ativo: empresaBackup.ativo ?? true,
      })
      .eq("id", empresa.id);
    if (erroEmpresa) throw new Error(`workspaces: ${erroEmpresa.message}`);

    await liberarUnicos(db, empresa.id, monitores, equipamentos, convites);

    const membrosSemGestor = (preparado.get("team_members") ?? []).map((item) => ({
      ...item,
      gestor_id: null,
    }));
    await gravar(db, "team_members", membrosSemGestor);
    for (const tabela of PAIS) await gravar(db, tabela, preparado.get(tabela) ?? []);
    for (const tabela of FILHOS_UUID) await gravar(db, tabela, preparado.get(tabela) ?? []);

    await apagarWorkspace(db, "equipment_heartbeats", empresa.id);
    await inserir(db, "equipment_heartbeats", preparado.get("equipment_heartbeats") ?? []);
    await apagarWorkspace(db, "monitor_checks", empresa.id);
    await inserir(db, "monitor_checks", preparado.get("monitor_checks") ?? []);

    await apagarWorkspace(db, "user_workspaces", empresa.id);
    await inserir(
      db,
      "user_workspaces",
      (preparado.get("user_workspaces") ?? []).filter((item) => perfis.has(texto(item.profile_id))),
    );

    if (convites.length) await gravar(db, "invites", convites);

    for (const tabela of EXCLUIR_EXTRAS) {
      if (tabela === "team_members") {
        const { error } = await db.from("team_members").update({ gestor_id: null }).eq("workspace_id", empresa.id);
        if (error) throw new Error(`team_members: ${error.message}`);
      }
      const manter = new Set((preparado.get(tabela) ?? []).map((item) => texto(item.id)).filter(Boolean));
      const atuais = await lerIds(db, tabela, empresa.id);
      await apagarIds(
        db,
        tabela,
        atuais.filter((id) => !manter.has(id)),
        empresa.id,
      );
    }

    await gravar(db, "team_members", preparado.get("team_members") ?? []);

    const aindaMembro = await db
      .from("user_workspaces")
      .select("id")
      .eq("workspace_id", empresa.id)
      .eq("profile_id", context.userId)
      .maybeSingle();
    if (!aindaMembro.data && vinculoAtual) {
      const { error } = await db.from("user_workspaces").insert(vinculoAtual);
      if (error) throw new Error(`user_workspaces: ${error.message}`);
    }

    const { data: convitesAtuais, error: erroListaConvites } = await db
      .from("invites")
      .select("id, workspace_ids")
      .contains("workspace_ids", [empresa.id]);
    if (erroListaConvites) throw new Error(`invites: ${erroListaConvites.message}`);
    const manterConvites = new Set(convites.map((item) => texto(item.id)));
    const convitesExclusivosFora = ((convitesAtuais ?? []) as { id: string; workspace_ids: string[] }[])
      .filter((item) => item.workspace_ids?.every((id) => id === empresa.id) && !manterConvites.has(item.id))
      .map((item) => item.id);
    await apagarIds(db, "invites", convitesExclusivosFora);

    await apagarWorkspace(db, "audit_logs", empresa.id);
    await inserir(db, "audit_logs", preparado.get("audit_logs") ?? []);

    const totais: Record<string, number> = {};
    for (const tabela of TABELAS) totais[tabela] = (preparado.get(tabela) ?? []).length;
    return { ok: true, totais };
  });

async function liberarUnicos(
  db: Db,
  workspaceId: string,
  monitores: Set<string>,
  equipamentos: Set<string>,
  convites: Linha[],
) {
  const monitoresFora = (await lerIds(db, "monitors", workspaceId)).filter((id) => !monitores.has(id));
  for (const lote of lotes(monitoresFora, 100)) {
    const { error } = await db
      .from("monitors")
      .update({ heartbeat_token: null })
      .in("id", lote)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(`monitors: ${error.message}`);
  }

  const equipamentosFora = (await lerIds(db, "equipments", workspaceId)).filter((id) => !equipamentos.has(id));
  for (const lote of lotes(equipamentosFora, 100)) {
    const { error } = await db
      .from("equipments")
      .update({ agent_token_hash: null })
      .in("id", lote)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(`equipments: ${error.message}`);
  }

  const manterConvites = new Set(convites.map((item) => texto(item.id)));
  const { data, error } = await db.from("invites").select("id, workspace_ids").contains("workspace_ids", [workspaceId]);
  if (error) throw new Error(`invites: ${error.message}`);
  const exclusivosFora = ((data ?? []) as { id: string; workspace_ids: string[] }[])
    .filter((item) => item.workspace_ids?.every((id) => id === workspaceId) && !manterConvites.has(item.id))
    .map((item) => item.id);
  await apagarIds(db, "invites", exclusivosFora);
}

async function conferirDono(db: Db, workspaceId: string, tabelas: Tabela[], preparado: Map<Tabela, Linha[]>) {
  for (const tabela of tabelas) {
    const ids = (preparado.get(tabela) ?? []).map((item) => texto(item.id)).filter(Boolean);
    for (const lote of lotes(ids, 100)) {
      const { data, error } = await db.from(tabela).select("id, workspace_id").in("id", lote);
      if (error) throw new Error(`${tabela}: ${error.message}`);
      for (const linha of (data ?? []) as { id: string; workspace_id: string | null }[]) {
        if (linha.workspace_id && linha.workspace_id !== workspaceId) {
          throw new Error(`O backup contém um registro de outra empresa (${tabela}). Restauração cancelada.`);
        }
      }
    }
  }
}

async function conferirConvites(db: Db, workspaceId: string, convites: Linha[]) {
  const ids = convites.map((item) => texto(item.id)).filter(Boolean);
  for (const lote of lotes(ids, 100)) {
    const { data, error } = await db.from("invites").select("id, workspace_ids").in("id", lote);
    if (error) throw new Error(`invites: ${error.message}`);
    for (const linha of (data ?? []) as { workspace_ids: string[] | null }[]) {
      const destinos = linha.workspace_ids ?? [];
      if (destinos.some((id) => id !== workspaceId)) {
        throw new Error("Um convite do backup também pertence a outra empresa. Restauração cancelada.");
      }
    }
  }
}
