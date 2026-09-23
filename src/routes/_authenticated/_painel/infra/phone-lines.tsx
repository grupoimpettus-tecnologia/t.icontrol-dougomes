import { createFileRoute } from "@tanstack/react-router";
import { RecursoCrud } from "@/components/infra/RecursoCrud";

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
  component: () => (
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
        { nome: "linha", label: "Número" },
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
  ),
});
