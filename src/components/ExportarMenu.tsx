import { Download, FileSpreadsheet, FileText, Presentation, Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  exportarDocumento,
  exportarLista,
  type ColunaExportacao,
  type FormatoExportacao,
  type SecaoExportacao,
} from "@/lib/exportar";

type PropsComuns = {
  size?: "default" | "sm";
  variant?: "default" | "outline" | "secondary";
  label?: string;
  formatos?: FormatoExportacao[];
};

export function ExportarMenu({
  titulo,
  colunas,
  linhas,
  size = "default",
  variant = "outline",
  label = "Exportar",
  formatos = ["pdf", "xlsx", "pptx", "csv"],
}: PropsComuns & { titulo: string; colunas: ColunaExportacao[]; linhas: Record<string, unknown>[] }) {
  async function exportar(formato: FormatoExportacao) {
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

  return <MenuExportacao size={size} variant={variant} label={label} formatos={formatos} onExportar={exportar} />;
}

export function ExportarDocumentoMenu({
  titulo,
  secoes,
  size = "default",
  variant = "outline",
  label = "Exportar",
  formatos = ["pdf", "xlsx", "pptx"],
}: PropsComuns & { titulo: string; secoes: SecaoExportacao[] }) {
  async function exportar(formato: FormatoExportacao) {
    if (!secoes.some((s) => s.linhas.length > 0)) {
      toast.error("Não há dados para exportar");
      return;
    }
    try {
      await exportarDocumento(formato, titulo, secoes);
      toast.success(`Arquivo ${formato.toUpperCase()} gerado`);
    } catch (erro) {
      toast.error("Não foi possível exportar", { description: erro instanceof Error ? erro.message : undefined });
    }
  }

  return <MenuExportacao size={size} variant={variant} label={label} formatos={formatos} onExportar={exportar} />;
}

function MenuExportacao({
  size = "default",
  variant = "outline",
  label = "Exportar",
  formatos = ["pdf", "xlsx", "pptx", "csv"],
  onExportar,
}: {
  size?: "default" | "sm";
  variant?: "default" | "outline" | "secondary";
  label?: string;
  formatos?: FormatoExportacao[];
  onExportar: (formato: FormatoExportacao) => void;
}) {
  const lista = formatos ?? ["pdf", "xlsx", "pptx", "csv"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="mr-2 h-4 w-4" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {lista.includes("pdf") && (
          <DropdownMenuItem onClick={() => onExportar("pdf")}>
            <FileText /> PDF
          </DropdownMenuItem>
        )}
        {lista.includes("xlsx") && (
          <DropdownMenuItem onClick={() => onExportar("xlsx")}>
            <FileSpreadsheet /> Excel (.xlsx)
          </DropdownMenuItem>
        )}
        {lista.includes("pptx") && (
          <DropdownMenuItem onClick={() => onExportar("pptx")}>
            <Presentation /> PowerPoint (.pptx)
          </DropdownMenuItem>
        )}
        {lista.includes("csv") && (
          <DropdownMenuItem onClick={() => onExportar("csv")}>
            <Sheet /> CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
