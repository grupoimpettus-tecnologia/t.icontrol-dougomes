import { Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportarLista, type ColunaExportacao } from "@/lib/exportar";

export function ExportarMenu({ titulo, colunas, linhas }: { titulo: string; colunas: ColunaExportacao[]; linhas: Record<string, unknown>[] }) {
  async function exportar(formato: "pdf" | "xlsx" | "csv") {
    if (!linhas.length) {
      toast.error("Não há dados para exportar");
      return;
    }
    try {
      await exportarLista(formato, titulo, colunas, linhas);
      toast.success(`Arquivo ${formato.toUpperCase()} gerado`);
    } catch (erro) {
      toast.error("Não foi possível exportar", { description: erro instanceof Error ? erro.message : undefined });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportar("pdf")}><FileText /> PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportar("xlsx")}><FileSpreadsheet /> Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportar("csv")}><Sheet /> CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}