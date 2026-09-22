type LinhaExportacao = Record<string, unknown>;

export type ColunaExportacao = {
  chave: string;
  titulo: string;
};

function texto(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function nomeSeguro(nome: string) {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportarLista(
  formato: "pdf" | "xlsx" | "csv",
  titulo: string,
  colunas: ColunaExportacao[],
  linhas: LinhaExportacao[],
) {
  const cabecalhos = colunas.map((coluna) => coluna.titulo);
  const dados = linhas.map((linha) => colunas.map((coluna) => texto(linha[coluna.chave])));
  const base = `${nomeSeguro(titulo)}-${new Date().toISOString().slice(0, 10)}`;

  if (formato === "csv") {
    const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
    const conteudo = [cabecalhos, ...dados].map((linha) => linha.map(escapar).join(";")).join("\n");
    baixar(new Blob([`\uFEFF${conteudo}`], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
    return;
  }

  if (formato === "xlsx") {
    const XLSX = await import("xlsx");
    const planilha = XLSX.utils.aoa_to_sheet([cabecalhos, ...dados]);
    planilha["!cols"] = colunas.map((coluna, indice) => ({
      wch: Math.min(42, Math.max(coluna.titulo.length + 2, ...dados.map((linha) => linha[indice]?.length ?? 0))),
    }));
    const arquivo = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(arquivo, planilha, "Dados");
    XLSX.writeFile(arquivo, `${base}.xlsx`);
    return;
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const documento = new jsPDF({ orientation: colunas.length > 6 ? "landscape" : "portrait" });
  documento.setFontSize(16);
  documento.text(titulo, 14, 16);
  documento.setFontSize(9);
  documento.text(`Exportado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  autoTable(documento, { head: [cabecalhos], body: dados, startY: 27, styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [8, 145, 178] } });
  documento.save(`${base}.pdf`);
}