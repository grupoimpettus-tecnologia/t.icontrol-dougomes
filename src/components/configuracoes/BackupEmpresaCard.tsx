import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportarBackupEmpresa, exportarPaginaBackupEmpresa, restaurarBackupEmpresa } from "@/lib/backup.functions";
import { montarArquivoBackup } from "@/lib/backup-export";

export function BackupEmpresaCard({
  workspaceId,
  nome,
  slug,
  podeGerir,
}: {
  workspaceId: string | undefined;
  nome: string;
  slug: string;
  podeGerir: boolean;
}) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [backup, setBackup] = useState<unknown>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [linhasLidas, setLinhasLidas] = useState(0);
  const [arquivoPronto, setArquivoPronto] = useState<Blob | null>(null);
  const exportar = useServerFn(exportarBackupEmpresa);
  const exportarPagina = useServerFn(exportarPaginaBackupEmpresa);
  const restaurar = useServerFn(restaurarBackupEmpresa);

  const download = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Selecione uma empresa.");
      setArquivoPronto(null);
      setLinhasLidas(0);
      const cabecalho = await exportar({ data: { workspaceId } });
      return montarArquivoBackup(cabecalho,
        (pedido) => exportarPagina({ data: { ...pedido, workspaceId, geradoEm: cabecalho.gerado_em } }),
        (total) => setLinhasLidas(total),
      );
    },
    onSuccess: (arquivo) => {
      setArquivoPronto(arquivo);
      toast.success("Backup pronto para baixar");
    },
    onError: (erro: Error) => toast.error("Não foi possível gerar o backup", { description: erro.message }),
  });

  function baixarArquivo() {
    if (!arquivoPronto) return;
    const url = URL.createObjectURL(arquivoPronto);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticontrol-backup-${slug || "empresa"}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  const aplicar = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !backup) throw new Error("Escolha um arquivo de backup.");
      return restaurar({
        data: { workspaceId, confirmacao, backup: backup as never },
      });
    },
    onSuccess: () => {
      setAberto(false);
      toast.success("Backup restaurado. A página vai recarregar.");
      window.setTimeout(() => window.location.reload(), 600);
    },
    onError: (erro: Error) => toast.error("Não foi possível restaurar", { description: erro.message }),
  });

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    try {
      const texto = await arquivo.text();
      const json = JSON.parse(texto) as { formato?: string; workspace?: { nome?: string } };
      if (json.formato !== "ticontrol-backup") throw new Error("Arquivo não é um backup do TIControl.");
      setBackup(json);
      setNomeArquivo(arquivo.name);
      setConfirmacao("");
      setAberto(true);
    } catch (erro) {
      setBackup(null);
      toast.error("Arquivo inválido", {
        description: erro instanceof Error ? erro.message : "Não foi possível ler o JSON.",
      });
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Backup</CardTitle>
        <CardDescription>
          Baixe ou restaure os dados desta empresa: monitoramento, equipamentos, acessos, PDV, telefonia, organograma e histórico.
          Contas, senhas e outras empresas não entram no arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {podeGerir && workspaceId ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => arquivoPronto ? baixarArquivo() : download.mutate()} disabled={download.isPending}>
              <Download className="mr-2 h-4 w-4" />
              {download.isPending ? `Gerando… ${linhasLidas.toLocaleString("pt-BR")} registros` : arquivoPronto ? "Salvar backup pronto" : "Baixar backup"}
            </Button>
            <Button variant="outline" onClick={() => arquivoRef.current?.click()} disabled={aplicar.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              Restaurar backup
            </Button>
            <input
              ref={arquivoRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(evento) => {
                void escolherArquivo(evento.target.files?.[0]);
                evento.target.value = "";
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Só o master ou o administrador desta empresa pode gerar ou restaurar o backup.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          O arquivo contém tokens de monitoramento e deve ficar guardado. A restauração substitui os dados de {nome || "esta empresa"} e mantém o seu acesso.
        </p>
      </CardContent>

      <AlertDialog open={aberto} onOpenChange={(abertoAgora) => !aplicar.isPending && setAberto(abertoAgora)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup</AlertDialogTitle>
            <AlertDialogDescription>
              {nomeArquivo ? `Arquivo ${nomeArquivo}. ` : ""}
              Isso substitui os dados atuais de {nome}. Digite o nome da empresa para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirma-backup">Nome da empresa</Label>
            <Input
              id="confirma-backup"
              value={confirmacao}
              autoComplete="off"
              onChange={(evento) => setConfirmacao(evento.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aplicar.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={aplicar.isPending || confirmacao.trim() !== nome.trim()}
              onClick={() => aplicar.mutate()}
            >
              {aplicar.isPending ? "Restaurando..." : "Restaurar agora"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
