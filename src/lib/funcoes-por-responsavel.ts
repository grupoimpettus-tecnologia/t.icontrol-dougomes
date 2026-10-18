import { MICROAREAS, type CargoMicroarea, type FuncaoMicroarea, type Microarea } from "./microarea-cargos.ts";

export type NoOrganograma = {
  id: string;
  titulo: string;
  parent: string | null;
  conteudo?: string | null;
};

export type ItemFuncao = {
  secao: string;
  atividade: string;
  descricao: string;
  analista: boolean;
  assistente: boolean;
};

function textoPlano(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function ehParceiro(valor: string) {
  return /house\s*ti|suporte\s+local|suporte\s+t\.?\s*i\.?(?:\s+da\s+loja)?|parceiro/i.test(valor);
}

export function classificarResponsavel(valor: string) {
  const texto = valor.trim();
  if (!texto) return { analista: false, assistente: false, marcado: false };
  if (ehParceiro(texto)) return { analista: true, assistente: true, marcado: true };
  const analista = /analista/i.test(texto);
  const assistente = /assistente/i.test(texto);
  return { analista, assistente, marcado: analista || assistente };
}

function partes(html: string) {
  return html
    .split(/(?=<h[1-3][\s>]|<table[\s>]|<li[\s>])/i)
    .map((parte) => parte.trim())
    .filter(Boolean);
}

function celulas(linha: string) {
  return [...linha.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((achado) => textoPlano(achado[1] ?? ""));
}

function indiceColuna(cabecalhos: string[], preferida: RegExp, reserva: RegExp) {
  const preferido = cabecalhos.findIndex((coluna) => preferida.test(normalizar(coluna)));
  if (preferido >= 0) return preferido;
  return cabecalhos.findIndex((coluna) => reserva.test(normalizar(coluna)));
}

function itensDaTabela(html: string, secao: string): ItemFuncao[] {
  const linhas = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((achado) => celulas(achado[1] ?? ""));
  const cabecalho = linhas.find((linha) => linha.some((celula) => /respons/i.test(celula)));
  if (!cabecalho) return [];
  const responsavel = indiceColuna(cabecalho, /respons.*cenario/, /^responsavel$/);
  const atividade = indiceColuna(cabecalho, /atividade/, /^$/);
  const descricao = cabecalho.findIndex((coluna) => /descri/i.test(coluna));
  if (responsavel < 0) return [];
  const colunaAtividade = atividade >= 0 ? atividade : 0;
  let herdado = { analista: false, assistente: false };
  const itens: ItemFuncao[] = [];
  for (const linha of linhas) {
    if (linha === cabecalho || linha.every((celula) => !celula)) continue;
    const nome = linha[colunaAtividade] ?? "";
    if (!nome || normalizar(nome) === normalizar(cabecalho[colunaAtividade] ?? "")) continue;
    const classificacao = classificarResponsavel(linha[responsavel] ?? "");
    const parceiro = linha.some((celula) => ehParceiro(celula));
    if (parceiro) herdado = { analista: true, assistente: true };
    else if (classificacao.marcado) herdado = { analista: classificacao.analista, assistente: classificacao.assistente };
    if (!herdado.analista && !herdado.assistente) continue;
    itens.push({
      secao,
      atividade: nome,
      descricao: descricao >= 0 ? linha[descricao] ?? "" : "",
      analista: herdado.analista,
      assistente: herdado.assistente,
    });
  }
  return itens;
}

function itemDeLista(texto: string, secao: string, herdado: { analista: boolean; assistente: boolean }) {
  const sufixo = texto.match(/:\s*([^:]+)$/);
  const classificacao = classificarResponsavel(sufixo?.[1] ?? "");
  const parceiro = ehParceiro(texto);
  const proximo = parceiro
    ? { analista: true, assistente: true }
    : classificacao.marcado
      ? { analista: classificacao.analista, assistente: classificacao.assistente }
      : herdado;
  if (!proximo.analista && !proximo.assistente) return { item: null, herdado: proximo };
  const atividade = sufixo && (classificacao.marcado || ehParceiro(sufixo[1] ?? "")) ? texto.slice(0, sufixo.index).trim() : texto;
  return {
    item: { secao, atividade, descricao: "", analista: proximo.analista, assistente: proximo.assistente },
    herdado: proximo,
  };
}

export function extrairItensOrganograma(html: string): ItemFuncao[] {
  let secao = "";
  let herdado = { analista: false, assistente: false };
  const itens: ItemFuncao[] = [];
  for (const parte of partes(html)) {
    if (/^<h[1-3]/i.test(parte)) {
      secao = textoPlano(parte.replace(/<table[\s\S]*$/i, "").replace(/<li[\s\S]*$/i, ""));
      herdado = { analista: false, assistente: false };
    }
    if (/<table[\s>]/i.test(parte)) {
      itens.push(...itensDaTabela(parte, secao));
      continue;
    }
    if (/^<li/i.test(parte)) {
      const resultado = itemDeLista(textoPlano(parte), secao, herdado);
      herdado = resultado.herdado;
      if (resultado.item) itens.push(resultado.item);
    }
  }
  return itens;
}

function escapar(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function jaContem(html: string, atividade: string) {
  return normalizar(textoPlano(html)).includes(normalizar(atividade));
}

function htmlDosItens(itens: ItemFuncao[]) {
  const grupos = new Map<string, ItemFuncao[]>();
  for (const item of itens) {
    const lista = grupos.get(item.secao) ?? [];
    lista.push(item);
    grupos.set(item.secao, lista);
  }
  return [...grupos.entries()].map(([secao, lista]) => {
    const titulo = secao ? `<h3>${escapar(secao)}</h3>` : "";
    const linhas = lista.map((item) => `<li><p><strong>${escapar(item.atividade)}</strong>${item.descricao ? ` — ${escapar(item.descricao)}` : ""}</p></li>`).join("");
    return `${titulo}<ul>${linhas}</ul>`;
  }).join("");
}

function microareaDoNo(no: NoOrganograma, porId: Map<string, NoOrganograma>): Microarea | null {
  let atual: NoOrganograma | undefined = no;
  const vistos = new Set<string>();
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    const titulo = normalizar(atual.titulo);
    const area = MICROAREAS.find((microarea) => normalizar(microarea) === titulo);
    if (area) return area;
    atual = atual.parent ? porId.get(atual.parent) : undefined;
  }
  return null;
}

export function completarFuncoesPeloOrganograma(funcoes: FuncaoMicroarea[], nos: NoOrganograma[]): FuncaoMicroarea[] {
  const porId = new Map(nos.map((no) => [no.id, no]));
  const porArea = new Map<Microarea, ItemFuncao[]>();
  for (const no of nos) {
    const area = microareaDoNo(no, porId);
    if (!area || !no.conteudo?.trim()) continue;
    const atuais = porArea.get(area) ?? [];
    atuais.push(...extrairItensOrganograma(no.conteudo));
    porArea.set(area, atuais);
  }

  return funcoes.map((funcao) => {
    if (funcao.cargo === "Gestor") return funcao;
    const cargo = funcao.cargo as CargoMicroarea;
    const novos = (porArea.get(funcao.microarea) ?? []).filter((item) => {
      const serve = cargo === "Analista" ? item.analista : item.assistente;
      return serve && !jaContem(funcao.funcoes_html, item.atividade);
    });
    if (!novos.length) return funcao;
    const complemento = htmlDosItens(novos);
    return { ...funcao, funcoes_html: `${funcao.funcoes_html}${complemento}` };
  });
}
