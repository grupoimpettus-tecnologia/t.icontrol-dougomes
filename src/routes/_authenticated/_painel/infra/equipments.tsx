import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { RecursoCrud, type Registro } from "@/components/infra/RecursoCrud";
import { PainelAgente } from "@/components/infra/PainelAgente";
import { agentStatusLabels, situacaoAgente, tiposEquipamento } from "@/lib/agente";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";

const cores: Record<string, string> = {
  online: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  offline: "bg-destructive/15 text-destructive",
  manutencao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  sem_agente: "bg-muted text-muted-foreground",
};

const situacoesEquipamento = ["Ativo", "Estoque", "Manutenção", "Descarte"];

function Equipamentos() {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const podeGerenciar = atual ? ["master", "admin", "tecnico"].includes(atual.role) : false;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    let cancelado = false;

    void (async () => {
      const { data, error } = await supabase
        .from("equipments")
        .select("id, status")
        .eq("workspace_id", workspaceId)
        .ilike("status", "reposi%de pe%as");

      if (cancelado || error || !data?.length) return;

      const ids = data
        .filter((item) => /reposi[cç][aã]o de pe[cç]as/i.test(String(item.status ?? "")))
        .map((item) => item.id);

      if (!ids.length) return;

      const { error: erroUpdate } = await supabase
        .from("equipments")
        .update({ status: "Descarte", updated_at: new Date().toISOString() })
        .in("id", ids);

      if (!cancelado && !erroUpdate) {
        await queryClient.invalidateQueries({ queryKey: ["equipments", workspaceId] });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [workspaceId, queryClient]);

  return (
    <RecursoCrud
      titulo="Inventário de equipamentos"
      descricao="Notebooks, servidores e demais equipamentos, com responsável, situação e agente de status."
      tabela="equipments"
      rotuloItem="Equipamento"
      campoTitulo="patrimonio"
      ordenarPor="patrimonio"
      atualizarACada={60000}
      colunasExtras={[
        {
          chave: "situacao_agente",
          titulo: "Agente",
          render: (item: Registro) => {
            const s = situacaoAgente(item as never);
            return (
              <Badge variant="secondary" className={cores[s]}>
                {agentStatusLabels[s]}
              </Badge>
            );
          },
          valorExport: (item) => agentStatusLabels[situacaoAgente(item as never)],
        },
        {
          chave: "visto_em",
          titulo: "Visto pela última vez",
          render: (item: Registro) =>
            item["ultimo_heartbeat"]
              ? new Date(String(item["ultimo_heartbeat"])).toLocaleString("pt-BR")
              : "—",
          valorExport: (item) =>
            item["ultimo_heartbeat"]
              ? new Date(String(item["ultimo_heartbeat"])).toLocaleString("pt-BR")
              : "",
        },
      ]}
      acoesExtras={(item) => <PainelAgente item={item} podeGerenciar={podeGerenciar} />}
      campos={[
        { nome: "patrimonio", label: "Patrimônio", placeholder: "L0073" },
        { nome: "responsavel", label: "Responsável" },
        { nome: "hostname", label: "Hostname" },
        { nome: "tipo", label: "Tipo", tipo: "select", opcoes: tiposEquipamento },
        { nome: "marca", label: "Marca" },
        { nome: "modelo", label: "Modelo" },
        { nome: "setor", label: "Setor" },
        { nome: "local", label: "Local" },
        { nome: "condicao", label: "Condição", placeholder: "Novo, Semi-novo..." },
        {
          nome: "status",
          label: "Situação",
          tipo: "select",
          opcoes: situacoesEquipamento,
        },
        { nome: "sistema_operacional", label: "Sistema operacional", naTabela: false },
        { nome: "cpu", label: "CPU", naTabela: false },
        { nome: "memoria", label: "Memória", naTabela: false },
        { nome: "disco", label: "Disco", naTabela: false },
        { nome: "mac", label: "MAC", naTabela: false },
        { nome: "custo_compra", label: "Custo de compra", tipo: "numero", naTabela: false },
        { nome: "numero_serie", label: "Número de série", naTabela: false },
        { nome: "ip", label: "IP", naTabela: false },
        { nome: "termo_url", label: "Termo de responsabilidade (link)", naTabela: false },
        { nome: "configuracao", label: "Configuração", tipo: "textarea", naTabela: false },
        { nome: "observacoes", label: "Descrição", tipo: "editor", naTabela: false },
      ]}
    />
  );
}

export const Route = createFileRoute("/_authenticated/_painel/infra/equipments")({
  head: () => ({
    meta: [
      { title: "Equipamentos | TIControl" },
      {
        name: "description",
        content:
          "Inventário de equipamentos com status online/offline em tempo real via agente instalado.",
      },
      { property: "og:title", content: "Equipamentos | TIControl" },
      {
        property: "og:description",
        content:
          "Inventário de equipamentos com status online/offline em tempo real via agente instalado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Equipamentos,
});
