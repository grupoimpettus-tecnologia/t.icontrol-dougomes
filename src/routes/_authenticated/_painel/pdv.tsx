import { createFileRoute } from "@tanstack/react-router";
import { ModuloEmBreve } from "@/components/layout/ModuloEmBreve";

export const Route = createFileRoute("/_authenticated/_painel/pdv")({
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
