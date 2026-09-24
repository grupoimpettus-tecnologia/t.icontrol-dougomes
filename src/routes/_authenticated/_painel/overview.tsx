import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Maximize, Network, Pencil, Plus, Table2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExportarDocumentoMenu, ExportarMenu } from "@/components/ExportarMenu";
import { OrgChart, type NoOrg } from "@/components/overview/OrgChart";
import { EditorFormatado } from "@/components/infra/EditorFormatado";
import { ConteudoRico } from "@/components/infra/ConteudoRico";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { textoExportacao, type SecaoExportacao } from "@/lib/exportar";

// Tabelas novas ainda não presentes nos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Membro = {
  id: string; nome: string; cargo: string | null; nivel: string | null; area: string | null;
  gestor_id: string | null; atribuicoes: string | null; ordem: number;
};
type Versao = { id: string; tipo: "macro" | "micro"; nome: string; periodo: string | null; atual: boolean; nodes: NoOrg[] };

export const Route = createFileRoute("/_authenticated/_painel/overview")({
  head: () => ({
    meta: [
      { title: "Overviewer do time — TIControl" },
      { name: "description", content: "Organogramas do time de T.I.: colaboradores, macro e micro área e atribuições." },
      { property: "og:title", content: "Overviewer do time — TIControl" },
      { property: "og:description", content: "Organogramas e histórico da área de T.I." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function BotaoGrafico({ grafico, onChange }: { grafico: boolean; onChange: (v: boolean) => void }) {
  return (
    <Button variant={grafico ? "default" : "outline"} size="sm" onClick={() => onChange(!grafico)}>
      {grafico ? <Table2 className="mr-2 h-4 w-4" /> : <Network className="mr-2 h-4 w-4" />}
      {grafico ? "Lista" : "Gráfico"}
    </Button>
  );
}

const COLUNAS_COLABORADORES = [
  { chave: "nome", titulo: "Nome" },
  { chave: "cargo", titulo: "Cargo" },
  { chave: "nivel", titulo: "Nível" },
  { chave: "area", titulo: "Área" },
  { chave: "gestor", titulo: "Reporta a" },
  { chave: "atribuicoes", titulo: "Atribuições" },
];

const COLUNAS_ORGANOGRAMA = [
  { chave: "bloco", titulo: "Bloco" },
  { chave: "detalhe", titulo: "Detalhe" },
  { chave: "abaixo_de", titulo: "Abaixo de" },
  { chave: "detalhes", titulo: "Conteúdo / detalhes" },
];

const COLUNAS_MICRO_FRANQUEADO = [
  { chave: "fase", titulo: "Fase" },
  { chave: "codigo", titulo: "Código" },
  { chave: "passo", titulo: "Passo" },
  { chave: "ti", titulo: "T.I. da Franqueadora" },
  { chave: "entregavel", titulo: "Entregável" },
  { chave: "ponto_atencao", titulo: "Ponto de atenção" },
];

function linhasOrganograma(nos: NoOrg[]) {
  const porId = new Map(nos.map((n) => [n.id, n]));
  return nos.map((n) => ({
    bloco: n.titulo,
    detalhe: n.subtitulo ?? "",
    abaixo_de: n.parent ? (porId.get(n.parent)?.titulo ?? "") : "Topo",
    detalhes: textoExportacao(n.conteudo),
  }));
}

function linhasColaboradores(membros: Membro[]) {
  const nomePorId = new Map(membros.map((m) => [m.id, m.nome]));
  return membros.map((m) => ({
    ...m,
    gestor: m.gestor_id ? nomePorId.get(m.gestor_id) ?? "" : "",
  }));
}

function textoPassoMicro(passo: {
  tiTexto?: string;
  tiItens?: string[];
}) {
  const partes: string[] = [];
  if (passo.tiTexto) partes.push(passo.tiTexto);
  if (passo.tiItens?.length) partes.push(passo.tiItens.map((item) => `• ${item}`).join("\n"));
  return partes.join("\n\n");
}

function Overview() {
  const atual = useCurrentWorkspace();
  const ws = atual?.workspace.id;
  const podeEditar = atual?.role === "master" || atual?.role === "admin";
  const [apresentacao, setApresentacao] = useState(false);

  const membros = useQuery({
    queryKey: ["team_members", ws], enabled: !!ws,
    queryFn: async (): Promise<Membro[]> => {
      const { data, error } = await db.from("team_members").select("*").eq("workspace_id", ws).order("ordem").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
  const versoes = useQuery({
    queryKey: ["org_versions", ws], enabled: !!ws,
    queryFn: async (): Promise<Versao[]> => {
      const { data, error } = await db.from("org_versions").select("*").eq("workspace_id", ws).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const listaMembros = membros.data ?? [];
  const listaVersoes = versoes.data ?? [];
  const versaoMacro = listaVersoes.find((v) => v.tipo === "macro" && v.atual) ?? listaVersoes.filter((v) => v.tipo === "macro").at(-1);
  const versaoMicro = listaVersoes.find((v) => v.tipo === "micro" && v.atual) ?? listaVersoes.filter((v) => v.tipo === "micro").at(-1);

  const secoesExportacaoCompleta = useMemo((): SecaoExportacao[] => {
    const secoes: SecaoExportacao[] = [
      {
        titulo: "Colaboradores",
        colunas: COLUNAS_COLABORADORES,
        linhas: linhasColaboradores(listaMembros),
      },
    ];
    if (versaoMacro) {
      secoes.push({
        titulo: `Macro área — ${versaoMacro.nome}`,
        colunas: COLUNAS_ORGANOGRAMA,
        linhas: linhasOrganograma(versaoMacro.nodes),
      });
    }
    if (versaoMicro) {
      secoes.push({
        titulo: `Micro área — ${versaoMicro.nome}`,
        colunas: COLUNAS_ORGANOGRAMA,
        linhas: linhasOrganograma(versaoMicro.nodes),
      });
    }
    secoes.push({
      titulo: "Por colaborador",
      colunas: COLUNAS_COLABORADORES,
      linhas: linhasColaboradores(listaMembros),
    });
    secoes.push({
      titulo: "Macro área p/ franqueado",
      colunas: COLUNAS_ORGANOGRAMA.filter((c) => c.chave !== "detalhes"),
      linhas: linhasOrganograma(NOS_MACRO_FRANQUEADO).map(({ detalhes: _d, ...resto }) => resto),
    });
    secoes.push({
      titulo: "Micro área p/ franqueado",
      colunas: COLUNAS_MICRO_FRANQUEADO,
      linhas: FASES_MICRO_FRANQUEADO.flatMap((fase) =>
        fase.passos.map((passo) => ({
          fase: `${fase.codigo}. ${fase.titulo} — ${fase.subtitulo}`,
          codigo: passo.codigo,
          passo: passo.titulo,
          ti: textoPassoMicro(passo),
          entregavel: passo.entregavel ?? "",
          ponto_atencao: passo.pontoAtencao ?? "",
        })),
      ),
    });
    return secoes;
  }, [listaMembros, versaoMacro, versaoMicro]);

  function alternarApresentacao() {
    const v = !apresentacao;
    setApresentacao(v);
    if (v) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  const conteudo = (
    <Tabs defaultValue="colaboradores" className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
        <TabsTrigger value="macro">Macro área</TabsTrigger>
        <TabsTrigger value="micro">Micro área</TabsTrigger>
        <TabsTrigger value="individual">Por colaborador</TabsTrigger>
        <TabsTrigger value="macro-franqueado">Macro área p/ franqueado</TabsTrigger>
        <TabsTrigger value="micro-franqueado">Micro área p/ franqueado</TabsTrigger>
      </TabsList>
      <TabsContent value="colaboradores">
        <AbaColaboradores ws={ws} membros={listaMembros} podeEditar={podeEditar && !apresentacao} />
      </TabsContent>
      <TabsContent value="macro">
        <AbaVersoes tipo="macro" ws={ws} versoes={listaVersoes.filter((v) => v.tipo === "macro")} podeEditar={podeEditar && !apresentacao} />
      </TabsContent>
      <TabsContent value="micro">
        <AbaVersoes tipo="micro" ws={ws} versoes={listaVersoes.filter((v) => v.tipo === "micro")} podeEditar={podeEditar && !apresentacao} />
      </TabsContent>
      <TabsContent value="individual">
        <AbaIndividual membros={listaMembros} />
      </TabsContent>
      <TabsContent value="macro-franqueado">
        <AbaMacroFranqueado />
      </TabsContent>
      <TabsContent value="micro-franqueado">
        <AbaMicroFranqueado />
      </TabsContent>
    </Tabs>
  );

  if (apresentacao) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Overviewer da T.I. — {atual?.workspace.nome}</h1>
          <Button variant="outline" onClick={alternarApresentacao}><X className="mr-2 h-4 w-4" /> Sair da apresentação</Button>
        </div>
        {conteudo}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Overviewer do time</h1>
          <p className="text-sm text-muted-foreground">Visão da área: colaboradores, estrutura macro e micro e atribuições.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportarDocumentoMenu
            titulo={`Overviewer do time — ${atual?.workspace.nome ?? "TI"}`}
            secoes={secoesExportacaoCompleta}
            label="Exportar tudo"
            formatos={["pdf", "xlsx", "pptx"]}
          />
          <Button onClick={alternarApresentacao}><Maximize className="mr-2 h-4 w-4" /> Modo apresentação</Button>
        </div>
      </div>
      {conteudo}
    </div>
  );
}

/* ---------------- Colaboradores ---------------- */

const membroVazio = { nome: "", cargo: "", nivel: "", area: "", gestor_id: "", atribuicoes: "", ordem: 0 };

function AbaColaboradores({ ws, membros, podeEditar }: { ws: string | undefined; membros: Membro[]; podeEditar: boolean }) {
  const qc = useQueryClient();
  const [grafico, setGrafico] = useState(false);
  const [editando, setEditando] = useState<(typeof membroVazio & { id?: string }) | null>(null);
  const nomePorId = useMemo(() => new Map(membros.map((m) => [m.id, m.nome])), [membros]);

  const salvar = useMutation({
    mutationFn: async (m: typeof membroVazio & { id?: string }) => {
      const payload = {
        workspace_id: ws, nome: m.nome.trim(), cargo: m.cargo || null, nivel: m.nivel || null, area: m.area || null,
        gestor_id: m.gestor_id || null, atribuicoes: m.atribuicoes || null, ordem: Number(m.ordem) || 0,
        updated_at: new Date().toISOString(),
      };
      const { error } = m.id
        ? await db.from("team_members").update(payload).eq("id", m.id)
        : await db.from("team_members").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Colaborador salvo"); setEditando(null); qc.invalidateQueries({ queryKey: ["team_members"] }); },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("team_members").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Colaborador removido"); qc.invalidateQueries({ queryKey: ["team_members"] }); },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  const nos: NoOrg[] = membros.map((m) => ({ id: m.id, titulo: m.nome, subtitulo: [m.cargo, m.area].filter(Boolean).join(" · ") || null, parent: m.gestor_id }));

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Organograma de colaboradores</CardTitle>
        <div className="flex flex-wrap gap-2">
          <BotaoGrafico grafico={grafico} onChange={setGrafico} />
          <ExportarMenu
            titulo="Colaboradores da T.I."
            colunas={COLUNAS_COLABORADORES}
            linhas={linhasColaboradores(membros)}
            size="sm"
          />
          {podeEditar && <Button size="sm" onClick={() => setEditando({ ...membroVazio })}><Plus className="mr-2 h-4 w-4" /> Colaborador</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {grafico ? <OrgChart nos={nos} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b"><th className="p-2">Nome</th><th className="p-2">Cargo</th><th className="p-2">Nível</th><th className="p-2">Área</th><th className="p-2">Reporta a</th>{podeEditar && <th className="p-2" />}</tr>
              </thead>
              <tbody>
                {membros.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="p-2 font-medium">{m.nome}</td><td className="p-2">{m.cargo}</td><td className="p-2">{m.nivel}</td><td className="p-2">{m.area}</td>
                    <td className="p-2">{m.gestor_id ? nomePorId.get(m.gestor_id) : "—"}</td>
                    {podeEditar && (
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => setEditando({ id: m.id, nome: m.nome, cargo: m.cargo ?? "", nivel: m.nivel ?? "", area: m.area ?? "", gestor_id: m.gestor_id ?? "", atribuicoes: m.atribuicoes ?? "", ordem: m.ordem })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => confirm(`Remover ${m.nome}?`) && excluir.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    )}
                  </tr>
                ))}
                {!membros.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum colaborador cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando?.id ? "Editar colaborador" : "Novo colaborador"}</DialogTitle></DialogHeader>
          {editando && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome</Label><Input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></div>
              <div><Label>Cargo</Label><Input value={editando.cargo} onChange={(e) => setEditando({ ...editando, cargo: e.target.value })} /></div>
              <div><Label>Nível</Label><Input placeholder="Ex.: Analista" value={editando.nivel} onChange={(e) => setEditando({ ...editando, nivel: e.target.value })} /></div>
              <div><Label>Área</Label><Input value={editando.area} onChange={(e) => setEditando({ ...editando, area: e.target.value })} /></div>
              <div>
                <Label>Reporta a</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={editando.gestor_id} onChange={(e) => setEditando({ ...editando, gestor_id: e.target.value })}>
                  <option value="">— Ninguém (topo) —</option>
                  {membros.filter((m) => m.id !== editando.id).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><Label>Atribuições (uma por linha)</Label><Textarea rows={5} value={editando.atribuicoes} onChange={(e) => setEditando({ ...editando, atribuicoes: e.target.value })} /></div>
              <div><Label>Ordem</Label><Input type="number" value={editando.ordem} onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button disabled={!editando?.nome.trim() || salvar.isPending} onClick={() => editando && salvar.mutate(editando)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Macro / Micro (versões) ---------------- */

function AbaVersoes({ tipo, ws, versoes, podeEditar }: { tipo: "macro" | "micro"; ws: string | undefined; versoes: Versao[]; podeEditar: boolean }) {
  const qc = useQueryClient();
  const [grafico, setGrafico] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [editando, setEditando] = useState<Omit<Versao, "id"> & { id?: string } | null>(null);
  const [blocoAberto, setBlocoAberto] = useState<NoOrg | null>(null);
  const versao = versoes.find((v) => v.id === selecionada) ?? versoes.find((v) => v.atual) ?? versoes[versoes.length - 1];
  const rotulo = tipo === "macro" ? "Macro área" : "Micro área";

  const salvar = useMutation({
    mutationFn: async (v: Omit<Versao, "id"> & { id?: string }) => {
      if (v.atual) await db.from("org_versions").update({ atual: false }).eq("workspace_id", ws).eq("tipo", tipo);
      const payload = {
        workspace_id: ws,
        tipo,
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
      const res = v.id ? await db.from("org_versions").update(payload).eq("id", v.id).select("id").single() : await db.from("org_versions").insert(payload).select("id").single();
      if (res.error) throw res.error;
      return res.data.id as string;
    },
    onSuccess: (id) => { toast.success("Versão salva"); setEditando(null); setSelecionada(id); qc.invalidateQueries({ queryKey: ["org_versions"] }); },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("org_versions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Versão removida"); setSelecionada(null); qc.invalidateQueries({ queryKey: ["org_versions"] }); },
  });

  const novoNo = (): NoOrg => ({
    id: crypto.randomUUID().slice(0, 8),
    titulo: "",
    subtitulo: "",
    parent: null,
    conteudo: "",
  });

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Organograma — {rotulo}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <BotaoGrafico grafico={grafico} onChange={setGrafico} />
            <ExportarMenu
              titulo={`${rotulo}${versao ? ` — ${versao.nome}` : ""}`}
              colunas={COLUNAS_ORGANOGRAMA}
              linhas={versao ? linhasOrganograma(versao.nodes) : []}
              size="sm"
            />
            {podeEditar && versao && <Button size="sm" variant="outline" onClick={() => setEditando({ id: versao.id, tipo, nome: versao.nome, periodo: versao.periodo, atual: versao.atual, nodes: versao.nodes.map((n) => ({ ...n, conteudo: n.conteudo ?? "" })) })}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>}
            {podeEditar && versao && <Button size="sm" variant="outline" onClick={() => setEditando({ tipo, nome: `Nova visão`, periodo: String(new Date().getFullYear()), atual: true, nodes: versao.nodes.map((n) => ({ ...n, id: crypto.randomUUID().slice(0, 8), conteudo: n.conteudo ?? "" })) })}><Copy className="mr-2 h-4 w-4" /> Nova versão a partir desta</Button>}
            {podeEditar && <Button size="sm" onClick={() => setEditando({ tipo, nome: "", periodo: "", atual: !versoes.length, nodes: [novoNo()] })}><Plus className="mr-2 h-4 w-4" /> Versão</Button>}
          </div>
        </div>
        {versoes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {versoes.map((v) => (
              <button key={v.id} onClick={() => setSelecionada(v.id)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${versao?.id === v.id ? "border-primary bg-primary/15 text-primary" : "hover:bg-accent"}`}>
                {v.nome}{v.periodo ? ` (${v.periodo})` : ""}{v.atual && " • atual"}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!versao ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma versão cadastrada.</p>
        ) : grafico ? (
          <OrgChart nos={versao.nodes} onSelect={setBlocoAberto} />
        ) : (
          <ul className="space-y-1 text-sm">
            {versao.nodes.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => setBlocoAberto(n)}>
                  {n.titulo}
                </button>
                {n.subtitulo && <span className="text-muted-foreground">— {n.subtitulo}</span>}
                {n.parent && <Badge variant="secondary">abaixo de {versao.nodes.find((p) => p.id === n.parent)?.titulo}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editando?.id ? "Editar versão" : "Nova versão"} — {rotulo}</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2"><Label>Nome da visão</Label><Input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></div>
                <div><Label>Período</Label><Input placeholder="Ex.: 2024" value={editando.periodo ?? ""} onChange={(e) => setEditando({ ...editando, periodo: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={editando.atual} onCheckedChange={(c) => setEditando({ ...editando, atual: c })} /> Marcar como visão atual</label>
              <div className="space-y-3">
                <Label>Blocos do organograma</Label>
                {editando.nodes.map((n, i) => (
                  <div key={n.id} className="space-y-3 rounded-md border p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input placeholder="Título" value={n.titulo} onChange={(e) => { const nodes = [...editando.nodes]; nodes[i] = { ...n, titulo: e.target.value }; setEditando({ ...editando, nodes }); }} />
                      <Input placeholder="Detalhe (opcional)" value={n.subtitulo ?? ""} onChange={(e) => { const nodes = [...editando.nodes]; nodes[i] = { ...n, subtitulo: e.target.value }; setEditando({ ...editando, nodes }); }} />
                      <select className="h-9 rounded-md border bg-background px-2 text-sm" value={n.parent ?? ""} onChange={(e) => { const nodes = [...editando.nodes]; nodes[i] = { ...n, parent: e.target.value || null }; setEditando({ ...editando, nodes }); }}>
                        <option value="">— Topo —</option>
                        {editando.nodes.filter((p) => p.id !== n.id && p.titulo).map((p) => <option key={p.id} value={p.id}>Abaixo de {p.titulo}</option>)}
                      </select>
                      <Button variant="ghost" size="icon" onClick={() => setEditando({ ...editando, nodes: editando.nodes.filter((x) => x.id !== n.id).map((x) => (x.parent === n.id ? { ...x, parent: n.parent } : x)) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Conteúdo de {n.titulo.trim() || "bloco"} (texto formatado e anexos)
                      </Label>
                      <EditorFormatado
                        id={`org-bloco-${n.id}`}
                        value={n.conteudo ?? ""}
                        onChange={(conteudo) => {
                          const nodes = [...editando.nodes];
                          nodes[i] = { ...n, conteudo };
                          setEditando({ ...editando, nodes });
                        }}
                        placeholder="Descreva a área, cole imagens ou anexe PDF/Excel..."
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditando({ ...editando, nodes: [...editando.nodes, novoNo()] })}><Plus className="mr-2 h-4 w-4" /> Bloco</Button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {editando?.id && <Button variant="destructive" className="mr-auto" onClick={() => { if (confirm("Excluir esta versão?")) { excluir.mutate(editando.id!); setEditando(null); } }}>Excluir</Button>}
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button disabled={!editando?.nome.trim() || salvar.isPending} onClick={() => editando && salvar.mutate(editando)}>Salvar</Button>
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
          <ConteudoRico html={blocoAberto?.conteudo ?? ""} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Por colaborador ---------------- */

function AbaIndividual({ membros }: { membros: Membro[] }) {
  const [grafico, setGrafico] = useState(false);
  const [id, setId] = useState<string>("");
  const m = membros.find((x) => x.id === id) ?? membros[0];
  const atribuicoes = (m?.atribuicoes ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const gestor = membros.find((x) => x.id === m?.gestor_id);
  const equipe = membros.filter((x) => x.gestor_id === m?.id);

  const nos: NoOrg[] = m ? [
    { id: m.id, titulo: m.nome, subtitulo: [m.cargo, m.area].filter(Boolean).join(" · ") || null, parent: null },
    ...atribuicoes.map((a, i) => ({ id: `a${i}`, titulo: a, parent: m.id })),
  ] : [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Organograma por colaborador</CardTitle>
        <div className="flex flex-wrap gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={m?.id ?? ""} onChange={(e) => setId(e.target.value)}>
            {membros.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
          <BotaoGrafico grafico={grafico} onChange={setGrafico} />
          <ExportarMenu
            titulo="Por colaborador"
            colunas={COLUNAS_COLABORADORES}
            linhas={linhasColaboradores(membros)}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {!m ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p> : grafico ? <OrgChart nos={nos} /> : (
          <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-lg font-semibold">{m.nome}</p>
              {m.cargo && <p className="text-sm">{m.cargo}</p>}
              <div className="flex flex-wrap gap-1">{m.nivel && <Badge>{m.nivel}</Badge>}{m.area && <Badge variant="secondary">{m.area}</Badge>}</div>
              <p className="pt-2 text-xs text-muted-foreground">Reporta a: {gestor?.nome ?? "—"}</p>
              {equipe.length > 0 && <p className="text-xs text-muted-foreground">Equipe: {equipe.map((e) => e.nome).join(", ")}</p>}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Atribuições</p>
              {atribuicoes.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">{atribuicoes.map((a, i) => <li key={i}>{a}</li>)}</ul>
              ) : <p className="text-sm text-muted-foreground">Nenhuma atribuição cadastrada. Edite o colaborador na aba Colaboradores.</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Macro área p/ franqueado ---------------- */

const NOS_MACRO_FRANQUEADO: NoOrg[] = [
  { id: "raiz", titulo: "Para o franqueado", parent: null },
  { id: "nova-loja", titulo: "Nova Loja", parent: "raiz" },
  { id: "pos", titulo: "Pós", parent: "raiz" },
  { id: "nl-1", titulo: "Fornece acesso ao e-mail corporativo", parent: "nova-loja" },
  { id: "nl-2", titulo: "Fornece modelo padrão para aquisição de equipamentos da loja", parent: "nova-loja" },
  { id: "nl-3", titulo: "Acompanha e explica ao time de TI da loja durante a construção da unidade", parent: "nova-loja" },
  { id: "nl-4", titulo: "Valida junto ao time de TI da loja layout de equipamentos instalados e configurados", parent: "nova-loja" },
  { id: "nl-5", titulo: "Apoia implantação do sistema de venda (PDV)", parent: "nova-loja" },
  { id: "nl-6", titulo: "Valida implantação do sistema de venda (PDV)", parent: "nova-loja" },
  { id: "nl-7", titulo: "Solicita treinamento de sistema de venda (PDV) para o time operacional da unidade", parent: "nova-loja" },
  { id: "pos-1", titulo: "Solicita treinamento de retaguarda de sistema de venda (PDV) para o time de gestão da unidade (gerente, operador e franqueado)", parent: "pos" },
  { id: "pos-2", titulo: "Apresenta fluxo de atendimento do sistema de vendas", parent: "pos" },
  { id: "pos-3", titulo: "Apoia dúvidas de sobre cardápio no sistema", parent: "pos" },
];

function ListaHierarquica({ nos, parent = null, nivel = 0 }: { nos: NoOrg[]; parent?: string | null; nivel?: number }) {
  const filhos = nos.filter((n) => n.parent === parent);
  if (!filhos.length) return null;
  return (
    <ul className={nivel === 0 ? "space-y-3 text-sm" : "mt-2 space-y-1.5 border-l border-border pl-4"}>
      {filhos.map((n) => (
        <li key={n.id}>
          <p className={nivel <= 1 ? "font-semibold" : "text-muted-foreground"}>{n.titulo}</p>
          <ListaHierarquica nos={nos} parent={n.id} nivel={nivel + 1} />
        </li>
      ))}
    </ul>
  );
}

function AbaMacroFranqueado() {
  const [grafico, setGrafico] = useState(true);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Macro área p/ franqueado</CardTitle>
        <div className="flex flex-wrap gap-2">
          <BotaoGrafico grafico={grafico} onChange={setGrafico} />
          <ExportarMenu
            titulo="Macro área p/ franqueado"
            colunas={COLUNAS_ORGANOGRAMA.filter((c) => c.chave !== "detalhes")}
            linhas={linhasOrganograma(NOS_MACRO_FRANQUEADO).map(({ detalhes: _d, ...resto }) => resto)}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {grafico ? (
          <div className="org-franqueado">
            <OrgChart nos={NOS_MACRO_FRANQUEADO} fullWidth />
          </div>
        ) : (
          <ListaHierarquica nos={NOS_MACRO_FRANQUEADO} />
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Micro área p/ franqueado ---------------- */

type PassoMicroFranqueado = {
  id: string;
  codigo: string;
  titulo: string;
  tiIntro?: string;
  tiItens?: string[];
  tiTexto?: string;
  entregavel?: string;
  pontoAtencao?: string;
};

type FaseMicroFranqueado = {
  id: string;
  codigo: string;
  titulo: string;
  subtitulo: string;
  passos: PassoMicroFranqueado[];
};

const FASES_MICRO_FRANQUEADO: FaseMicroFranqueado[] = [
  {
    id: "nova-loja",
    codigo: "1",
    titulo: "Nova Loja",
    subtitulo: "Fase de Implantação e Go-Live",
    passos: [
      {
        id: "nl-1",
        codigo: "1.1",
        titulo: "Fornece acesso ao e-mail corporativo",
        tiIntro: "T.I da Franqueadora:",
        tiItens: [
          "Criar a conta no provedor de e-mail corporativo, seguindo o padrão de nomenclatura da rede (ex: nomeloja@franquia.com.br).",
          "Credenciais de acesso enviadas ao franqueado, através do consultor responsável pela unidade ou para o time que esteja apoiando nesta etapa de interação com a unidade, com manual de primeiros passos e políticas de uso.",
          "Garantir que o franqueado entenda que o e-mail é uma ferramenta de trabalho e que a matriz pode auditar o uso para segurança da informação.",
        ],
      },
      {
        id: "nl-2",
        codigo: "1.2",
        titulo: "Fornece modelo padrão para aquisição de equipamentos da loja",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          'Entregar uma "Cartilha de Hardware" contendo as especificações mínimas (Processador, RAM, SSD, Sistema Operacional, requisitos de rede) para:',
        tiItens: [
          "Servidor local (caixa), terminais de PDV (lançamento), impressoras fiscais/não fiscais e explicação de como os equipamentos devem estar conectados na rede/internet",
        ],
        entregavel:
          "Documento PDF ou planilha com especificações técnicas e, se possível, uma lista de fornecedores homologados.",
        pontoAtencao:
          "Evitar que o franqueado compre equipamentos baratos ou incompatíveis que gerarão gargalos e chamados de suporte futuros.",
      },
      {
        id: "nl-3",
        codigo: "1.3",
        titulo: "Acompanha e explica ao time de TI da loja durante a construção da unidade",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Reuniões de alinhamento (kick-off) com o responsável de TI da obra ou o franqueado. Explicar a topologia de rede necessária (cabeamento estruturado, pontos de rede, elétrica estabilizada, localização do rack).",
        entregavel: "Checklist de infraestrutura validado (pontos de rede, tomadas, espaço físico para servidores).",
        pontoAtencao:
          "Atrasos na obra ou falta de infraestrutura de rede (ex: passar cabo depois do drywall pronto) geram custos altíssimos e atrasam a abertura.",
      },
      {
        id: "nl-4",
        codigo: "1.4",
        titulo: "Valida junto ao time de TI da loja layout de equipamentos instalados e configurados",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Vistoria (remota via fotos/vídeo) para confirmar se os equipamentos estão instalados conforme o padrão (ex: terminal de PDV não exposto ao calor, cabos organizados, roteador em local ventilado).",
        entregavel: "Termo de Validação de Infraestrutura assinado (ou e-mail de aprovação).",
        pontoAtencao:
          "Verificar se a rede elétrica está devidamente aterrada e se os nobreaks estão dimensionados corretamente para evitar queima de equipamentos.",
      },
      {
        id: "nl-5",
        codigo: "1.5",
        titulo: "Apoia implantação do sistema de venda (PDV)",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Suporte remoto ou presencial para instalar o software de PDV, configurar o banco de dados local, apontar para o servidor da matriz (se for nuvem/híbrido) e configurar os periféricos (impressora, balança, leitor).",
        entregavel: "Sistema de PDV instalado e comunicando com a retaguarda.",
        pontoAtencao:
          "Garantir que a conectividade com a internet esteja estável antes de iniciar a implantação do PDV.",
      },
      {
        id: "nl-6",
        codigo: "1.6",
        titulo: "Valida implantação do sistema de venda (PDV)",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Realizar testes de mesa (simular uma venda, emitir cupom fiscal, cancelar item, fechar caixa) para garantir que todas as regras de negócio estão funcionando.",
        entregavel: "Checklist de Testes de Aceite (UAT) preenchido e aprovado.",
        pontoAtencao:
          "Nunca validar sem antes testar a emissão fiscal (SAT/NFC-e) e a integração com meios de pagamento (TEF).",
      },
      {
        id: "nl-7",
        codigo: "1.7",
        titulo: "Solicita treinamento de sistema de venda (PDV) para o time operacional da unidade",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Agendar e intermediar o treinamento com a equipe de Treinamento da aplicação de PDV oficial. Fornecer manuais rápidos (Quick Reference Guides) para os operadores de caixa.",
        entregavel: "Turma agendada e material de apoio entregue.",
        pontoAtencao:
          'O treinamento deve focar no "como fazer" e não no "porquê" técnico, para não confundir os operadores.',
      },
    ],
  },
  {
    id: "pos",
    codigo: "2",
    titulo: "Pós-Implantação",
    subtitulo: "Fase de Estabilização e Autonomia",
    passos: [
      {
        id: "pos-1",
        codigo: "2.1",
        titulo:
          "Solicita treinamento de retaguarda de sistema de venda (PDV) para o time de gestão da unidade (gerente, operador e franqueado)",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Agendar treinamento focado em relatórios gerenciais, cadastro de produtos, controle de estoque, fechamento de caixa e parametrização do sistema.",
        entregavel: "Treinamento realizado e acesso liberado para os perfis de gestão.",
        pontoAtencao:
          "O franqueado precisa entender que ele é o responsável pela gestão dos dados da loja; a matriz fornece a ferramenta, mas a operação é dele.",
      },
      {
        id: "pos-2",
        codigo: "2.2",
        titulo: "Apresenta fluxo de atendimento do sistema de vendas",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Explicar claramente o fluxo de abertura de chamados (Helpdesk). Definir o que é responsabilidade da loja (ex: trocar cabo de rede), o que é do suporte da aplicação de PDV e o que é do TI da franqueadora. Explicar sobre os SLAs (prazos de atendimento).",
        entregavel: 'Documento ou apresentação com o "Fluxo de Atendimento" e contatos de suporte.',
        pontoAtencao:
          "Deixar claro que problemas de infraestrutura local (internet caindo, computador queimado) não são responsabilidade do suporte do sistema, a menos que haja contrato de infraestrutura.",
      },
      {
        id: "pos-3",
        codigo: "2.3",
        titulo: "Apoia dúvidas sobre cardápio no sistema",
        tiIntro: "T.I da Franqueadora:",
        tiTexto:
          "Auxiliar o franqueado nas dúvidas iniciais sobre cardápio (cadastro de produtos, preços, dinâmica, combos, promoções) dentro do sistema de PDV.",
        entregavel: "Cardápio configurado e validado.",
        pontoAtencao:
          "Fora o padrão de cardápio definido pela franqueadora atualmente, o TI da franqueadora não terá autorização de atualizações de novos produtos, preços, adicionar combos, promoções e dinâmica desejadas pelo franqueado. Essa prática precisa ser realizada através de uma solicitação para o consultor da unidade.",
      },
    ],
  },
];

const NOS_MICRO_FRANQUEADO: NoOrg[] = [
  { id: "raiz", titulo: "Para o franqueado", parent: null },
  ...FASES_MICRO_FRANQUEADO.flatMap((fase) => [
    { id: fase.id, titulo: fase.titulo, subtitulo: fase.subtitulo, parent: "raiz" as string | null },
    ...fase.passos.map((p) => ({
      id: p.id,
      titulo: `${p.codigo} ${p.titulo}`,
      parent: fase.id,
      conteudo: "detalhe",
    })),
  ]),
];

const PASSOS_MICRO_POR_ID = new Map(
  FASES_MICRO_FRANQUEADO.flatMap((f) => f.passos.map((p) => [p.id, { ...p, fase: f }] as const)),
);

function DetalhePassoMicro({ passo }: { passo: PassoMicroFranqueado }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <p className="font-semibold text-foreground">{passo.tiIntro ?? "T.I da Franqueadora:"}</p>
        {passo.tiTexto && <p className="leading-relaxed text-muted-foreground">{passo.tiTexto}</p>}
        {passo.tiItens && passo.tiItens.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
            {passo.tiItens.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
      {passo.entregavel && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Entregável</p>
          <p className="leading-relaxed text-muted-foreground">{passo.entregavel}</p>
        </div>
      )}
      {passo.pontoAtencao && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Ponto de atenção
          </p>
          <p className="leading-relaxed text-muted-foreground">{passo.pontoAtencao}</p>
        </div>
      )}
    </div>
  );
}

function AbaMicroFranqueado() {
  const [grafico, setGrafico] = useState(true);
  const [passoAberto, setPassoAberto] = useState<PassoMicroFranqueado | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Micro área p/ franqueado</CardTitle>
        <div className="flex flex-wrap gap-2">
          <BotaoGrafico grafico={grafico} onChange={setGrafico} />
          <ExportarMenu
            titulo="Micro área p/ franqueado"
            colunas={COLUNAS_MICRO_FRANQUEADO}
            linhas={FASES_MICRO_FRANQUEADO.flatMap((fase) =>
              fase.passos.map((passo) => ({
                fase: `${fase.codigo}. ${fase.titulo} — ${fase.subtitulo}`,
                codigo: passo.codigo,
                passo: passo.titulo,
                ti: textoPassoMicro(passo),
                entregavel: passo.entregavel ?? "",
                ponto_atencao: passo.pontoAtencao ?? "",
              })),
            )}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {grafico ? (
          <div className="org-franqueado">
            <OrgChart
              nos={NOS_MICRO_FRANQUEADO}
              fullWidth
              onSelect={(no) => {
                const passo = PASSOS_MICRO_POR_ID.get(no.id);
                if (passo) setPassoAberto(passo);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {FASES_MICRO_FRANQUEADO.map((fase) => (
              <section key={fase.id} className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold">
                    {fase.codigo}. {fase.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground">{fase.subtitulo}</p>
                </div>
                <Accordion type="multiple" className="rounded-lg border px-4">
                  {fase.passos.map((passo) => (
                    <AccordionItem key={passo.id} value={passo.id}>
                      <AccordionTrigger>
                        <span className="pr-2">
                          <span className="mr-2 text-primary">{passo.codigo}</span>
                          {passo.titulo}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <DetalhePassoMicro passo={passo} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!passoAberto} onOpenChange={(o) => !o && setPassoAberto(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {passoAberto ? `${passoAberto.codigo} ${passoAberto.titulo}` : "Detalhe"}
            </DialogTitle>
          </DialogHeader>
          {passoAberto && <DetalhePassoMicro passo={passoAberto} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
