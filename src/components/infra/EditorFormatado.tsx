import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Columns3,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Rows3,
  RemoveFormatting,
  Strikethrough,
  Table2,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  UnderlineIcon,
  Undo2,
  Download,
  ExternalLink,
  Loader2,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
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
import { Anexo } from "@/components/infra/anexo-node";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import {
  abrirAnexo,
  baixarAnexo,
  enviarAnexo,
  formatarTamanho,
  podeVisualizar,
} from "@/lib/anexos";

type EditorFormatadoProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  accept?: string | undefined;
};

function BotaoFerramenta({
  titulo,
  ativo = false,
  desabilitado = false,
  onClick,
  children,
}: {
  titulo: string;
  ativo?: boolean;
  desabilitado?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={ativo ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8 shrink-0"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      disabled={desabilitado}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

type AnexoSelecionado = { path: string; nome: string; tipo: string; tamanho: number };

export function EditorFormatado({ id, value, onChange, placeholder, accept }: EditorFormatadoProps) {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const workspaceRef = useRef<string | undefined>(workspaceId);
  workspaceRef.current = workspaceId;

  const [enviando, setEnviando] = useState(false);
  const [selecionado, setSelecionado] = useState<AnexoSelecionado | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const enviarArquivosRef = useRef<(arquivos: File[]) => void>(() => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: true } }),
      Highlight,
      Anexo,
      Placeholder.configure({
        placeholder: placeholder ?? "Digite, cole ou anexe arquivos aqui...",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        class:
          "rich-text-editor min-h-44 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "aria-label": "Conteúdo da descrição",
      },
      handlePaste: (_view, event) => {
        const arquivos = Array.from(event.clipboardData?.files ?? []);
        if (arquivos.length === 0) return false;
        event.preventDefault();
        enviarArquivosRef.current(arquivos);
        return true;
      },
      handleDrop: (_view, event) => {
        const arquivos = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        if (arquivos.length === 0) return false;
        event.preventDefault();
        enviarArquivosRef.current(arquivos);
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    enviarArquivosRef.current = async (arquivos: File[]) => {
      const empresa = workspaceRef.current;
      if (!editor) return;
      if (!empresa) {
        toast.error("Selecione uma empresa antes de anexar arquivos.");
        return;
      }
      setEnviando(true);
      try {
        for (const arquivo of arquivos) {
          const info = await enviarAnexo(empresa, arquivo);
          editor.chain().focus().inserirAnexo(info).run();
        }
        toast.success(arquivos.length > 1 ? "Arquivos anexados" : "Arquivo anexado");
      } catch (erro) {
        toast.error("Não foi possível anexar o arquivo", {
          description: erro instanceof Error ? erro.message : undefined,
        });
      } finally {
        setEnviando(false);
      }
    };
  }, [editor]);

  if (!editor) return null;
  const currentEditor = editor;

  function aoClicarNoConteudo(event: React.MouseEvent<HTMLDivElement>) {
    const alvo = (event.target as HTMLElement).closest<HTMLElement>("[data-anexo]");
    if (!alvo) return;
    event.preventDefault();
    setSelecionado({
      path: alvo.getAttribute("data-anexo") ?? "",
      nome: alvo.getAttribute("data-nome") ?? "arquivo",
      tipo: alvo.getAttribute("data-tipo") ?? "application/octet-stream",
      tamanho: Number(alvo.getAttribute("data-tamanho") ?? 0),
    });
  }

  function definirLink() {
    const anterior = currentEditor.getAttributes("link")["href"] as string | undefined;
    const href = window.prompt("Informe o endereço do link:", anterior ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      currentEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    currentEditor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  const icone = "h-4 w-4";

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/45 p-1.5">
        <BotaoFerramenta titulo="Desfazer" desabilitado={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Refazer" desabilitado={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className={icone} />
        </BotaoFerramenta>
        <span className="mx-1 h-6 w-px bg-border" />
        <BotaoFerramenta titulo="Texto normal" ativo={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Pilcrow className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Título 1" ativo={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Título 2" ativo={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className={icone} />
        </BotaoFerramenta>
        <span className="mx-1 h-6 w-px bg-border" />
        <BotaoFerramenta titulo="Negrito" ativo={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Itálico" ativo={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Sublinhado" ativo={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Tachado" ativo={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Destaque" ativo={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Link" ativo={editor.isActive("link")} onClick={definirLink}>
          <Link2 className={icone} />
        </BotaoFerramenta>
        <span className="mx-1 h-6 w-px bg-border" />
        <BotaoFerramenta titulo="Lista" ativo={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Lista numerada" ativo={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Citação" ativo={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Código" ativo={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code2 className={icone} />
        </BotaoFerramenta>
        <BotaoFerramenta titulo="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className={icone} />
        </BotaoFerramenta>
        <span className="mx-1 h-6 w-px bg-border" />
        {([
          ["Alinhar à esquerda", "left", AlignLeft],
          ["Centralizar", "center", AlignCenter],
          ["Alinhar à direita", "right", AlignRight],
          ["Justificar", "justify", AlignJustify],
        ] as const).map(([titulo, alinhamento, Icone]) => (
          <BotaoFerramenta
            key={alinhamento}
            titulo={titulo}
            ativo={editor.isActive({ textAlign: alinhamento })}
            onClick={() => editor.chain().focus().setTextAlign(alinhamento).run()}
          >
            <Icone className={icone} />
          </BotaoFerramenta>
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        <BotaoFerramenta titulo="Inserir tabela 3 × 3" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <Table2 className={icone} />
        </BotaoFerramenta>
        {editor.isActive("table") && (
          <>
            <BotaoFerramenta titulo="Adicionar coluna" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns3 className={icone} />
            </BotaoFerramenta>
            <BotaoFerramenta titulo="Excluir coluna" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <Columns3 className={cn(icone, "text-destructive")} />
            </BotaoFerramenta>
            <BotaoFerramenta titulo="Adicionar linha" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Rows3 className={icone} />
            </BotaoFerramenta>
            <BotaoFerramenta titulo="Excluir linha" onClick={() => editor.chain().focus().deleteRow().run()}>
              <Rows3 className={cn(icone, "text-destructive")} />
            </BotaoFerramenta>
            <BotaoFerramenta titulo="Mesclar células" desabilitado={!editor.can().mergeCells()} onClick={() => editor.chain().focus().mergeCells().run()}>
              <TableCellsMerge className={icone} />
            </BotaoFerramenta>
            <BotaoFerramenta titulo="Separar célula" desabilitado={!editor.can().splitCell()} onClick={() => editor.chain().focus().splitCell().run()}>
              <TableCellsSplit className={icone} />
            </BotaoFerramenta>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
              Cabeçalho
            </Button>
            <BotaoFerramenta titulo="Excluir tabela" onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 className={icone} />
            </BotaoFerramenta>
          </>
        )}
        <BotaoFerramenta titulo="Limpar formatação" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className={icone} />
        </BotaoFerramenta>
        <span className="mx-1 h-6 w-px bg-border" />
        <BotaoFerramenta
          titulo="Anexar arquivo"
          desabilitado={enviando}
          onClick={() => inputRef.current?.click()}
        >
          {enviando ? <Loader2 className={cn(icone, "animate-spin")} /> : <Paperclip className={icone} />}
        </BotaoFerramenta>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={
            accept ??
            "image/*,.pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          }
          className="hidden"
          onChange={(e) => {
            const arquivos = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (arquivos.length > 0) enviarArquivosRef.current(arquivos);
          }}
        />
      </div>
      <div onClick={aoClicarNoConteudo}>
        <EditorContent editor={editor} className="min-h-44" />
      </div>

      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate">{selecionado?.nome}</DialogTitle>
            <DialogDescription>
              {selecionado && podeVisualizar(selecionado.tipo, selecionado.nome)
                ? "Abra o arquivo em uma nova aba ou faça o download."
                : "Este formato não pode ser visualizado no navegador — faça o download."}
              {selecionado?.tamanho ? ` (${formatarTamanho(selecionado.tamanho)})` : ""}
            </DialogDescription>
          </DialogHeader>
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
    </div>
  );
}