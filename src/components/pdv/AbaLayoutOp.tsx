import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Network, Pencil, Plus, Table2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExportarMenu } from "@/components/ExportarMenu";
import { OrgChart, type NoOrg } from "@/components/overview/OrgChart";
import { EditorFormatado } from "@/components/infra/EditorFormatado";
import { ConteudoRico } from "@/components/infra/ConteudoRico";
import { supabase } from "@/integrations/supabase/client";
import { textoExportacao } from "@/lib/exportar";
import { ID_LAYOUT_OP_LOCAL, NOS_LAYOUT_OP_PADRAO } from "@/data/pdv-layout-op";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type VersaoLayout = {
  id: string;
  nome: string;
  periodo: string | null;
  atual: boolean;
  nodes: NoOrg[];
};

const COLUNAS = [
  { chave: "bloco", titulo: "Bloco" },
  { chave: "detalhe", titulo: "Detalhe" },
  { chave: "abaixo_de", titulo: "Abaixo de" },
  { chave: "detalhes", titulo: "Conteúdo / detalhes" },
];

const VERSAO_LOCAL: VersaoLayout = {
  id: ID_LAYOUT_OP_LOCAL,
  nome: "Padrão",
  periodo: "2026",
  atual: true,
  nodes: NOS_LAYOUT_OP_PADRAO,
};

function tabelaAusente(mensagem: string) {
  return /pdv_layout_versoes|schema cache|Could not find the table/i.test(mensagem);
}

function novoNo(): NoOrg {
  return {
    id: crypto.randomUUID().slice(0, 8),
    titulo: "",
    subtitulo: "",
    parent: null,
    conteudo: "",
  };
}

function clonarNos(nos: NoOrg[]): NoOrg[] {
  const mapa = new Map(nos.map((n) => [n.id, crypto.randomUUID().slice(0, 8)]));
  return nos.map((n) => ({
    ...n,
    id: mapa.get(n.id) ?? n.id,
    parent: n.parent ? (mapa.get(n.parent) ?? null) : null,
    conteudo: n.conteudo ?? "",
    subtitulo: n.subtitulo ?? "",
  }));
}

function linhasLayout(nos: NoOrg[]) {
  const porId = new Map(nos.map((n) => [n.id, n]));
  return nos.map((n) => ({
    bloco: n.titulo,
    detalhe: n.subtitulo ?? "",
    abaixo_de: n.parent ? (porId.get(n.parent)?.titulo ?? "") : "Topo",
    detalhes: textoExportacao(n.conteudo),
  }));
}

function raizes(nos: NoOrg[]) {
  const ids = new Set(nos.map((n) => n.id));
  return nos.filter((n) => !n.parent || !ids.has(n.parent));
}

function subarvore(nos: NoOrg[], raizId: string) {
  const filhos = new Map<string, string[]>();
  for (const n of nos) {
    if (!n.parent) continue;
    const lista = filhos.get(n.parent) ?? [];
    lista.push(n.id);
    filhos.set(n.parent, lista);
  }
  const ids = new Set<string>([raizId]);
  const fila = [raizId];
  while (fila.length) {
    const atual = fila.pop()!;
    for (const id of filhos.get(atual) ?? []) {
      if (ids.has(id)) continue;
      ids.add(id);
      fila.push(id);
    }
  }
  return nos.filter((n) => ids.has(n.id));
}

function profundidade(nos: NoOrg[], id: string): number {
  const filhos = nos.filter((n) => n.parent === id);
  if (!filhos.length) return 1;
  return 1 + Math.max(...filhos.map((f) => profundidade(nos, f.id)));
}

function ListaHierarquica({
  nos,
  parent = null,
  nivel = 0,
  onSelect,
}: {
  nos: NoOrg[];
  parent?: string | null;
  nivel?: number;
  onSelect: (no: NoOrg) => void;
}) {
  const filhos = nos.filter((n) => n.parent === parent);
  if (!filhos.length) return null;
  return (
    <ul
      className={nivel === 0 ? "space-y-4 text-sm" : "mt-2 space-y-1.5 border-l border-border pl-4"}
    >
      {filhos.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            className="text-left hover:text-primary"
            onClick={() => onSelect(n)}
          >
            <span className={nivel <= 1 ? "font-semibold" : ""}>{n.titulo}</span>
            {n.subtitulo ? <span className="text-muted-foreground"> — {n.subtitulo}</span> : null}
          </button>
          <ListaHierarquica nos={nos} parent={n.id} nivel={nivel + 1} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

export function AbaLayoutOp({ ws, podeEditar }: { ws: string | undefined; podeEditar: boolean }) {
  const qc = useQueryClient();
  const [grafico, setGrafico] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [editando, setEditando] = useState<(Omit<VersaoLayout, "id"> & { id?: string }) | null>(
    null,
  );
  const [blocoAberto, setBlocoAberto] = useState<NoOrg | null>(null);

  const versoesQuery = useQuery({
    queryKey: ["pdv_layout_versoes", ws],
    enabled: !!ws,
    queryFn: async (): Promise<VersaoLayout[]> => {
      const { data, error } = await db
        .from("pdv_layout_versoes")
        .select("id, nome, periodo, atual, nodes")
        .eq("workspace_id", ws)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((v: VersaoLayout) => ({ ...v, nodes: v.nodes ?? [] }));
    },
  });

  const semTabela =
    versoesQuery.isError && tabelaAusente((versoesQuery.error as Error)?.message ?? "");
  const versoesSalvas = versoesQuery.data ?? [];
  const versoes = versoesSalvas.length ? versoesSalvas : [VERSAO_LOCAL];
  const versao =
    versoes.find((v) => v.id === selecionada) ??
    versoes.find((v) => v.atual) ??
    versoes[versoes.length - 1];

  const salvar = useMutation({
    mutationFn: async (v: Omit<VersaoLayout, "id"> & { id?: string }) => {
      if (!ws) throw new Error("Workspace não encontrado");
      if (semTabela) {
        throw new Error(
          "Execute a migration 20261009160000_pdv_layout_versoes.sql no SQL Editor do Supabase e tente novamente.",
        );
      }
      if (v.atual) {
        await db.from("pdv_layout_versoes").update({ atual: false }).eq("workspace_id", ws);
      }
      const payload = {
        workspace_id: ws,
        nome: v.nome.trim(),
        periodo: v.periodo || null,
        atual: v.atual,
        nodes: v.nodes
          .filter((n) => n.titulo.trim())
          .map((n) => ({
            id: n.id,
            titulo: n.titulo.trim(),
            subtitulo: n.subtitulo || null,
            parent: n.parent,
            conteudo: n.conteudo || null,
          })),
        updated_at: new Date().toISOString(),
      };
      const res = v.id
        ? await db.from("pdv_layout_versoes").update(payload).eq("id", v.id).select("id").single()
        : await db.from("pdv_layout_versoes").insert(payload).select("id").single();
      if (res.error) throw res.error;
      return res.data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Versão salva");
      setEditando(null);
      setSelecionada(id);
      qc.invalidateQueries({ queryKey: ["pdv_layout_versoes"] });
    },
    onError: (e: Error) => {
      if (tabelaAusente(e.message)) {
        toast.error("Tabela ainda não criada no banco", {
          description:
            "Execute a migration 20261009160000_pdv_layout_versoes.sql no SQL Editor do Supabase e tente novamente.",
        });
        return;
      }
      toast.error("Não foi possível salvar", { description: e.message });
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("pdv_layout_versoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Versão removida");
      setSelecionada(null);
      qc.invalidateQueries({ queryKey: ["pdv_layout_versoes"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  function abrirEdicao(origem: VersaoLayout) {
    setEditando({
      id: origem.id === ID_LAYOUT_OP_LOCAL ? undefined : origem.id,
      nome: origem.nome,
      periodo: origem.periodo,
      atual: origem.atual,
      nodes: origem.nodes.map((n) => ({ ...n, conteudo: n.conteudo ?? "" })),
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Layout Op. Sistema PDV</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Módulos padrão do sistema e exceções das unidades.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={grafico ? "default" : "outline"}
              size="sm"
              onClick={() => setGrafico(!grafico)}
            >
              {grafico ? <Table2 className="mr-2 h-4 w-4" /> : <Network className="mr-2 h-4 w-4" />}
              {grafico ? "Lista" : "Gráfico"}
            </Button>
            <ExportarMenu
              titulo={`Layout Op. Sistema PDV${versao ? ` — ${versao.nome}` : ""}`}
              colunas={COLUNAS}
              linhas={versao ? linhasLayout(versao.nodes) : []}
              size="sm"
            />
            {podeEditar && versao && (
              <Button size="sm" variant="outline" onClick={() => abrirEdicao(versao)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            )}
            {podeEditar && versao && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditando({
                    nome: "Nova visão",
                    periodo: String(new Date().getFullYear()),
                    atual: true,
                    nodes: clonarNos(versao.nodes),
                  })
                }
              >
                <Copy className="mr-2 h-4 w-4" /> Nova versão a partir desta
              </Button>
            )}
            {podeEditar && (
              <Button
                size="sm"
                onClick={() =>
                  setEditando({
                    nome: "",
                    periodo: "",
                    atual: !versoesSalvas.length,
                    nodes: [novoNo()],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Versão
              </Button>
            )}
          </div>
        </div>
        {versoes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {versoes.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelecionada(v.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${versao?.id === v.id ? "border-primary bg-primary/15 text-primary" : "hover:bg-accent"}`}
              >
                {v.nome}
                {v.periodo ? ` (${v.periodo})` : ""}
                {v.atual && " • atual"}
                {v.id === ID_LAYOUT_OP_LOCAL && " • modelo"}
              </button>
            ))}
          </div>
        )}
        {semTabela && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            O layout padrão está visível. Para gravar versões, execute a migration
            20261009160000_pdv_layout_versoes.sql.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {versoesQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando layout...</p>
        ) : !versao ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma versão cadastrada.
          </p>
        ) : grafico ? (
          <div className="space-y-10">
            {raizes(versao.nodes).map((raiz) => {
              const nos = subarvore(versao.nodes, raiz.id);
              const temFilhos = nos.length > 1;
              const fluxo = profundidade(nos, raiz.id) >= 3;
              return (
                <section key={raiz.id} className={fluxo ? "org-pdv org-franqueado" : "org-pdv"}>
                  <OrgChart nos={nos} fullWidth={fluxo} onSelect={setBlocoAberto} />
                  {!temFilhos && /exce/i.test(raiz.titulo) && (
                    <p className="text-center text-sm text-muted-foreground">
                      Nenhuma exceção cadastrada. Use Editar para registrar o desvio de uma unidade.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <ListaHierarquica nos={versao.nodes} onSelect={setBlocoAberto} />
        )}
      </CardContent>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando?.id ? "Editar versão" : "Nova versão"} — Layout Op. Sistema PDV
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label>Nome da visão</Label>
                  <Input
                    value={editando.nome}
                    onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Período</Label>
                  <Input
                    placeholder="Ex.: 2026"
                    value={editando.periodo ?? ""}
                    onChange={(e) => setEditando({ ...editando, periodo: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editando.atual}
                  onCheckedChange={(c) => setEditando({ ...editando, atual: c })}
                />
                Marcar como visão atual
              </label>
              <div className="space-y-3">
                <Label>Blocos do diagrama</Label>
                {editando.nodes.map((n, i) => (
                  <div key={n.id} className="space-y-3 rounded-md border p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input
                        placeholder="Título"
                        value={n.titulo}
                        onChange={(e) => {
                          const nodes = [...editando.nodes];
                          nodes[i] = { ...n, titulo: e.target.value };
                          setEditando({ ...editando, nodes });
                        }}
                      />
                      <Input
                        placeholder="Detalhe (opcional)"
                        value={n.subtitulo ?? ""}
                        onChange={(e) => {
                          const nodes = [...editando.nodes];
                          nodes[i] = { ...n, subtitulo: e.target.value };
                          setEditando({ ...editando, nodes });
                        }}
                      />
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={n.parent ?? ""}
                        onChange={(e) => {
                          const nodes = [...editando.nodes];
                          nodes[i] = { ...n, parent: e.target.value || null };
                          setEditando({ ...editando, nodes });
                        }}
                      >
                        <option value="">— Topo —</option>
                        {editando.nodes
                          .filter((p) => p.id !== n.id && p.titulo)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              Abaixo de {p.titulo}
                            </option>
                          ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditando({
                            ...editando,
                            nodes: editando.nodes
                              .filter((x) => x.id !== n.id)
                              .map((x) => (x.parent === n.id ? { ...x, parent: n.parent } : x)),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Conteúdo de {n.titulo.trim() || "bloco"} (texto formatado e anexos)
                      </Label>
                      <EditorFormatado
                        id={`pdv-layout-${n.id}`}
                        value={n.conteudo ?? ""}
                        onChange={(conteudo) => {
                          const nodes = [...editando.nodes];
                          nodes[i] = { ...n, conteudo };
                          setEditando({ ...editando, nodes });
                        }}
                        placeholder="Descreva o módulo ou a exceção da unidade..."
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditando({ ...editando, nodes: [...editando.nodes, novoNo()] })}
                >
                  <Plus className="mr-2 h-4 w-4" /> Bloco
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {editando?.id && (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  if (confirm("Excluir esta versão?")) {
                    excluir.mutate(editando.id!);
                    setEditando(null);
                  }
                }}
              >
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!editando?.nome.trim() || salvar.isPending}
              onClick={() => editando && salvar.mutate(editando)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blocoAberto} onOpenChange={(o) => !o && setBlocoAberto(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{blocoAberto?.titulo ?? "Bloco"}</DialogTitle>
            {blocoAberto?.subtitulo && (
              <p className="text-sm text-muted-foreground">{blocoAberto.subtitulo}</p>
            )}
          </DialogHeader>
          {blocoAberto?.conteudo ? (
            <ConteudoRico html={blocoAberto.conteudo} />
          ) : (
            <p className="text-sm text-muted-foreground">Este bloco não tem detalhes adicionais.</p>
          )}
          {blocoAberto?.parent && versao && (
            <Badge variant="secondary">
              abaixo de {versao.nodes.find((p) => p.id === blocoAberto.parent)?.titulo}
            </Badge>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
