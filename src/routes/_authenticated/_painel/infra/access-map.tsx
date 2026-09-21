import { createFileRoute } from "@tanstack/react-router";
import { RecursoCrud } from "@/components/infra/RecursoCrud";

export const Route = createFileRoute("/_authenticated/_painel/infra/access-map")({
  head: () => ({
    meta: [
      { title: "Mapa de acessos | TIControl" },
      {
        name: "description",
        content: "Relação de acessos, painéis e serviços de manutenção da empresa.",
      },
      { property: "og:title", content: "Mapa de acessos | TIControl" },
      {
        property: "og:description",
        content: "Relação de acessos, painéis e serviços de manutenção da empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RecursoCrud
      titulo="Mapa de acessos"
      descricao="Acessos de manutenção de servidores, painéis e serviços."
      tabela="access_entries"
      rotuloItem="Acesso"
      campoTitulo="nome"
      ordenarPor="nome"
      campoGrupo="grupo"
      campos={[
        { nome: "nome", label: "Nome", placeholder: "AD01, FIREWALL, VPN..." },
        { nome: "tipo", label: "Tipo", placeholder: "SSH, RDP, Web, VPN, API" },
        { nome: "url", label: "Endereço / URL" },
        { nome: "usuario", label: "Usuário" },
        { nome: "ambiente", label: "Ambiente", placeholder: "Produção, Escritório..." },
        { nome: "custo_mensal", label: "Custo mensal", tipo: "numero" },
        { nome: "grupo", label: "Grupo" },
        { nome: "observacoes", label: "Observações", tipo: "textarea", naTabela: false },
      ]}
    />
  ),
});
