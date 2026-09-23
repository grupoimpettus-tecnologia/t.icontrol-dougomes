import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { RecursoCrud } from "@/components/infra/RecursoCrud";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { formatarNumeroLinha, precisaFormatarNumeroLinha } from "@/lib/telefone";

function LinhasCelulares() {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    let cancelado = false;

    void (async () => {
      const { data, error } = await supabase
        .from("phone_lines")
        .select("id, linha")
        .eq("workspace_id", workspaceId);

      if (cancelado || error || !data?.length) return;

      const ajustes = data
        .map((item) => {
          const atualizado = formatarNumeroLinha(item.linha);
          if (!precisaFormatarNumeroLinha(item.linha)) return null;
          return { id: item.id, linha: atualizado };
        })
        .filter((item): item is { id: string; linha: string } => !!item);

      if (!ajustes.length) return;

      await Promise.all(
        ajustes.map((item) =>
          supabase
            .from("phone_lines")
            .update({ linha: item.linha, updated_at: new Date().toISOString() })
            .eq("id", item.id),
        ),
      );

      if (!cancelado) {
        await queryClient.invalidateQueries({ queryKey: ["phone_lines", workspaceId] });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [workspaceId, queryClient]);

  return (
    <RecursoCrud
      titulo="Linhas Móveis"
      descricao="Linhas móveis, planos, valores e aparelhos por responsável."
      tabela="phone_lines"
      rotuloItem="Linha"
      campoTitulo="responsavel"
      ordenarPor="responsavel"
      campoGrupo="setor"
      campos={[
        { nome: "responsavel", label: "Responsável" },
        {
          nome: "linha",
          label: "Número",
          placeholder: "21 90000-0000",
          normalizar: (valor) => formatarNumeroLinha(valor == null ? "" : String(valor)),
        },
        { nome: "operadora", label: "Operadora" },
        { nome: "plano", label: "Plano" },
        { nome: "valor", label: "Valor", tipo: "numero" },
        { nome: "tipo_linha", label: "Tipo", placeholder: "CHIP ou E-SIM" },
        { nome: "setor", label: "Setor" },
        { nome: "status", label: "Situação", placeholder: "Ativo, Estoque, Cancelada" },
        { nome: "condicoes", label: "Condições", naTabela: false },
        { nome: "pacote_extra", label: "Pacote extra", naTabela: false },
        { nome: "tem_aparelho", label: "Tem aparelho?", tipo: "booleano" },
        { nome: "marca", label: "Marca do aparelho", naTabela: false },
        { nome: "modelo", label: "Modelo do aparelho", naTabela: false },
        { nome: "sistema", label: "Sistema", naTabela: false },
        { nome: "imei", label: "IMEI", naTabela: false },
        { nome: "fidelidade_ate", label: "Fidelidade até", tipo: "data", naTabela: false },
        { nome: "observacoes", label: "Descrição", tipo: "editor", naTabela: false },
      ]}
    />
  );
}

export const Route = createFileRoute("/_authenticated/_painel/infra/phone-lines")({
  head: () => ({
    meta: [
      { title: "Linhas e celulares | TIControl" },
      {
        name: "description",
        content: "Controle das linhas móveis, planos, valores e aparelhos da empresa.",
      },
      { property: "og:title", content: "Linhas e celulares | TIControl" },
      {
        property: "og:description",
        content: "Controle das linhas móveis, planos, valores e aparelhos da empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LinhasCelulares,
});
