import type { NoOrg } from "@/components/overview/OrgChart";

/** Visão inicial do layout operacional. Permanece só na tela até alguém salvar uma versão. */
export const ID_LAYOUT_OP_LOCAL = "local-padrao";

export const NOS_LAYOUT_OP_PADRAO: NoOrg[] = [
  { id: "servicos", titulo: "Layout serviços", subtitulo: "Módulos padrão", parent: null },
  { id: "pdv", titulo: "PDV", subtitulo: "Taste One", parent: "servicos" },
  { id: "retaguarda", titulo: "Retaguarda", subtitulo: "Degust One", parent: "servicos" },
  { id: "movel", titulo: "Móvel", subtitulo: "Taste One", parent: "servicos" },
  { id: "kds", titulo: "KDS", parent: "servicos" },
  { id: "sem-custo", titulo: "Sem custo implantação nova loja", parent: "servicos" },

  {
    id: "operacional",
    titulo: "Layout operacional",
    subtitulo: "Modelos de unidade",
    parent: null,
  },
  { id: "restaurante", titulo: "Modelo Restaurante/Bar", parent: "operacional" },
  { id: "rb-salao", titulo: "Salão", parent: "restaurante" },
  { id: "rb-salao-pos", titulo: "Maquininhas POS", parent: "rb-salao" },
  { id: "rb-salao-backup", titulo: "Terminal de lançamento (Backup)", parent: "rb-salao" },
  { id: "rb-caixa", titulo: "Caixa", parent: "restaurante" },
  { id: "rb-caixa-pdv", titulo: "PDV Caixa/servidor", parent: "rb-caixa" },
  { id: "rb-caixa-fiscal", titulo: "Impressora Fiscal", parent: "rb-caixa" },
  { id: "rb-caixa-naofiscal", titulo: "Impressora não fiscal", parent: "rb-caixa" },
  { id: "rb-bar", titulo: "Bar", parent: "restaurante" },
  { id: "rb-bar-naofiscal", titulo: "Impressora não fiscal", parent: "rb-bar" },
  { id: "rb-cozinha", titulo: "Cozinha", parent: "restaurante" },
  { id: "rb-cozinha-naofiscal", titulo: "Impressora não fiscal", parent: "rb-cozinha" },

  { id: "quiosque", titulo: "Modelo Quiosques", parent: "operacional" },
  { id: "q-salao", titulo: "Salão", parent: "quiosque" },
  { id: "q-salao-pos", titulo: "Maquininhas POS", parent: "q-salao" },
  { id: "q-caixa", titulo: "Caixa", parent: "quiosque" },
  { id: "q-caixa-pdv", titulo: "PDV Caixa/servidor", parent: "q-caixa" },
  { id: "q-caixa-fiscal", titulo: "Impressora Fiscal", parent: "q-caixa" },
  { id: "q-caixa-naofiscal", titulo: "Impressora não fiscal", parent: "q-caixa" },
  { id: "q-cozinha", titulo: "Cozinha", parent: "quiosque" },
  { id: "q-cozinha-naofiscal", titulo: "Impressora não fiscal", parent: "q-cozinha" },

  {
    id: "excecoes",
    titulo: "Exceções das unidades",
    subtitulo: "Desvios do padrão",
    parent: null,
    conteudo:
      "<p>Registre aqui as unidades que não seguem o layout padrão. Use Editar e adicione um bloco abaixo desta seção, com o nome da unidade e o que muda.</p>",
  },
];
