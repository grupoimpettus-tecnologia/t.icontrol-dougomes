import { createFileRoute } from "@tanstack/react-router";
import { ModuloEmBreve } from "@/components/layout/ModuloEmBreve";

export const Route = createFileRoute("/_authenticated/_painel/infra/phone-lines")({
  component: () => (
    <ModuloEmBreve
      titulo="Linhas e celulares"
      descricao="Controle das linhas móveis e aparelhos da empresa."
      itens={[
        "Operadora, número, plano, valor e fidelidade",
        "Responsável, departamento, aparelho e IMEI",
        "Aviso de fim de fidelidade e renovação",
        "Status: ativa, suspensa ou cancelada",
      ]}
    />
  ),
});
