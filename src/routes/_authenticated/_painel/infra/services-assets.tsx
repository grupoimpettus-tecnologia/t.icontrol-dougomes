import { createFileRoute } from "@tanstack/react-router";
import { ModuloEmBreve } from "@/components/layout/ModuloEmBreve";

export const Route = createFileRoute("/_authenticated/_painel/infra/services-assets")({
  component: () => (
    <ModuloEmBreve
      titulo="Serviços & ativos"
      descricao="Contratos, licenças e serviços contratados pela empresa."
      itens={[
        "Cadastro de fornecedores, valores e datas de renovação",
        "Aviso quando a renovação estiver a menos de 30 dias",
        "Upload do contrato",
        "Status: ativo, inativo ou em análise",
      ]}
    />
  ),
});
