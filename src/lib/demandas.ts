/** Segunda a quinta. Sexta impacta unidades; sábado e domingo não recebem entrega. */
export function diaPermitidoParaEntrega(data: Date) {
  const dia = data.getDay();
  return dia >= 1 && dia <= 4;
}

export function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

export function formatarIsoData(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function lerIsoData(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1);
}

/** Sexta, sábado e domingo recuam até a quinta, que é o limite da semana. */
export function ajustarParaDiaPermitido(data: Date) {
  const base = inicioDoDia(data);
  const dia = base.getDay();
  if (dia === 5) base.setDate(base.getDate() - 1);
  else if (dia === 6) base.setDate(base.getDate() - 2);
  else if (dia === 0) base.setDate(base.getDate() - 3);
  return base;
}

export function segundaDaSemana(data: Date) {
  const base = inicioDoDia(data);
  const dia = base.getDay();
  const diferenca = dia === 0 ? -6 : 1 - dia;
  base.setDate(base.getDate() + diferenca);
  return base;
}

export type EscopoDemanda = "empresa" | "unidade" | "marca";
export type ClassificacaoDemanda = "baixa" | "media" | "alta";
export type ColunaDemanda = "a_fazer" | "em_andamento" | "concluida";

export const ROTULO_ESCOPO: Record<EscopoDemanda, string> = {
  empresa: "Empresa",
  unidade: "Unidade",
  marca: "Marca/Rede",
};

export const ROTULO_NOME_ESCOPO: Record<EscopoDemanda, string> = {
  empresa: "Nome da empresa",
  unidade: "Nome da unidade",
  marca: "Nome da marca",
};

export const ROTULO_CLASSIFICACAO: Record<ClassificacaoDemanda, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const ROTULO_COLUNA: Record<ColunaDemanda, string> = {
  a_fazer: "A Fazer",
  em_andamento: "Em Andamento",
  concluida: "Concluídas",
};

export function colunaDemanda(dataInicio: string, dataEntrega: string, hoje: Date): ColunaDemanda {
  const dia = inicioDoDia(hoje);
  const inicio = lerIsoData(dataInicio.slice(0, 10));
  const entrega = lerIsoData(dataEntrega.slice(0, 10));
  if (entrega < dia) return "concluida";
  if (inicio > dia) return "a_fazer";
  return "em_andamento";
}

export function resumoDemandas(
  itens: { data_inicio: string; data_entrega: string; classificacao: string | null }[],
  hoje: Date,
) {
  return {
    total: itens.length,
    emAndamento: itens.filter((item) => colunaDemanda(item.data_inicio, item.data_entrega, hoje) === "em_andamento").length,
    statusAlto: itens.filter((item) => item.classificacao === "alta").length,
  };
}

export function sugerirDatasDemanda(dataPedida: Date, entregasOcupadas: string[]) {
  const ocupadas = new Set(entregasOcupadas);
  const base = ajustarParaDiaPermitido(dataPedida);
  let entrega = base;

  if (ocupadas.has(formatarIsoData(base))) {
    for (let distancia = 1; distancia <= 366; distancia += 1) {
      const antes = inicioDoDia(base);
      antes.setDate(antes.getDate() - distancia);
      const depois = inicioDoDia(base);
      depois.setDate(depois.getDate() + distancia);
      if (diaPermitidoParaEntrega(antes) && !ocupadas.has(formatarIsoData(antes))) {
        entrega = antes;
        break;
      }
      if (diaPermitidoParaEntrega(depois) && !ocupadas.has(formatarIsoData(depois))) {
        entrega = depois;
        break;
      }
    }
  }

  return {
    dataInicio: formatarIsoData(segundaDaSemana(entrega)),
    dataPedida: formatarIsoData(inicioDoDia(dataPedida)),
    dataEntrega: formatarIsoData(entrega),
  };
}
