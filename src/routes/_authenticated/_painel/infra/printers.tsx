import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CORES = ["Preto", "Ciano", "Magenta", "Amarelo"] as const;
type CorToner = (typeof CORES)[number];

const corClasse: Record<CorToner, string> = {
  Preto: "border-neutral-800 bg-neutral-900 text-white",
  Ciano: "border-cyan-600 bg-cyan-500 text-white",
  Magenta: "border-fuchsia-700 bg-fuchsia-600 text-white",
  Amarelo: "border-amber-500 bg-amber-300 text-amber-950",
};

type Impressora = {
  id: string;
  nome: string;
  local: string | null;
  modelo: string | null;
  tipo_contrato: string | null;
  ip: string | null;
};

type Estoque = { printer_id: string; cor: string; quantidade: number };
type Troca = { id: string; cor: string; ocorrido_em: string };

const formVazio = { nome: "", local: "", modelo: "", tipo_contrato: "", ip: "" };

function texto(valor: string | null | undefined) {
  const limpo = valor?.trim();
  return limpo ? limpo : "—";
}

function Impressoras() {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const podeEditar = atual ? ["master", "admin", "tecnico"].includes(atual.role) : false;
  const podeExcluir = atual ? ["master", "admin"].includes(atual.role) : false;
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Impressora | null>(null);
  const [form, setForm] = useState(formVazio);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [corEntrada, setCorEntrada] = useState<CorToner>("Preto");
  const [quantidadeEntrada, setQuantidadeEntrada] = useState("1");
  const [corTroca, setCorTroca] = useState<CorToner>("Preto");

  const lista = useQuery({
    queryKey: ["printers", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("printers")
        .select("id, nome, local, modelo, tipo_contrato, ip")
        .eq("workspace_id", workspaceId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Impressora[];
    },
  });

  const estoque = useQuery({
    queryKey: ["printer-toner-stock", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("printer_toner_stock")
        .select("printer_id, cor, quantidade")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as Estoque[];
    },
  });

  const trocas = useQuery({
    queryKey: ["printer-toner-swaps", selecionadaId],
    enabled: !!selecionadaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("printer_toner_movements")
        .select("id, cor, ocorrido_em")
        .eq("printer_id", selecionadaId!)
        .eq("tipo", "troca")
        .order("ocorrido_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Troca[];
    },
  });

  const selecionada = lista.data?.find((item) => item.id === selecionadaId) ?? null;
  const estoqueDaSelecionada = useMemo(() => {
    const porCor = new Map<string, number>();
    for (const item of estoque.data ?? []) {
      if (item.printer_id === selecionadaId) porCor.set(item.cor, item.quantidade);
    }
    return CORES.map((cor) => ({ cor, quantidade: porCor.get(cor) ?? 0 }));
  }, [estoque.data, selecionadaId]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista.data ?? [];
    return (lista.data ?? []).filter((item) =>
      [item.nome, item.local, item.modelo, item.tipo_contrato, item.ip]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo)),
    );
  }, [lista.data, busca]);

  function abrirNova() {
    setEditando(null);
    setForm(formVazio);
    setFormAberto(true);
  }

  function abrirEdicao(impressora: Impressora) {
    setSelecionadaId(null);
    setEditando(impressora);
    setForm({
      nome: impressora.nome,
      local: impressora.local ?? "",
      modelo: impressora.modelo ?? "",
      tipo_contrato: impressora.tipo_contrato ?? "",
      ip: impressora.ip ?? "",
    });
    setFormAberto(true);
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Selecione uma empresa.");
      const payload = {
        nome: form.nome.trim(),
        local: form.local.trim(),
        modelo: form.modelo.trim(),
        tipo_contrato: form.tipo_contrato.trim(),
        ip: form.ip.trim(),
        updated_at: new Date().toISOString(),
      };
      if (!payload.nome || !payload.local || !payload.modelo || !payload.tipo_contrato || !payload.ip) {
        throw new Error("Preencha nome, local, modelo, tipo de contrato e IP.");
      }
      if (editando) {
        const { error } = await supabase.from("printers").update(payload).eq("id", editando.id);
        if (error) throw error;
        return;
      }
      const { data, error } = await supabase
        .from("printers")
        .insert({ ...payload, workspace_id: workspaceId })
        .select("id")
        .single();
      if (error) throw error;
      const { error: erroEstoque } = await supabase.from("printer_toner_stock").insert(
        CORES.map((cor) => ({
          workspace_id: workspaceId,
          printer_id: data.id,
          cor,
          quantidade: 0,
        })),
      );
      if (erroEstoque) throw erroEstoque;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["printers", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["printer-toner-stock", workspaceId] });
      setFormAberto(false);
      toast.success(editando ? "Impressora atualizada" : "Impressora cadastrada");
    },
    onError: (erro: Error) => toast.error("Não foi possível salvar", { description: erro.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("printers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelecionadaId(null);
      await queryClient.invalidateQueries({ queryKey: ["printers", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["printer-toner-stock", workspaceId] });
      toast.success("Impressora excluída");
    },
    onError: (erro: Error) => toast.error("Não foi possível excluir", { description: erro.message }),
  });

  const movimentar = useMutation({
    mutationFn: async (movimento: { tipo: "entrada" | "troca"; cor: CorToner; quantidade: number }) => {
      if (!selecionadaId) throw new Error("Selecione uma impressora.");
      const { error } = await supabase.rpc("registrar_toner", {
        _printer_id: selecionadaId,
        _cor: movimento.cor,
        _tipo: movimento.tipo,
        _quantidade: movimento.quantidade,
      });
      if (error) throw error;
    },
    onSuccess: async (_resultado, movimento) => {
      await queryClient.invalidateQueries({ queryKey: ["printer-toner-stock", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["printer-toner-swaps", selecionadaId] });
      toast.success(movimento.tipo === "entrada" ? "Entrada de toner registrada" : "Troca de toner registrada");
    },
    onError: (erro: Error) => toast.error("Não foi possível registrar", { description: erro.message }),
  });

  function registrarEntrada() {
    const quantidade = Number(quantidadeEntrada);
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      toast.error("Informe uma quantidade inteira maior que zero.");
      return;
    }
    movimentar.mutate({ tipo: "entrada", cor: corEntrada, quantidade });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Impressoras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro das impressoras da empresa, estoque de toner e histórico de trocas.
          </p>
        </div>
        {podeEditar && (
          <Button onClick={abrirNova}>
            <Plus className="mr-2 h-4 w-4" />
            Nova impressora
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar impressora"
          className="pl-9"
        />
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Tipo de contrato</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((impressora) => (
                <TableRow
                  key={impressora.id}
                  className="cursor-pointer"
                  onClick={() => setSelecionadaId(impressora.id)}
                >
                  <TableCell className="font-medium">{impressora.nome}</TableCell>
                  <TableCell>{texto(impressora.local)}</TableCell>
                  <TableCell>{texto(impressora.modelo)}</TableCell>
                  <TableCell>{texto(impressora.tipo_contrato)}</TableCell>
                  <TableCell>{texto(impressora.ip)}</TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {lista.isLoading ? "Carregando..." : "Nenhuma impressora cadastrada."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar impressora" : "Nova impressora"}</DialogTitle>
            <DialogDescription>Informe os dados da impressora nesta empresa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {(
              [
                ["nome", "Nome da impressora"],
                ["local", "Local"],
                ["modelo", "Modelo"],
                ["tipo_contrato", "Tipo de contrato"],
                ["ip", "IP"],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-2">
                <Label htmlFor={`impressora-${campo}`}>{rotulo}</Label>
                <Input
                  id={`impressora-${campo}`}
                  value={form[campo]}
                  onChange={(evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selecionada} onOpenChange={(aberto) => !aberto && setSelecionadaId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selecionada && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  {selecionada.nome}
                </DialogTitle>
                <DialogDescription>Estoque de toner e histórico de trocas desta impressora.</DialogDescription>
              </DialogHeader>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Local</dt>
                  <dd className="text-sm font-medium">{texto(selecionada.local)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Modelo</dt>
                  <dd className="text-sm font-medium">{texto(selecionada.modelo)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Tipo de contrato</dt>
                  <dd className="text-sm font-medium">{texto(selecionada.tipo_contrato)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">IP</dt>
                  <dd className="text-sm font-medium">{texto(selecionada.ip)}</dd>
                </div>
              </dl>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Estoque de toner</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {estoqueDaSelecionada.map((item) => (
                    <div
                      key={item.cor}
                      className={cn("rounded-xl border px-3 py-4 text-center", corClasse[item.cor])}
                    >
                      <p className="text-3xl font-bold leading-none">{item.quantidade}</p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide">{item.cor}</p>
                    </div>
                  ))}
                </div>
              </div>

              {podeEditar && (
                <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Entrada de estoque</p>
                    <Select value={corEntrada} onValueChange={(valor) => setCorEntrada(valor as CorToner)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CORES.map((cor) => (
                          <SelectItem key={cor} value={cor}>
                            {cor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={quantidadeEntrada}
                      onChange={(evento) => setQuantidadeEntrada(evento.target.value)}
                    />
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={movimentar.isPending}
                      onClick={registrarEntrada}
                    >
                      Registrar entrada
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Registrar troca</p>
                    <Select value={corTroca} onValueChange={(valor) => setCorTroca(valor as CorToner)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CORES.map((cor) => (
                          <SelectItem key={cor} value={cor}>
                            {cor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      A troca consome 1 unidade do estoque da cor escolhida e grava a data e a hora.
                    </p>
                    <Button
                      className="w-full"
                      disabled={movimentar.isPending}
                      onClick={() => movimentar.mutate({ tipo: "troca", cor: corTroca, quantidade: 1 })}
                    >
                      Registrar troca
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Histórico de troca</h2>
                <ul className="divide-y rounded-xl border">
                  {(trocas.data ?? []).map((troca) => (
                    <li key={troca.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <Badge variant="secondary">{troca.cor}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(troca.ocorrido_em).toLocaleString("pt-BR")}
                      </span>
                    </li>
                  ))}
                  {(trocas.data?.length ?? 0) === 0 && (
                    <li className="px-3 py-4 text-sm text-muted-foreground">Nenhuma troca registrada.</li>
                  )}
                </ul>
              </div>

              <DialogFooter>
                {podeEditar && (
                  <Button variant="outline" onClick={() => abrirEdicao(selecionada)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                )}
                {podeExcluir && (
                  <Button
                    variant="destructive"
                    disabled={excluir.isPending}
                    onClick={() => {
                      if (window.confirm(`Excluir a impressora ${selecionada.nome}? O estoque e o histórico também serão removidos.`)) {
                        excluir.mutate(selecionada.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/_painel/infra/printers")({
  head: () => ({
    meta: [
      { title: "Impressoras | TIControl" },
      { name: "description", content: "Cadastro de impressoras, estoque de toner e histórico de trocas." },
      { property: "og:title", content: "Impressoras | TIControl" },
      { property: "og:description", content: "Cadastro de impressoras, estoque de toner e histórico de trocas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Impressoras,
});
