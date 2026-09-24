type LinhaExportacao = Record<string, unknown>;

export type ColunaExportacao = {
  chave: string;
  titulo: string;
};

export type SecaoExportacao = {
  titulo: string;
  colunas: ColunaExportacao[];
  linhas: LinhaExportacao[];
};

export type FormatoExportacao = "pdf" | "xlsx" | "csv" | "pptx";

export function textoExportacao(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function nomePlanilha(titulo: string, usados: Set<string>) {
  let base = titulo.replace(/[\\/?*[\]]/g, " ").trim().slice(0, 28) || "Secao";
  let nome = base;
  let i = 2;
  while (usados.has(nome.toLowerCase())) {
    const sufixo = ` (${i})`;
    nome = `${base.slice(0, 31 - sufixo.length)}${sufixo}`;
    i += 1;
  }
  usados.add(nome.toLowerCase());
  return nome;
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function matrizSecao(secao: SecaoExportacao) {
  const cabecalhos = secao.colunas.map((coluna) => coluna.titulo);
  const dados = secao.linhas.map((linha) => secao.colunas.map((coluna) => textoExportacao(linha[coluna.chave])));
  return { cabecalhos, dados };
}

export async function exportarLista(
  formato: FormatoExportacao,
  titulo: string,
  colunas: ColunaExportacao[],
  linhas: LinhaExportacao[],
) {
  await exportarDocumento(formato, titulo, [{ titulo, colunas, linhas }]);
}

export async function exportarDocumento(
  formato: FormatoExportacao,
  titulo: string,
  secoes: SecaoExportacao[],
) {
  const validas = secoes.filter((s) => s.linhas.length > 0);
  if (!validas.length) throw new Error("Não há dados para exportar");

  const base = `${nomeSeguro(titulo)}-${new Date().toISOString().slice(0, 10)}`;
  const dataHora = new Date().toLocaleString("pt-BR");

  if (formato === "csv") {
    const partes = validas.map((secao) => {
      const { cabecalhos, dados } = matrizSecao(secao);
      const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
      return [`# ${secao.titulo}`, cabecalhos.map(escapar).join(";"), ...dados.map((linha) => linha.map(escapar).join(";"))].join("\n");
    });
    baixar(new Blob([`\uFEFF${partes.join("\n\n")}`], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
    return;
  }

  if (formato === "xlsx") {
    const XLSX = await import("xlsx");
    const arquivo = XLSX.utils.book_new();
    const usados = new Set<string>();
    for (const secao of validas) {
      const { cabecalhos, dados } = matrizSecao(secao);
      const planilha = XLSX.utils.aoa_to_sheet([cabecalhos, ...dados]);
      planilha["!cols"] = secao.colunas.map((coluna, indice) => ({
        wch: Math.min(60, Math.max(coluna.titulo.length + 2, ...dados.map((linha) => Math.min(60, linha[indice]?.length ?? 0)))),
      }));
      XLSX.utils.book_append_sheet(arquivo, planilha, nomePlanilha(secao.titulo, usados));
    }
    XLSX.writeFile(arquivo, `${base}.xlsx`);
    return;
  }

  if (formato === "pptx") {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.author = "TIControl";
    pptx.title = titulo;
    pptx.subject = "Overviewer do time";

    const capa = pptx.addSlide();
    capa.addText(titulo, { x: 0.5, y: 2.2, w: 9, h: 1, fontSize: 28, bold: true, color: "0F172A" });
    capa.addText(`Exportado em ${dataHora}`, { x: 0.5, y: 3.2, w: 9, h: 0.4, fontSize: 14, color: "64748B" });
    capa.addText(`${validas.length} visão(ões)`, { x: 0.5, y: 3.7, w: 9, h: 0.4, fontSize: 12, color: "0891B2" });

    for (const secao of validas) {
      const { cabecalhos, dados } = matrizSecao(secao);
      const porSlide = Math.max(1, Math.min(8, Math.floor(40 / Math.max(1, cabecalhos.length))));
      for (let i = 0; i < dados.length; i += porSlide) {
        const fatia = dados.slice(i, i + porSlide);
        const slide = pptx.addSlide();
        slide.addText(secao.titulo, { x: 0.4, y: 0.25, w: 9.2, h: 0.45, fontSize: 16, bold: true, color: "0F172A" });
        if (dados.length > porSlide) {
          slide.addText(`Parte ${Math.floor(i / porSlide) + 1} de ${Math.ceil(dados.length / porSlide)}`, {
            x: 0.4,
            y: 0.65,
            w: 9.2,
            h: 0.25,
            fontSize: 10,
            color: "64748B",
          });
        }
        slide.addTable(
          [
            cabecalhos.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: "0891B2" } } })),
            ...fatia.map((linha) => linha.map((celula) => ({ text: celula.slice(0, 500) }))),
          ],
          {
            x: 0.3,
            y: dados.length > porSlide ? 1.0 : 0.85,
            w: 9.4,
            colW: cabecalhos.map(() => 9.4 / cabecalhos.length),
            border: { type: "solid", pt: 0.5, color: "CBD5E1" },
            fontSize: cabecalhos.length > 4 ? 8 : 10,
            color: "334155",
            align: "left",
            valign: "top",
          },
        );
      }
    }

    await pptx.writeFile({ fileName: `${base}.pptx` });
    return;
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const muitasColunas = validas.some((s) => s.colunas.length > 5);
  const documento = new jsPDF({ orientation: muitasColunas ? "landscape" : "portrait" });
  documento.setFontSize(16);
  documento.text(titulo, 14, 16);
  documento.setFontSize(9);
  documento.text(`Exportado em ${dataHora}`, 14, 22);

  let inicio = 28;
  validas.forEach((secao, indice) => {
    if (indice > 0) {
      documento.addPage();
      inicio = 16;
    }
    const { cabecalhos, dados } = matrizSecao(secao);
    documento.setFontSize(12);
    documento.text(secao.titulo, 14, inicio);
    autoTable(documento, {
      head: [cabecalhos],
      body: dados,
      startY: inicio + 4,
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [8, 145, 178] },
      columnStyles: Object.fromEntries(secao.colunas.map((_, i) => [i, { cellWidth: "auto" }])),
    });
  });

  documento.save(`${base}.pdf`);
}
