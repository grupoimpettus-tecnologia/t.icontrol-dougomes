export const TABELAS_BACKUP = [
  "workspaces", "user_workspaces", "invites", "access_entries", "service_assets",
  "equipments", "equipment_heartbeats", "phone_lines", "phone_stock", "team_members",
  "org_versions", "monitors", "monitor_checks", "monitor_incidents",
  "monitor_notification_recipients", "notification_logs", "pdv_lojas",
  "pdv_loja_etapas", "audit_logs",
] as const;

export const TAMANHO_PAGINA_BACKUP = 500;
export type TabelaBackup = (typeof TABELAS_BACKUP)[number];
export type PaginaBackup = {
  linhasJson: string;
  quantidade: number;
  proximoId: string | null;
  ultimoId: string | null;
};
export type PedidoPaginaBackup = {
  tabela: TabelaBackup;
  depoisId: string | null;
  ultimoId: string | null;
};

/** Builds the existing v1 JSON from small immutable Blob parts, never one giant object. */
export async function montarArquivoBackup(
  cabecalho: {
    formato: "ticontrol-backup";
    versao: 1;
    gerado_em: string;
    workspace: { id: string; nome: string; slug: string };
  },
  lerPagina: (pedido: PedidoPaginaBackup) => Promise<PaginaBackup>,
  progresso: (linhas: number, tabela: TabelaBackup) => void,
): Promise<Blob> {
  const partes: BlobPart[] = [JSON.stringify(cabecalho).slice(0, -1), ',"tabelas":{'];
  let total = 0;
  for (const [indice, tabela] of TABELAS_BACKUP.entries()) {
    partes.push(`${indice ? "," : ""}${JSON.stringify(tabela)}:[`);
    let depoisId: string | null = null;
    let ultimoId: string | null = null;
    let temLinhas = false;
    for (;;) {
      const pagina = await lerPagina({ tabela, depoisId, ultimoId });
      if (pagina.quantidade > 0) {
        if (temLinhas) partes.push(",");
        partes.push(new Blob([pagina.linhasJson.slice(1, -1)]));
        temLinhas = true;
        total += pagina.quantidade;
      }
      progresso(total, tabela);
      if (!pagina.proximoId) break;
      if (pagina.proximoId === depoisId) throw new Error("A leitura do backup não avançou. Tente novamente.");
      depoisId = pagina.proximoId;
      ultimoId = pagina.ultimoId;
    }
    partes.push("]");
  }
  partes.push("}}");
  return new Blob(partes, { type: "application/json" });
}