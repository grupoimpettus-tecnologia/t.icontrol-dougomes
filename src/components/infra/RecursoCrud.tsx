import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilterX, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { cn } from "@/lib/utils";
import { EditorFormatado } from "@/components/infra/EditorFormatado";
import { ExportarMenu } from "@/components/ExportarMenu";

export type CampoTipo =
  | "texto"
  | "textarea"
  | "editor"
  | "numero"
  | "inteiro"
  | "booleano"
  | "data"
  | "select";

export type Registro = Record<string, unknown> & { id: string };

export type Campo = {
  nome: string;
  label: string;
  tipo?: CampoTipo;
  placeholder?: string;
  naTabela?: boolean;
  larguraCompleta?: boolean;
  opcoes?: string[];
  render?: (item: Registro) => React.ReactNode;
};

export type ColunaExtra = {
  chave: string;
  titulo: string;
  render: (item: Registro) => React.ReactNode;
  valorExport?: (item: Registro) => string;
};

const FILTRO_TODAS = "__todas__";
const FILTRO_VAZIO = "__vazio__";
const FILTRO_COLUNA_NENHUMA = "__nenhuma__";

function formatarValor(valor: unknown, tipo: CampoTipo) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (tipo === "booleano") return valor ? "Sim" : "Não";
  if (tipo === "numero")
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (tipo === "inteiro") return Number(valor).toLocaleString("pt-BR");
  if (tipo === "data") return new Date(String(valor)).toLocaleDateString("pt-BR");
  return String(valor);
}

function valorColuna(
  item: Registro,
  chave: string,
  campos: Campo[],
  colunasExtras: ColunaExtra[],
) {
  const extra = colunasExtras.find((c) => c.chave === chave);
  if (extra) {
    const exportado = extra.valorExport?.(item);
    if (exportado !== undefined) return exportado.trim() === "" ? "" : exportado;
  }
  const campo = campos.find((c) => c.nome === chave);
  const bruto = item[chave];
  if (bruto === null || bruto === undefined || bruto === "") return "";
  if (campo?.tipo === "booleano") return bruto ? "Sim" : "Não";
  if (campo?.tipo === "numero")
    return Number(bruto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (campo?.tipo === "inteiro") return Number(bruto).toLocaleString("pt-BR");
  if (campo?.tipo === "data") return new Date(String(bruto)).toLocaleDateString("pt-BR");
  return String(bruto);
}

export function RecursoCrud({
  titulo,
  descricao,
  tabela,
  campos,
  campoTitulo,
  ordenarPor,
  rotuloItem,
  colunasExtras = [],
  acoesExtras,
  atualizarACada,
}: {
  titulo: string;
  descricao: string;
  tabela: "access_entries" | "service_assets" | "equipments" | "phone_lines" | "phone_stock";
  campos: Campo[];
  campoTitulo: string;
  ordenarPor: string;
  /** @deprecated Mantido por compatibilidade; o filtro por coluna substituiu o agrupamento em pills. */
  campoGrupo?: string;
  rotuloItem: string;
  colunasExtras?: ColunaExtra[];
  acoesExtras?: (item: Registro) => React.ReactNode;
  /** @deprecated Mantido por compatibilidade; o filtro por coluna substituiu as pills extras. */
  filtroExtra?: {
    opcoes: { valor: string; rotulo: string }[];
    predicado: (item: Registro, valor: string) => boolean;
  };
  atualizarACada?: number;
}) {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const podeEditar = atual ? ["master", "admin", "tecnico"].includes(atual.role) : false;
  const podeExcluir = atual ? ["master", "admin"].includes(atual.role) : false;
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [filtroColuna, setFiltroColuna] = useState<string>(FILTRO_COLUNA_NENHUMA);
  const [filtroValor, setFiltroValor] = useState<string>(FILTRO_TODAS);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Registro | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const chave = [tabela, workspaceId];
  const colunas = campos.filter((c) => c.naTabela !== false);

  const colunasFiltro = useMemo(
    () => [
      ...colunas.map((c) => ({ chave: c.nome, titulo: c.label })),
      ...colunasExtras.map((c) => ({ chave: c.chave, titulo: c.titulo })),
    ],
    [colunas, colunasExtras],
  );

  const lista = useQuery({
    queryKey: chave,
    enabled: !!workspaceId,
    refetchInterval: atualizarACada ?? false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order(ordenarPor);
      if (error) throw error;
      return (data ?? []) as Registro[];
    },
  });

  const valoresFiltro = useMemo(() => {
    if (!filtroColuna || filtroColuna === FILTRO_COLUNA_NENHUMA) return [];
    const set = new Set<string>();
    let temVazio = false;
    for (const item of lista.data ?? []) {
      const valor = valorColuna(item, filtroColuna, campos, colunasExtras);
      if (!valor) temVazio = true;
      else set.add(valor);
    }
    const ordenados = [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return temVazio ? [FILTRO_VAZIO, ...ordenados] : ordenados;
  }, [lista.data, filtroColuna, campos, colunasExtras]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lista.data ?? []).filter((item) => {
      if (filtroColuna !== FILTRO_COLUNA_NENHUMA && filtroValor !== FILTRO_TODAS) {
        const valor = valorColuna(item, filtroColuna, campos, colunasExtras);
        if (filtroValor === FILTRO_VAZIO) {
          if (valor) return false;
        } else if (valor !== filtroValor) {
          return false;
        }
      }
      if (!termo) return true;
      return campos.some((c) =>
        String(item[c.nome] ?? "")
          .toLowerCase()
          .includes(termo),
      );
    });
  }, [lista.data, busca, campos, filtroColuna, filtroValor, colunasExtras]);

  function limparFiltroColuna() {
    setFiltroColuna(FILTRO_COLUNA_NENHUMA);
    setFiltroValor(FILTRO_TODAS);
  }

  function abrirNovo() {
    setEditando(null);
    setForm({});
    setAberto(true);
  }

  function abrirEdicao(item: Registro) {
    setEditando(item);
    const inicial: Record<string, unknown> = {};
    for (const c of campos) inicial[c.nome] = item[c.nome] ?? (c.tipo === "booleano" ? false : "");
    setForm(inicial);
    setAberto(true);
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const c of campos) {
        const bruto = form[c.nome];
        if (c.tipo === "booleano") payload[c.nome] = !!bruto;
        else if (c.tipo === "numero" || c.tipo === "inteiro")
          payload[c.nome] = bruto === "" || bruto === undefined ? null : Number(bruto);
        else payload[c.nome] = bruto === "" || bruto === undefined ? null : String(bruto);
      }
      if (!payload[campoTitulo]) throw new Error("Informe o nome do registro.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from(tabela) as any;
      if (editando) {
        const { error } = await query
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await query.insert({ ...payload, workspace_id: workspaceId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Registro atualizado" : `${rotuloItem} cadastrado`);
      setAberto(false);
      queryClient.invalidateQueries({ queryKey: chave });
    },
    onError: (erro: Error) => toast.error("Não foi possível salvar", { description: erro.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído");
      queryClient.invalidateQueries({ queryKey: chave });
    },
    onError: (erro: Error) => toast.error("Não foi possível excluir", { description: erro.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportarMenu
            titulo={titulo}
            colunas={[
              ...colunas.map((campo) => ({ chave: campo.nome, titulo: campo.label })),
              ...colunasExtras.map((c) => ({ chave: c.chave, titulo: c.titulo })),
            ]}
            linhas={filtrados.map((item) => {
              const extra: Record<string, unknown> = { ...item };
              for (const c of colunasExtras) extra[c.chave] = c.valorExport?.(item) ?? "";
              return extra as Registro;
            })}
          />
          {podeEditar && (
            <Button onClick={abrirNovo}>
              <Plus className="mr-2 h-4 w-4" />
              Novo {rotuloItem.toLowerCase()}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Filtrar por coluna</Label>
          <Select
            value={filtroColuna}
            onValueChange={(valor) => {
              setFiltroColuna(valor);
              setFiltroValor(FILTRO_TODAS);
            }}
          >
            <SelectTrigger className="w-[11rem]">
              <SelectValue placeholder="Coluna..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_COLUNA_NENHUMA}>Coluna...</SelectItem>
              {colunasFiltro.map((coluna) => (
                <SelectItem key={coluna.chave} value={coluna.chave}>
                  {coluna.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Valor</Label>
          <Select
            value={filtroValor}
            onValueChange={setFiltroValor}
            disabled={filtroColuna === FILTRO_COLUNA_NENHUMA}
          >
            <SelectTrigger className="w-[12rem]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_TODAS}>Todos</SelectItem>
              {valoresFiltro.map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {valor === FILTRO_VAZIO ? "(em branco)" : valor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtroColuna !== FILTRO_COLUNA_NENHUMA && (
          <Button type="button" variant="outline" size="sm" onClick={limparFiltroColuna}>
            <FilterX className="mr-2 h-4 w-4" />
            Limpar filtro
          </Button>
        )}

        <Badge variant="secondary" className="mb-0.5">
          {filtrados.length} registros
        </Badge>
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="app-scrollbar overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map((c) => (
                    <TableHead key={c.nome}>{c.label}</TableHead>
                  ))}
                  {colunasExtras.map((c) => (
                    <TableHead key={c.chave}>{c.titulo}</TableHead>
                  ))}
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={colunas.length + colunasExtras.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Carregando...
                    </TableCell>
                  </TableRow>
                )}
                {!lista.isLoading && filtrados.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={colunas.length + colunasExtras.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((item) => (
                  <TableRow key={item.id}>
                    {colunas.map((c) => (
                      <TableCell
                        key={c.nome}
                        className={cn(
                          "max-w-[18rem] truncate",
                          c.nome === campoTitulo && "font-medium text-foreground",
                        )}
                        title={String(item[c.nome] ?? "")}
                      >
                        {c.render
                          ? c.render(item)
                          : formatarValor(item[c.nome], c.tipo ?? "texto")}
                      </TableCell>
                    ))}
                    {colunasExtras.map((c) => (
                      <TableCell key={c.chave}>{c.render(item)}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {acoesExtras?.(item)}
                        {podeEditar && (
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {podeExcluir && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Excluir este registro?")) excluir.mutate(item.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar ${rotuloItem.toLowerCase()}` : `Novo ${rotuloItem.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {campos.map((c) => {
              const tipo = c.tipo ?? "texto";
              const valor = form[c.nome];
              return (
                <div
                  key={c.nome}
                  className={cn(
                    "space-y-2",
                    (tipo === "textarea" || tipo === "editor" || c.larguraCompleta) && "sm:col-span-2",
                  )}
                >
                  <Label htmlFor={c.nome}>{c.label}</Label>
                  {tipo === "editor" ? (
                    <EditorFormatado
                      id={c.nome}
                      value={String(valor ?? "")}
                      onChange={(conteudo) => setForm((f) => ({ ...f, [c.nome]: conteudo }))}
                      placeholder={c.placeholder}
                    />
                  ) : tipo === "textarea" ? (
                    <Textarea
                      id={c.nome}
                      rows={4}
                      value={String(valor ?? "")}
                      onChange={(e) => setForm((f) => ({ ...f, [c.nome]: e.target.value }))}
                      placeholder={c.placeholder}
                    />
                  ) : tipo === "booleano" ? (
                    <div className="flex h-10 items-center">
                      <Switch
                        id={c.nome}
                        checked={!!valor}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, [c.nome]: v }))}
                      />
                    </div>
                  ) : tipo === "select" ? (
                    <select
                      id={c.nome}
                      value={String(valor ?? "")}
                      onChange={(e) => setForm((f) => ({ ...f, [c.nome]: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Selecione...</option>
                      {(c.opcoes ?? []).map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={c.nome}
                      type={
                        tipo === "numero" || tipo === "inteiro"
                          ? "number"
                          : tipo === "data"
                            ? "date"
                            : "text"
                      }
                      step={tipo === "numero" ? "0.01" : tipo === "inteiro" ? "1" : undefined}
                      value={String(valor ?? "")}
                      onChange={(e) => setForm((f) => ({ ...f, [c.nome]: e.target.value }))}
                      placeholder={c.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
