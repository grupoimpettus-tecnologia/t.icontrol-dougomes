import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  abrirAnexo,
  baixarAnexo,
  formatarTamanho,
  podeVisualizar,
  BUCKET_ANEXOS,
} from "@/lib/anexos";
import { supabase } from "@/integrations/supabase/client";

type AnexoSelecionado = { path: string; nome: string; tipo: string; tamanho: number };

function ehImagem(tipo: string, nome: string) {
  return (tipo || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(nome);
}

function ehPdf(tipo: string, nome: string) {
  return (tipo || "").toLowerCase() === "application/pdf" || /\.pdf$/i.test(nome);
}

/** Renderiza HTML do editor rico e abre pré-visualização ao clicar em anexos. */
export function ConteudoRico({ html, className }: { html: string; className?: string }) {
  const [selecionado, setSelecionado] = useState<AnexoSelecionado | null>(null);
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);

  useEffect(() => {
    if (!selecionado) {
      setUrlPreview(null);
      return;
    }
    if (!podeVisualizar(selecionado.tipo, selecionado.nome)) {
      setUrlPreview(null);
      return;
    }
    let cancelado = false;
    setCarregandoPreview(true);
    void (async () => {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_ANEXOS)
          .createSignedUrl(selecionado.path, 60 * 60);
        if (cancelado) return;
        if (error || !data) throw error ?? new Error("Falha ao gerar link");
        setUrlPreview(data.signedUrl);
      } catch {
        if (!cancelado) {
          setUrlPreview(null);
          toast.error("Não foi possível pré-visualizar o arquivo");
        }
      } finally {
        if (!cancelado) setCarregandoPreview(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [selecionado]);

  if (!html?.trim()) {
    return <p className="text-sm text-muted-foreground">Nenhum conteúdo cadastrado neste bloco.</p>;
  }

  return (
    <>
      <div
        className={cn("rich-text-editor prose prose-sm dark:prose-invert max-w-none", className)}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(event) => {
          const alvo = (event.target as HTMLElement).closest<HTMLElement>("[data-anexo]");
          if (!alvo) return;
          event.preventDefault();
          setSelecionado({
            path: alvo.getAttribute("data-anexo") ?? "",
            nome: alvo.getAttribute("data-nome") ?? "arquivo",
            tipo: alvo.getAttribute("data-tipo") ?? "application/octet-stream",
            tamanho: Number(alvo.getAttribute("data-tamanho") ?? 0),
          });
        }}
      />

      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{selecionado?.nome}</DialogTitle>
            <DialogDescription>
              {selecionado && podeVisualizar(selecionado.tipo, selecionado.nome)
                ? "Pré-visualização na aplicação. Você também pode abrir em nova aba ou baixar."
                : "Este formato (Excel e similares) deve ser baixado para abrir no computador."}
              {selecionado?.tamanho ? ` (${formatarTamanho(selecionado.tamanho)})` : ""}
            </DialogDescription>
          </DialogHeader>

          {selecionado && podeVisualizar(selecionado.tipo, selecionado.nome) && (
            <div className="min-h-48 flex-1 overflow-hidden rounded-md border bg-muted/30">
              {carregandoPreview && (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando pré-visualização…
                </div>
              )}
              {!carregandoPreview && urlPreview && ehImagem(selecionado.tipo, selecionado.nome) && (
                <img
                  src={urlPreview}
                  alt={selecionado.nome}
                  className="mx-auto max-h-[60vh] w-auto object-contain p-2"
                />
              )}
              {!carregandoPreview && urlPreview && ehPdf(selecionado.tipo, selecionado.nome) && (
                <iframe title={selecionado.nome} src={urlPreview} className="h-[60vh] w-full border-0" />
              )}
              {!carregandoPreview && !urlPreview && (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-8 w-8" />
                  Não foi possível gerar a pré-visualização.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            {selecionado && podeVisualizar(selecionado.tipo, selecionado.nome) && (
              <Button
                type="button"
                onClick={() => {
                  const alvo = selecionado;
                  setSelecionado(null);
                  abrirAnexo(alvo.path).catch(() => toast.error("Não foi possível abrir o arquivo"));
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const alvo = selecionado;
                setSelecionado(null);
                if (alvo)
                  baixarAnexo(alvo.path, alvo.nome).catch(() =>
                    toast.error("Não foi possível baixar o arquivo"),
                  );
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
