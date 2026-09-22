import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarEmpresas from "./tools/listar-empresas";
import listarMonitores from "./tools/listar-monitores";
import listarEquipamentos from "./tools/listar-equipamentos";
import listarServicos from "./tools/listar-servicos";
import listarLinhas from "./tools/listar-linhas";
import listarAcessos from "./tools/listar-acessos";
import resumoEmpresa from "./tools/resumo-empresa";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "t-icontrol-dougomes",
  title: "T.IControl - Dougomes",
  version: "0.1.0",
  instructions:
    "Ferramentas do TIControl, plataforma de gestão de T.I. Consulte empresas, monitores de disponibilidade, equipamentos, serviços e ativos, linhas telefônicas e o mapa de acessos. Comece por `listar_empresas` quando o usuário tiver acesso a mais de uma empresa. Todos os dados respeitam as permissões do usuário autenticado; senhas nunca são retornadas.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listarEmpresas,
    resumoEmpresa,
    listarMonitores,
    listarEquipamentos,
    listarServicos,
    listarLinhas,
    listarAcessos,
  ],
});
