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
import { ExportarMenu } from "@/components/ExportarMenu";
import { OrgChart, type NoOrg } from "@/components/overview/OrgChart";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";

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

  function alternarApresentacao() {
    const v = !apresentacao;
    setApresentacao(v);
    if (v) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  const conteudo = (
    <Tabs defaultValue="colaboradores" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
        <TabsTrigger value="macro">Macro área</TabsTrigger>
        <TabsTrigger value="micro">Micro área</TabsTrigger>
        <TabsTrigger value="individual">Por colaborador</TabsTrigger>
      </TabsList>
      <TabsContent value="colaboradores">
        <AbaColaboradores ws={ws} membros={membros.data ?? []} podeEditar={podeEditar && !apresentacao} />
      </TabsContent>
      <TabsContent value="macro">
        <AbaVersoes tipo="macro" ws={ws} versoes={(versoes.data ?? []).filter((v) => v.tipo === "macro")} podeEditar={podeEditar && !apresentacao} />
      </TabsContent>
      <TabsContent value="micro">
        <AbaVersoes tipo="micro" ws={ws} versoes={(versoes.data ?? []).filter((v) => v.tipo === "micro")} podeEditar={podeEditar && !apresentacao} />
      </TabsContent>
      <TabsContent value="individual">
        <AbaIndividual membros={membros.data ?? []} />
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
        <Button onClick={alternarApresentacao}><Maximize className="mr-2 h-4 w-4" /> Modo apresentação</Button>
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
            colunas={[{ chave: "nome", titulo: "Nome" }, { chave: "cargo", titulo: "Cargo" }, { chave: "nivel", titulo: "Nível" }, { chave: "area", titulo: "Área" }, { chave: "gestor", titulo: "Reporta a" }, { chave: "atribuicoes", titulo: "Atribuições" }]}
            linhas={membros.map((m) => ({ ...m, gestor: m.gestor_id ? nomePorId.get(m.gestor_id) : "" }))}
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
  const versao = versoes.find((v) => v.id === selecionada) ?? versoes.find((v) => v.atual) ?? versoes[versoes.length - 1];
  const rotulo = tipo === "macro" ? "Macro área" : "Micro área";

  const salvar = useMutation({
    mutationFn: async (v: Omit<Versao, "id"> & { id?: string }) => {
      if (v.atual) await db.from("org_versions").update({ atual: false }).eq("workspace_id", ws).eq("tipo", tipo);
      const payload = { workspace_id: ws, tipo, nome: v.nome.trim(), periodo: v.periodo || null, atual: v.atual, nodes: v.nodes.filter((n) => n.titulo.trim()), updated_at: new Date().toISOString() };
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

  const novoNo = (): NoOrg => ({ id: crypto.randomUUID().slice(0, 8), titulo: "", subtitulo: "", parent: null });

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Organograma — {rotulo}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <BotaoGrafico grafico={grafico} onChange={setGrafico} />
            {podeEditar && versao && <Button size="sm" variant="outline" onClick={() => setEditando({ id: versao.id, tipo, nome: versao.nome, periodo: versao.periodo, atual: versao.atual, nodes: versao.nodes })}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>}
            {podeEditar && versao && <Button size="sm" variant="outline" onClick={() => setEditando({ tipo, nome: `Nova visão`, periodo: String(new Date().getFullYear()), atual: true, nodes: versao.nodes })}><Copy className="mr-2 h-4 w-4" /> Nova versão a partir desta</Button>}
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
        {!versao ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma versão cadastrada.</p> : grafico ? <OrgChart nos={versao.nodes} /> : (
          <ul className="space-y-1 text-sm">
            {versao.nodes.map((n) => (
              <li key={n.id} className="flex flex-wrap gap-2 border-b py-2 last:border-0">
                <span className="font-medium">{n.titulo}</span>
                {n.subtitulo && <span className="text-muted-foreground">— {n.subtitulo}</span>}
                {n.parent && <Badge variant="secondary">abaixo de {versao.nodes.find((p) => p.id === n.parent)?.titulo}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editando?.id ? "Editar versão" : "Nova versão"} — {rotulo}</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2"><Label>Nome da visão</Label><Input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></div>
                <div><Label>Período</Label><Input placeholder="Ex.: 2024" value={editando.periodo ?? ""} onChange={(e) => setEditando({ ...editando, periodo: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={editando.atual} onCheckedChange={(c) => setEditando({ ...editando, atual: c })} /> Marcar como visão atual</label>
              <div className="space-y-2">
                <Label>Blocos do organograma</Label>
                {editando.nodes.map((n, i) => (
                  <div key={n.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input placeholder="Título" value={n.titulo} onChange={(e) => { const nodes = [...editando.nodes]; nodes[i] = { ...n, titulo: e.target.value }; setEditando({ ...editando, nodes }); }} />
                    <Input placeholder="Detalhe (opcional)" value={n.subtitulo ?? ""} onChange={(e) => { const nodes = [...editando.nodes]; nodes[i] = { ...n, subtitulo: e.target.value }; setEditando({ ...editando, nodes }); }} />
                    <select className="h-9 rounded-md border bg-background px-2 text-sm" value={n.parent ?? ""} onChange={(e) => { const nodes = [...editando.nodes]; nodes[i] = { ...n, parent: e.target.value || null }; setEditando({ ...editando, nodes }); }}>
                      <option value="">— Topo —</option>
                      {editando.nodes.filter((p) => p.id !== n.id && p.titulo).map((p) => <option key={p.id} value={p.id}>Abaixo de {p.titulo}</option>)}
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => setEditando({ ...editando, nodes: editando.nodes.filter((x) => x.id !== n.id).map((x) => (x.parent === n.id ? { ...x, parent: n.parent } : x)) })}><Trash2 className="h-4 w-4" /></Button>
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
