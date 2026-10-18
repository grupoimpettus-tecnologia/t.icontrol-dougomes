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
  nivel: number;
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
      nivel: 0,
      analista: herdado.analista,
      assistente: herdado.assistente,
    });
  }
  return itens;
}

function lerLista(html: string, inicio: number) {
  let profundidade = 0;
  let cursor = inicio;
  const abre = /<ul[^>]*>/gi;
  const fecha = /<\/ul>/gi;
  abre.lastIndex = inicio;
  fecha.lastIndex = inicio;
  let proximoAbre = abre.exec(html);
  let proximoFecha = fecha.exec(html);
  while (proximoAbre || proximoFecha) {
    const abreAntes = proximoAbre && (!proximoFecha || proximoAbre.index < proximoFecha.index);
    if (abreAntes && proximoAbre) {
      profundidade += 1;
      cursor = proximoAbre.index + proximoAbre[0].length;
      proximoAbre = abre.exec(html);
    } else if (proximoFecha) {
      profundidade -= 1;
      cursor = proximoFecha.index + proximoFecha[0].length;
      if (profundidade === 0) return { html: html.slice(inicio, cursor), fim: cursor };
      proximoFecha = fecha.exec(html);
    }
  }
  return { html: html.slice(inicio), fim: html.length };
}

function lerElemento(html: string, inicio: number, tag: "li" | "ul") {
  const abre = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  const fecha = new RegExp(`</${tag}>`, "gi");
  abre.lastIndex = inicio;
  fecha.lastIndex = inicio;
  let profundidade = 0;
  let cursor = inicio;
  let proximoAbre = abre.exec(html);
  let proximoFecha = fecha.exec(html);
  while (proximoAbre || proximoFecha) {
    const abreAntes = proximoAbre && (!proximoFecha || proximoAbre.index < proximoFecha.index);
    if (abreAntes && proximoAbre) {
      profundidade += 1;
      cursor = proximoAbre.index + proximoAbre[0].length;
      proximoAbre = abre.exec(html);
    } else if (proximoFecha) {
      profundidade -= 1;
      cursor = proximoFecha.index + proximoFecha[0].length;
      if (profundidade === 0) return { html: html.slice(inicio, cursor), fim: cursor };
      proximoFecha = fecha.exec(html);
    }
  }
  return { html: html.slice(inicio), fim: html.length };
}

function itensDaLista(html: string, secao: string, nivelBase: number): ItemFuncao[] {
  const itens: ItemFuncao[] = [];
  const raiz = html.match(/<ul\b[^>]*>/i);
  if (!raiz || raiz.index === undefined) return itens;
  let cursor = raiz.index + raiz[0].length;
  const fim = lerElemento(html, raiz.index, "ul").fim;
  while (cursor < fim) {
    const proximo = html.slice(cursor, fim).search(/<li\b/i);
    if (proximo < 0) break;
    const bloco = lerElemento(html, cursor + proximo, "li");
    const miolo = bloco.html.replace(/^<li\b[^>]*>/i, "").replace(/<\/li>$/i, "");
    const aninhada = miolo.match(/<ul\b/i);
    const proprio = aninhada && aninhada.index !== undefined ? miolo.slice(0, aninhada.index) : miolo;
    const texto = textoPlano(proprio).replace(/^[-–]\s*/, "");
    const sufixo = texto.match(/:\s*([^:]+)$/);
    const classificacao = classificarResponsavel(sufixo?.[1] ?? "");
    const parceiro = ehParceiro(texto);
    const marcado = parceiro || classificacao.marcado;
    const flags = parceiro
      ? { analista: true, assistente: true }
      : { analista: classificacao.analista, assistente: classificacao.assistente };
    if (texto) {
      itens.push({
        secao,
        atividade: sufixo && marcado ? texto.slice(0, sufixo.index).trim() : texto,
        descricao: "",
        nivel: nivelBase,
        analista: flags.analista,
        assistente: flags.assistente,
      });
    }
    if (aninhada && aninhada.index !== undefined) itens.push(...itensDaLista(miolo.slice(aninhada.index), secao, nivelBase + 1));
    cursor = bloco.fim;
  }
  return itens;
}

function marcarHerdados(itens: ItemFuncao[]) {
  const pilha: ItemFuncao[] = [];
  const comPai = itens.map((item) => {
    while (pilha.length && (pilha.at(-1)?.nivel ?? 0) >= item.nivel) pilha.pop();
    const pai = pilha.at(-1);
    const proprio = item.analista || item.assistente;
    const resultado = proprio || !pai
      ? item
      : { ...item, analista: pai.analista, assistente: pai.assistente };
    pilha.push(resultado);
    return resultado;
  });
  const manter = comPai.map(() => false);
  comPai.forEach((item, indice) => {
    if (!item.analista && !item.assistente) return;
    manter[indice] = true;
    let nivel = item.nivel;
    for (let anterior = indice - 1; anterior >= 0; anterior -= 1) {
      const candidato = comPai[anterior];
      if (!candidato || candidato.secao !== item.secao) break;
      if (candidato.nivel < nivel) {
        manter[anterior] = true;
        nivel = candidato.nivel;
      }
    }
  });
  return comPai.filter((_, indice) => manter[indice]);
}

export function extrairItensOrganograma(html: string): ItemFuncao[] {
  const itens: ItemFuncao[] = [];
  let secao = "";
  let cursor = 0;
  while (cursor < html.length) {
    const resto = html.slice(cursor);
    const titulo = resto.match(/^[\s\S]*?<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
    const tabela = resto.match(/^[\s\S]*?<table[\s\S]*?<\/table>/i);
    const lista = resto.match(/^[\s\S]*?<ul[^>]*>/i);
    const candidatos = [
      titulo ? { tipo: "titulo" as const, indice: titulo.index ?? 0, tamanho: titulo[0].length, titulo } : null,
      tabela ? { tipo: "tabela" as const, indice: tabela.index ?? 0, tamanho: tabela[0].length, tabela } : null,
      lista ? { tipo: "lista" as const, indice: lista.index ?? 0, tamanho: lista[0].length, lista } : null,
    ].filter((item) => item !== null).sort((a, b) => a.indice - b.indice);
    const proximo = candidatos[0];
    if (!proximo) break;
    if (proximo.tipo === "titulo" && proximo.titulo) {
      secao = textoPlano(proximo.titulo[2] ?? "");
      cursor += proximo.indice + proximo.tamanho;
      continue;
    }
    if (proximo.tipo === "tabela" && proximo.tabela) {
      itens.push(...itensDaTabela(proximo.tabela[0], secao));
      cursor += proximo.indice + proximo.tamanho;
      continue;
    }
    const bloco = lerLista(html, cursor + proximo.indice);
    itens.push(...marcarHerdados(itensDaLista(bloco.html, secao, 0)));
    cursor = bloco.fim;
  }
  return itens;
}

function escapar(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlDaSecao(itens: ItemFuncao[]) {
  const render = (lista: ItemFuncao[], inicio: number, nivel: number): { html: string; fim: number } => {
    let html = "";
    let cursor = inicio;
    while (cursor < lista.length && (lista[cursor]?.nivel ?? 0) === nivel) {
      const item = lista[cursor];
      if (!item) break;
      const filhos = render(lista, cursor + 1, nivel + 1);
      const rotulo = item.atividade.endsWith(":") ? `<strong>${escapar(item.atividade)}</strong>` : escapar(item.atividade);
      html += `<li><p>${rotulo}</p>${filhos.html}</li>`;
      cursor = filhos.fim;
    }
    return { html: html ? `<ul>${html}</ul>` : "", fim: cursor };
  };
  return render(itens, 0, 0).html;
}

export function htmlOrganizado(itens: ItemFuncao[]) {
  const grupos: { secao: string; itens: ItemFuncao[] }[] = [];
  for (const item of itens) {
    const atual = grupos.at(-1);
    if (!atual || atual.secao !== item.secao) grupos.push({ secao: item.secao, itens: [item] });
    else atual.itens.push(item);
  }
  return grupos.map((grupo) => `${grupo.secao ? `<h2>${escapar(grupo.secao)}</h2>` : ""}${htmlDaSecao(grupo.itens)}`).join("");
}

function filtrarCargo(itens: ItemFuncao[], cargo: CargoMicroarea) {
  const escolhidos: ItemFuncao[] = [];
  itens.forEach((item, indice) => {
    const serve = cargo === "Analista" ? item.analista : item.assistente;
    if (!serve) return;
    const pai = [...itens.slice(0, indice)].reverse().find((anterior) => anterior.nivel < item.nivel && anterior.secao === item.secao);
    if (pai && !escolhidos.includes(pai)) escolhidos.push({ ...pai, analista: true, assistente: true });
    escolhidos.push(item);
  });
  return escolhidos;
}

function microareaDoNo(no: NoOrganograma, porId: Map<string, NoOrganograma>): Microarea | null {
  let atual: NoOrganograma | undefined = no;
  const vistos = new Set<string>();
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    const area = MICROAREAS.find((microarea) => normalizar(microarea) === normalizar(atual?.titulo ?? ""));
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
    const secaoInicial = no.titulo.trim() && normalizar(no.titulo) !== normalizar(area) ? no.titulo.trim() : "";
    atuais.push(...extrairItensOrganograma(no.conteudo).map((item) => ({ ...item, secao: item.secao || secaoInicial })));
    porArea.set(area, atuais);
  }

  return funcoes.map((funcao) => {
    if (funcao.cargo === "Gestor") return funcao;
    const itens = filtrarCargo(porArea.get(funcao.microarea) ?? [], funcao.cargo as CargoMicroarea);
    if (!itens.length) return funcao;
    return { ...funcao, funcoes_html: htmlOrganizado(itens) };
  });
}
