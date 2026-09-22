import { createFileRoute } from "@tanstack/react-router";
import { RecursoCrud } from "@/components/infra/RecursoCrud";

export const Route = createFileRoute("/_authenticated/_painel/infra/services-assets")({
  head: () => ({
    meta: [
      { title: "Serviços & ativos | TIControl" },
      {
        name: "description",
        content: "Contratos, licenças e serviços contratados, com custos e situação.",
      },
      { property: "og:title", content: "Serviços & ativos | TIControl" },
      {
        property: "og:description",
        content: "Contratos, licenças e serviços contratados, com custos e situação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RecursoCrud
      titulo="Serviços & ativos"
      descricao="Contratos, licenças e serviços contratados pela empresa."
      tabela="service_assets"
      rotuloItem="Serviço"
      campoTitulo="nome"
      ordenarPor="nome"
      campoGrupo="grupo"
      campos={[
        { nome: "nome", label: "Serviço" },
        { nome: "fornecedor", label: "Fornecedor" },
        { nome: "tipo_contrato", label: "Tipo de contrato", placeholder: "Mensal, Anual..." },
        { nome: "custo", label: "Custo", tipo: "numero" },
        { nome: "status", label: "Situação", placeholder: "Ativo, Inativo, Em análise" },
        { nome: "renovacao_em", label: "Renovação em", tipo: "data" },
        { nome: "grupo", label: "Grupo" },
        { nome: "contrato_url", label: "Link do contrato", naTabela: false },
        { nome: "observacoes", label: "Descrição", tipo: "textarea", naTabela: false },
      ]}
    />
  ),
});
