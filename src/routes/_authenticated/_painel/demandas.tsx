import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Columns3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditorFormatado } from "@/components/infra/EditorFormatado";
import { ConteudoRico } from "@/components/infra/ConteudoRico";
import { ExportarMenu } from "@/components/ExportarMenu";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { textoExportacao } from "@/lib/exportar";
import { cn } from "@/lib/utils";
import {
  type ClassificacaoDemanda,
  type ColunaDemanda,
  type EscopoDemanda,
  ROTULO_CLASSIFICACAO,
  ROTULO_COLUNA,
  ROTULO_ESCOPO,
  ROTULO_NOME_ESCOPO,
  colunaDemanda,
  formatarIsoData,
  lerIsoData,
  resumoDemandas,
  sugerirDatasDemanda,
} from "@/lib/demandas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_painel/demandas")({
  head: () => ({
    meta: [
      { title: "Demandas | TIControl" },
      { name: "description", content: "Calendário do mês e agenda de entregas das demandas." },
      { property: "og:title", content: "Demandas | TIControl" },
      { property: "og:description", content: "Calendário do mês e agenda de entregas das demandas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaDemandas,
});

type Demanda = {
  id: string;
  nome: string;
  data_inicio: string;
  data_pedida: string;
  data_entrega: string;
  observacoes_html: string | null;
  escopo: EscopoDemanda | null;
  escopo_nome: string | null;
  classificacao: ClassificacaoDemanda | null;
  created_at: string;
};

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const COLUNAS: ColunaDemanda[] = ["a_fazer", "em_andamento", "concluida"];
const CAMPOS = "id, nome, data_inicio, data_pedida, data_entrega, observacoes_html, escopo, escopo_nome, classificacao, created_at";

function exibirData(iso: string) {
  return lerIsoData(iso.slice(0, 10)).toLocaleDateString("pt-BR");
}

function tabelaAusente(mensagem: string) {
  return /demandas|schema cache|Could not find the table|column/i.test(mensagem);
}

function PaginaDemandas() {
  const atual = useCurrentWorkspace();
  const ws = atual?.workspace.id;
  const podeEditar = atual?.role === "master" || atual?.role === "admin" || atual?.role === "tecnico";
  const qc = useQueryClient();
  const hoje = inicioLocal(new Date());
  const [visao, setVisao] = useState<"agenda" | "lista">("agenda");
  const [nome, setNome] = useState("");
  const [dataPedida, setDataPedida] = useState(formatarIsoData(hoje));
  const [escopo, setEscopo] = useState<EscopoDemanda | "">("");
  const [escopoNome, setEscopoNome] = useState("");
  const [classificacao, setClassificacao] = useState<ClassificacaoDemanda | "">("");
  const [observacoes, setObservacoes] = useState("");

  const demandas = useQuery({
    queryKey: ["demandas", ws],
    enabled: !!ws,
    queryFn: async (): Promise<Demanda[]> => {
      const completo = await db.from("demandas").select(CAMPOS).eq("workspace_id", ws).order("data_entrega", { ascending: true });
      if (!completo.error) return completo.data ?? [];
      if (!/column|schema cache/i.test(completo.error.message)) throw completo.error;
      const basico = await db
        .from("demandas")
        .select("id, nome, data_inicio, data_pedida, data_entrega, observacoes_html, created_at")
        .eq("workspace_id", ws)
        .order("data_entrega", { ascending: true });
      if (basico.error) throw basico.error;
      return (basico.data ?? []).map((item: Omit<Demanda, "escopo" | "escopo_nome" | "classificacao">) => ({
        ...item,
        escopo: null,
        escopo_nome: null,
        classificacao: null,
      }));
    },
  });

  const itens = demandas.data ?? [];
  const resumo = useMemo(() => resumoDemandas(itens, hoje), [itens, hoje]);
  const formularioPronto = Boolean(nome.trim() && dataPedida && escopo && escopoNome.trim() && classificacao);

  const criar = useMutation({
    mutationFn: async () => {
      if (!escopo || !classificacao) throw new Error("Informe o escopo e a classificação.");
      const sugestao = sugerirDatasDemanda(
        lerIsoData(dataPedida),
        itens.map((item) => item.data_entrega.slice(0, 10)),
      );
      const { error } = await db.from("demandas").insert({
        workspace_id: ws,
        nome: nome.trim(),
        data_inicio: sugestao.dataInicio,
        data_pedida: sugestao.dataPedida,
        data_entrega: sugestao.dataEntrega,
        observacoes_html: observacoes.trim() ? observacoes : null,
        escopo,
        escopo_nome: escopoNome.trim(),
        classificacao,
      });
      if (error) throw error;
      return sugestao;
    },
    onSuccess: (sugestao) => {
      toast.success("Demanda cadastrada", {
        description: `Início ${exibirData(sugestao.dataInicio)} · pedida ${exibirData(sugestao.dataPedida)} · entrega ${exibirData(sugestao.dataEntrega)}`,
      });
      setNome("");
      setEscopo("");
      setEscopoNome("");
      setClassificacao("");
      setObservacoes("");
      qc.invalidateQueries({ queryKey: ["demandas", ws] });
    },
    onError: (erro: Error) => {
      toast.error(tabelaAusente(erro.message) ? "Estrutura ainda incompleta no banco" : "Não foi possível cadastrar a demanda", {
        description: tabelaAusente(erro.message)
          ? "Execute a migration 20261017140000_demandas_escopo_classificacao.sql no SQL Editor do Supabase."
          : erro.message,
      });
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("demandas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demanda removida");
      qc.invalidateQueries({ queryKey: ["demandas", ws] });
    },
    onError: (erro: Error) => toast.error("Não foi possível remover", { description: erro.message }),
  });

  const entregasNoMes = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const demanda of itens) {
      const iso = demanda.data_entrega.slice(0, 10);
      const data = lerIsoData(iso);
      if (data.getMonth() !== hoje.getMonth() || data.getFullYear() !== hoje.getFullYear()) continue;
      mapa.set(iso, [...(mapa.get(iso) ?? []), demanda.nome]);
    }
    return mapa;
  }, [itens, hoje]);

  const linhasExportacao = itens.map((demanda) => ({
    nome: demanda.nome,
    coluna: ROTULO_COLUNA[colunaDemanda(demanda.data_inicio, demanda.data_entrega, hoje)],
    escopo: demanda.escopo ? ROTULO_ESCOPO[demanda.escopo] : "",
    escopo_nome: demanda.escopo_nome ?? "",
    classificacao: demanda.classificacao ? ROTULO_CLASSIFICACAO[demanda.classificacao] : "",
    cadastro: new Date(demanda.created_at).toLocaleString("pt-BR"),
    inicio: exibirData(demanda.data_inicio),
    pedida: exibirData(demanda.data_pedida),
    entrega: exibirData(demanda.data_entrega),
    observacoes: textoExportacao(demanda.observacoes_html),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Calendário de {hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} e entregas que não se sobrepõem.
            O lançamento fica em segunda, terça, quarta ou quinta.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant={visao === "agenda" ? "default" : "outline"} onClick={() => setVisao("agenda")}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Agenda
          </Button>
          <Button type="button" variant={visao === "lista" ? "default" : "outline"} onClick={() => setVisao("lista")}>
            <Columns3 className="mr-2 h-4 w-4" />
            Lista
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de demandas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{resumo.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em andamento</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{resumo.emAndamento}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status alto</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{resumo.statusAlto}</CardContent>
        </Card>
      </div>

      {visao === "lista" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Demandas</CardTitle>
            <ExportarMenu
              size="sm"
              titulo="Demandas"
              colunas={[
                { chave: "nome", titulo: "Nome" },
                { chave: "coluna", titulo: "Coluna" },
                { chave: "escopo", titulo: "Escopo" },
                { chave: "escopo_nome", titulo: "Nome do escopo" },
                { chave: "classificacao", titulo: "Classificação" },
                { chave: "cadastro", titulo: "Cadastro" },
                { chave: "inicio", titulo: "Início" },
                { chave: "pedida", titulo: "Data pedida" },
                { chave: "entrega", titulo: "Entrega" },
                { chave: "observacoes", titulo: "Observações" },
              ]}
              linhas={linhasExportacao}
            />
          </CardHeader>
          <CardContent>
            {demandas.isError ? (
              <MensagemErro mensagem={(demandas.error as Error).message} />
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {COLUNAS.map((coluna) => (
                  <section key={coluna} className="rounded-lg border bg-muted/20 p-3">
                    <h2 className="mb-3 text-sm font-semibold">{ROTULO_COLUNA[coluna]}</h2>
                    <div className="space-y-2">
                      {itens.filter((demanda) => colunaDemanda(demanda.data_inicio, demanda.data_entrega, hoje) === coluna).length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhuma demanda.</p>
                      )}
                      {itens
                        .filter((demanda) => colunaDemanda(demanda.data_inicio, demanda.data_entrega, hoje) === coluna)
                        .map((demanda) => (
                          <article key={demanda.id} className="rounded-md border bg-card p-3">
                            <p className="font-medium">{demanda.nome}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {demanda.escopo ? `${ROTULO_ESCOPO[demanda.escopo]} · ${demanda.escopo_nome ?? ""}` : "Sem escopo"}
                              {demanda.classificacao ? ` · ${ROTULO_CLASSIFICACAO[demanda.classificacao]}` : ""}
                            </p>
                            <p className="mt-1 text-sm">Entrega {exibirData(demanda.data_entrega)}</p>
                          </article>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <CalendarioMes hoje={hoje} entregas={entregasNoMes} />
          <Card>
            <CardHeader>
              <CardTitle>Demandas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {podeEditar && (
                <form
                  className="space-y-3"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    if (formularioPronto) criar.mutate();
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <Label htmlFor="demanda-nome">Nome</Label>
                      <Input id="demanda-nome" value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Nome da demanda" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="demanda-data">Data prevista</Label>
                      <Input id="demanda-data" type="date" value={dataPedida} onChange={(evento) => setDataPedida(evento.target.value)} required />
                    </div>
                    <Button type="submit" disabled={!formularioPronto || criar.isPending}>
                      {criar.isPending ? "Salvando..." : "Cadastrar"}
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Escopo</Label>
                      <Select
                        value={escopo}
                        onValueChange={(valor) => {
                          setEscopo(valor as EscopoDemanda);
                          setEscopoNome("");
                        }}
                      >
                        <SelectTrigger aria-label="Escopo">
                          <SelectValue placeholder="Empresa, unidade ou marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="empresa">Empresa</SelectItem>
                          <SelectItem value="unidade">Unidade</SelectItem>
                          <SelectItem value="marca">Marca/Rede</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="demanda-escopo-nome">{escopo ? ROTULO_NOME_ESCOPO[escopo] : "Nome"}</Label>
                      <Input
                        id="demanda-escopo-nome"
                        value={escopoNome}
                        disabled={!escopo}
                        onChange={(evento) => setEscopoNome(evento.target.value)}
                        placeholder={escopo ? ROTULO_NOME_ESCOPO[escopo] : "Selecione o escopo"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Classificação</Label>
                      <Select value={classificacao} onValueChange={(valor) => setClassificacao(valor as ClassificacaoDemanda)}>
                        <SelectTrigger aria-label="Classificação">
                          <SelectValue placeholder="Baixa, média ou alta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="demanda-observacoes">Observações</Label>
                    <EditorFormatado id="demanda-observacoes" value={observacoes} onChange={setObservacoes} placeholder="Observações da demanda..." />
                  </div>
                </form>
              )}
              {demandas.isError ? (
                <MensagemErro mensagem={(demandas.error as Error).message} />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {itens.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhuma demanda cadastrada.</li>}
                  {itens.map((demanda) => (
                    <li key={demanda.id} className="flex items-start justify-between gap-3 p-3">
                      <div className="space-y-1">
                        <p className="font-medium">{demanda.nome}</p>
                        <p className="text-xs text-muted-foreground">Cadastro {new Date(demanda.created_at).toLocaleString("pt-BR")}</p>
                        <p className="text-sm">
                          {demanda.escopo ? `${ROTULO_ESCOPO[demanda.escopo]}: ${demanda.escopo_nome ?? ""} · ` : ""}
                          {demanda.classificacao ? `${ROTULO_CLASSIFICACAO[demanda.classificacao]} · ` : ""}
                          Início {exibirData(demanda.data_inicio)} · Pedida {exibirData(demanda.data_pedida)} · Entrega {exibirData(demanda.data_entrega)}
                        </p>
                        {demanda.observacoes_html?.trim() && <ConteudoRico html={demanda.observacoes_html} className="text-sm" />}
                      </div>
                      {podeEditar && (
                        <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${demanda.nome}`} onClick={() => excluir.mutate(demanda.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MensagemErro({ mensagem }: { mensagem: string }) {
  return (
    <p className="text-sm text-destructive">
      {tabelaAusente(mensagem)
        ? "Execute a migration 20261017140000_demandas_escopo_classificacao.sql no SQL Editor do Supabase."
        : "Não foi possível carregar as demandas."}
    </p>
  );
}

function inicioLocal(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function CalendarioMes({ hoje, entregas }: { hoje: Date; entregas: Map<string, string[]> }) {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const deslocamento = (primeiro.getDay() + 6) % 7;
  const total = new Date(ano, mes + 1, 0).getDate();
  const celulas = [...Array.from({ length: deslocamento }, () => null), ...Array.from({ length: total }, (_, indice) => indice + 1)];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="py-1 font-medium">
              {dia}
            </div>
          ))}
          {celulas.map((dia, indice) => {
            if (!dia) return <div key={`vazio-${indice}`} />;
            const data = new Date(ano, mes, dia);
            const iso = formatarIsoData(data);
            const atual = iso === formatarIsoData(hoje);
            const bloqueado = data.getDay() === 0 || data.getDay() >= 5;
            const nomes = entregas.get(iso) ?? [];
            return (
              <div
                key={iso}
                title={nomes.join(", ")}
                className={cn(
                  "flex min-h-14 flex-col items-center rounded-md border px-1 py-1",
                  atual && "border-primary bg-primary/15 text-primary",
                  !atual && bloqueado && "text-muted-foreground/70",
                  nomes.length > 0 && "border-primary/60",
                )}
              >
                <span className={cn("text-sm font-medium", atual && "font-bold")}>{dia}</span>
                {nomes.length > 0 && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
