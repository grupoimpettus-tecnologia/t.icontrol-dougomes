import { createFileRoute } from "@tanstack/react-router";
import { ModuloEmBreve } from "@/components/layout/ModuloEmBreve";

export const Route = createFileRoute("/_authenticated/_painel/infra/access-map")({
  component: () => (
    <ModuloEmBreve
      titulo="Mapa de acessos"
      descricao="Credenciais de manutenção de servidores, painéis e serviços."
      itens={[
        "Cadastro de acessos (SSH, RDP, Web, VPN, API)",
        "Senhas guardadas de forma criptografada",
        "Botão copiar com registro de auditoria",
        "Busca e filtros por tipo, ambiente e etiqueta",
      ]}
    />
  ),
});
