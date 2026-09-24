export type PassoMicroFranqueado = {
  id: string;
  codigo: string;
  titulo: string;
  tiIntro?: string;
  tiItens?: string[];
  tiTexto?: string;
  entregavel?: string;
  pontoAtencao?: string;
};

export type FaseMicroFranqueado = {
  id: string;
  codigo: string;
  titulo: string;
  subtitulo: string;
  passos: PassoMicroFranqueado[];
};

export const FASES_MICRO_FRANQUEADO: FaseMicroFranqueado[] = [
  {
    id: "nova-loja",
    codigo: "1",
    titulo: "Nova Loja",
    subtitulo: "Fase de Implantação e Go-Live",
    passos: [
      {
        id: "nl-1",
        codigo: "1.1",
        titulo: "Fornece acesso ao e-mail corporativo",
        tiIntro: "T.I da Franqueadora:",
        tiItens: [
          "Criar a conta no provedor de e-mail corporativo, seguindo o padrão de nomenclatura da rede (ex: nomeloja@franquia.com.br).",
          "Credenciais de acesso enviadas ao franqueado, através do consultor responsável pela unidade ou para o time que esteja apoiando nesta etapa de interação com a unidade, com manual de primeiros passos e políticas de uso.",
          "Garantir que o franqueado entenda que o e-mail é uma ferramenta de trabalho e que a matriz pode auditar o uso para segurança da informação.",
        ],
      },
      {
        id: "nl-2",
        codigo: "1.2",
        titulo: "Fornece modelo padrão para aquisição de equipamentos da loja",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          'Entregar uma "Cartilha de Hardware" contendo as especificações mínimas (Processador, RAM, SSD, Sistema Operacional, requisitos de rede) para:',
        tiItens: [
          "Servidor local (caixa), terminais de PDV (lançamento), impressoras fiscais/não fiscais e explicação de como os equipamentos devem estar conectados na rede/internet",
        ],
        entregavel:
          "Documento PDF ou planilha com especificações técnicas e, se possível, uma lista de fornecedores homologados.",
        pontoAtencao:
          "Evitar que o franqueado compre equipamentos baratos ou incompatíveis que gerarão gargalos e chamados de suporte futuros.",
      },
      {
        id: "nl-3",
        codigo: "1.3",
        titulo: "Acompanha e explica ao time de TI da loja durante a construção da unidade",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Reuniões de alinhamento (kick-off) com o responsável de TI da obra ou o franqueado. Explicar a topologia de rede necessária (cabeamento estruturado, pontos de rede, elétrica estabilizada, localização do rack).",
        entregavel: "Checklist de infraestrutura validado (pontos de rede, tomadas, espaço físico para servidores).",
        pontoAtencao:
          "Atrasos na obra ou falta de infraestrutura de rede (ex: passar cabo depois do drywall pronto) geram custos altíssimos e atrasam a abertura.",
      },
      {
        id: "nl-4",
        codigo: "1.4",
        titulo: "Valida junto ao time de TI da loja layout de equipamentos instalados e configurados",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Vistoria (remota via fotos/vídeo) para confirmar se os equipamentos estão instalados conforme o padrão (ex: terminal de PDV não exposto ao calor, cabos organizados, roteador em local ventilado).",
        entregavel: "Termo de Validação de Infraestrutura assinado (ou e-mail de aprovação).",
        pontoAtencao:
          "Verificar se a rede elétrica está devidamente aterrada e se os nobreaks estão dimensionados corretamente para evitar queima de equipamentos.",
      },
      {
        id: "nl-5",
        codigo: "1.5",
        titulo: "Apoia implantação do sistema de venda (PDV)",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Suporte remoto ou presencial para instalar o software de PDV, configurar o banco de dados local, apontar para o servidor da matriz (se for nuvem/híbrido) e configurar os periféricos (impressora, balança, leitor).",
        entregavel: "Sistema de PDV instalado e comunicando com a retaguarda.",
        pontoAtencao:
          "Garantir que a conectividade com a internet esteja estável antes de iniciar a implantação do PDV.",
      },
      {
        id: "nl-6",
        codigo: "1.6",
        titulo: "Valida implantação do sistema de venda (PDV)",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Realizar testes de mesa (simular uma venda, emitir cupom fiscal, cancelar item, fechar caixa) para garantir que todas as regras de negócio estão funcionando.",
        entregavel: "Checklist de Testes de Aceite (UAT) preenchido e aprovado.",
        pontoAtencao:
          "Nunca validar sem antes testar a emissão fiscal (SAT/NFC-e) e a integração com meios de pagamento (TEF).",
      },
      {
        id: "nl-7",
        codigo: "1.7",
        titulo: "Solicita treinamento de sistema de venda (PDV) para o time operacional da unidade",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Agendar e intermediar o treinamento com a equipe de Treinamento da aplicação de PDV oficial. Fornecer manuais rápidos (Quick Reference Guides) para os operadores de caixa.",
        entregavel: "Turma agendada e material de apoio entregue.",
        pontoAtencao:
          'O treinamento deve focar no "como fazer" e não no "porquê" técnico, para não confundir os operadores.',
      },
    ],
  },
  {
    id: "pos",
    codigo: "2",
    titulo: "Pós-Implantação",
    subtitulo: "Fase de Estabilização e Autonomia",
    passos: [
      {
        id: "pos-1",
        codigo: "2.1",
        titulo:
          "Solicita treinamento de retaguarda de sistema de venda (PDV) para o time de gestão da unidade (gerente, operador e franqueado)",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Agendar treinamento focado em relatórios gerenciais, cadastro de produtos, controle de estoque, fechamento de caixa e parametrização do sistema.",
        entregavel: "Treinamento realizado e acesso liberado para os perfis de gestão.",
        pontoAtencao:
          "O franqueado precisa entender que ele é o responsável pela gestão dos dados da loja; a matriz fornece a ferramenta, mas a operação é dele.",
      },
      {
        id: "pos-2",
        codigo: "2.2",
        titulo: "Apresenta fluxo de atendimento do sistema de vendas",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Explicar claramente o fluxo de abertura de chamados (Helpdesk). Definir o que é responsabilidade da loja (ex: trocar cabo de rede), o que é do suporte da aplicação de PDV e o que é do TI da franqueadora. Explicar sobre os SLAs (prazos de atendimento).",
        entregavel: 'Documento ou apresentação com o "Fluxo de Atendimento" e contatos de suporte.',
        pontoAtencao:
          "Deixar claro que problemas de infraestrutura local (internet caindo, computador queimado) não são responsabilidade do suporte do sistema, a menos que haja contrato de infraestrutura.",
      },
      {
        id: "pos-3",
        codigo: "2.3",
        titulo: "Apoia dúvidas sobre cardápio no sistema",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Auxiliar o franqueado nas dúvidas iniciais sobre cardápio (cadastro de produtos, preços, dinâmica, combos, promoções) dentro do sistema de PDV.",
        entregavel: "Cardápio configurado e validado.",
        pontoAtencao:
          "Fora o padrão de cardápio definido pela franqueadora atualmente, o TI da franqueadora não terá autorização de atualizações de novos produtos, preços, adicionar combos, promoções e dinâmica desejadas pelo franqueado. Essa prática precisa ser realizada através de uma solicitação para o consultor da unidade.",
      },
    ],
  },
];

export function textoPassoMicro(passo: Pick<PassoMicroFranqueado, "tiTexto" | "tiItens">) {
  const partes: string[] = [];
  if (passo.tiTexto) partes.push(passo.tiTexto);
  if (passo.tiItens?.length) partes.push(passo.tiItens.map((item) => `• ${item}`).join("\n"));
  return partes.join("\n\n");
}

export const PASSOS_MICRO_POR_ID = new Map(
  FASES_MICRO_FRANQUEADO.flatMap((f) => f.passos.map((p) => [p.id, p] as const)),
);

export const TOTAL_PASSOS_MICRO = FASES_MICRO_FRANQUEADO.reduce((acc, f) => acc + f.passos.length, 0);
