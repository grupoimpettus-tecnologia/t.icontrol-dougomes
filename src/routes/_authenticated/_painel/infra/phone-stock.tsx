import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { RecursoCrud, type Registro } from "@/components/infra/RecursoCrud";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const SEED_ESTOQUE_CELULARES = [
  {
    modelo: "Samsung A14 (128 GB M. Interna)",
    status: "Funcionando",
    estado: "Novo",
    quantidade: 2,
  },
  {
    modelo: "LG K22 (32 GB M. Interna)",
    status: "Funcionando",
    estado: "Antigo",
    quantidade: 2,
  },
  {
    modelo: "LG K22 (32 GB M. Interna)",
    status: "Manutenção",
    estado: "Antigo",
    quantidade: 1,
  },
  {
    modelo: "Tecno K17",
    status: "Manutenção",
    estado: "Antigo",
    quantidade: 1,
  },
  {
    modelo: "Samsung A26 5G (256 GB M. Interna)",
    status: "Sem Estoque",
    estado: "Novo",
    quantidade: 0,
  },
] as const;

const statusOpcoes = ["Funcionando", "Manutenção", "Sem Estoque"];
const estadoOpcoes = ["Novo", "Antigo"];

const coresStatus: Record<string, string> = {
  Funcionando: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Manutenção: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Sem Estoque": "bg-destructive/15 text-destructive",
};

function EstoqueCelulares() {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    let cancelado = false;

    void (async () => {
      const { count, error } = await supabase
        .from("phone_stock")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      if (cancelado || error || (count ?? 0) > 0) return;

      const { error: erroInsert } = await supabase.from("phone_stock").insert(
        SEED_ESTOQUE_CELULARES.map((item) => ({
          ...item,
          workspace_id: workspaceId,
        })),
      );

      if (!cancelado && !erroInsert) {
        await queryClient.invalidateQueries({ queryKey: ["phone_stock", workspaceId] });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [workspaceId, queryClient]);

  return (
    <RecursoCrud
      titulo="Estoque Celulares"
      descricao="Controle de aparelhos em estoque por modelo, status e estado."
      tabela="phone_stock"
      rotuloItem="Celular"
      campoTitulo="modelo"
      ordenarPor="modelo"
      campos={[
        { nome: "modelo", label: "Modelo", placeholder: "Ex.: Samsung A14 (128 GB M. Interna)" },
        {
          nome: "status",
          label: "Status",
          tipo: "select",
          opcoes: statusOpcoes,
          render: (item: Registro) => {
            const status = String(item["status"] ?? "");
            return (
              <Badge variant="secondary" className={cn(coresStatus[status])}>
                {status || "—"}
              </Badge>
            );
          },
        },
        {
          nome: "estado",
          label: "Estado",
          tipo: "select",
          opcoes: estadoOpcoes,
          render: (item: Registro) => (
            <Badge variant="secondary">{String(item["estado"] ?? "—")}</Badge>
          ),
        },
        { nome: "quantidade", label: "Quanti. Estoque", tipo: "inteiro" },
      ]}
    />
  );
}

export const Route = createFileRoute("/_authenticated/_painel/infra/phone-stock")({
  head: () => ({
    meta: [
      { title: "Estoque Celulares | TIControl" },
      {
        name: "description",
        content: "Inventário de celulares em estoque por modelo, status e quantidade.",
      },
      { property: "og:title", content: "Estoque Celulares | TIControl" },
      {
        property: "og:description",
        content: "Inventário de celulares em estoque por modelo, status e quantidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueCelulares,
});
