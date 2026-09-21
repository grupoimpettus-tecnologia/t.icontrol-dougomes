import { createFileRoute } from "@tanstack/react-router";
import { ModuloEmBreve } from "@/components/layout/ModuloEmBreve";

export const Route = createFileRoute("/_authenticated/_painel/infra/equipments")({
  component: () => (
    <ModuloEmBreve
      titulo="Inventário de equipamentos"
      descricao="Servidores, computadores e equipamentos de rede."
      itens={[
        "Cadastro completo: modelo, série, sistema, IP, responsável",
        "Status online/offline por departamento",
        "Token do equipamento e download do agente de coleta",
        "Histórico de uso de processador, memória e disco",
      ]}
    />
  ),
});
