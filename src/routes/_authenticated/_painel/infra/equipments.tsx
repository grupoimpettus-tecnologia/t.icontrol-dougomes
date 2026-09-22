import { createFileRoute } from "@tanstack/react-router";
import { RecursoCrud } from "@/components/infra/RecursoCrud";

export const Route = createFileRoute("/_authenticated/_painel/infra/equipments")({
  head: () => ({
    meta: [
      { title: "Equipamentos | TIControl" },
      {
        name: "description",
        content: "Inventário de notebooks, servidores e equipamentos por setor e responsável.",
      },
      { property: "og:title", content: "Equipamentos | TIControl" },
      {
        property: "og:description",
        content: "Inventário de notebooks, servidores e equipamentos por setor e responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RecursoCrud
      titulo="Inventário de equipamentos"
      descricao="Notebooks, servidores e demais equipamentos, com responsável e situação."
      tabela="equipments"
      rotuloItem="Equipamento"
      campoTitulo="patrimonio"
      ordenarPor="patrimonio"
      campoGrupo="tipo"
      campos={[
        { nome: "patrimonio", label: "Patrimônio", placeholder: "L0073" },
        { nome: "tipo", label: "Tipo", placeholder: "Notebook, Desktop, Servidor..." },
        { nome: "marca", label: "Marca" },
        { nome: "modelo", label: "Modelo" },
        { nome: "responsavel", label: "Responsável" },
        { nome: "setor", label: "Setor" },
        { nome: "local", label: "Local" },
        { nome: "condicao", label: "Condição", placeholder: "Novo, Semi-novo..." },
        { nome: "status", label: "Situação", placeholder: "Ativo, Estoque, Manutenção" },
        { nome: "custo_compra", label: "Custo de compra", tipo: "numero", naTabela: false },
        { nome: "numero_serie", label: "Número de série", naTabela: false },
        { nome: "ip", label: "IP", naTabela: false },
        { nome: "termo_url", label: "Termo de responsabilidade (link)", naTabela: false },
        { nome: "configuracao", label: "Configuração", tipo: "textarea", naTabela: false },
        { nome: "observacoes", label: "Descrição", tipo: "textarea", naTabela: false },
      ]}
    />
  ),
});
