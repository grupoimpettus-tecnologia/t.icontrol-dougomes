import { createFileRoute } from "@tanstack/react-router";
import { ModuloEmBreve } from "@/components/layout/ModuloEmBreve";

export const Route = createFileRoute("/_authenticated/_painel/infra/monitoring")({
  component: () => (
    <ModuloEmBreve
      titulo="Monitoramento de serviços"
      descricao="Disponibilidade de sites, links, bancos e equipamentos."
      itens={[
        "Monitores por site, ping, porta, DNS, palavra-chave e banco",
        "Painel em tempo real com disponibilidade em 24h, 7 e 30 dias",
        "Gráfico de tempo de resposta e linha do tempo de incidentes",
        "Alertas por e-mail, notificação no celular e webhook",
        "Página de status pública compartilhável",
      ]}
    />
  ),
});
