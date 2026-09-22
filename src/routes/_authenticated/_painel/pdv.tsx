import { createFileRoute } from "@tanstack/react-router";
import { ModuloEmBreve } from "@/components/layout/ModuloEmBreve";

export const Route = createFileRoute("/_authenticated/_painel/pdv")({
  head: () => ({ meta: [
    { title: "Sistema PDV | TIControl" }, { name: "description", content: "Área de gestão dos equipamentos e serviços de ponto de venda." },
    { property: "og:title", content: "Sistema PDV | TIControl" }, { property: "og:description", content: "Área de gestão dos equipamentos e serviços de ponto de venda." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <ModuloEmBreve
      titulo="Sistema PDV"
      descricao="Gestão do ponto de venda integrada ao TIControl."
      itens={[
        "Cadastro de terminais e periféricos do PDV",
        "Status operacional das lojas",
        "Chamados e manutenções do PDV",
      ]}
    />
  ),
});
