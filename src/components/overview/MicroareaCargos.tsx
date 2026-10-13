import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Copy, Loader2, Network, Pencil, Plus, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ExportarMenu } from "@/components/ExportarMenu";
import { EditorFormatado } from "@/components/infra/EditorFormatado";
import { ConteudoRico } from "@/components/infra/ConteudoRico";
import { supabase } from "@/integrations/supabase/client";
import { textoExportacao } from "@/lib/exportar";
import { MICROAREAS, CARGOS_MICROAREA, chaveFuncoes, copiarFuncoes, type FuncaoMicroarea, type VersaoCargos } from "@/lib/microarea-cargos";

type Rascunho = Omit<VersaoCargos, "id"> & { id?: string };

export function MicroareaCargos({ workspaceId, podeEditar }: { workspaceId: string; podeEditar: boolean }) {
  const qc = useQueryClient();
  const [grafico, setGrafico] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<FuncaoMicroarea | null>(null);
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const queryKey = ["microarea-cargo-versions", workspaceId];
  const consulta = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("microarea_cargo_versions").select("*").eq("workspace_id", workspaceId).order("created_at");
      if (error) throw error;
      const { data: legadas, error: erroLegado } = await supabase.from("microarea_role_functions").select("microarea,cargo,funcoes_html").eq("workspace_id", workspaceId);
      if (erroLegado) throw erroLegado;
      return { versoes: (data ?? []) as unknown as VersaoCargos[], legadas: (legadas ?? []) as FuncaoMicroarea[] };
    },
  });
  const versoes = consulta.data?.versoes ?? [];
  const versao = versoes.find((v) => v.id === selecionada) ?? versoes.find((v) => v.atual) ?? versoes.at(-1);
  const funcoes = copiarFuncoes(versao?.funcoes ?? consulta.data?.legadas ?? []);
  const salvar = useMutation({
    mutationFn: async (v: Rascunho) => {
      if (!podeEditar) throw new Error("Você não pode editar as funções nesta empresa.");
      const payload = { workspace_id: workspaceId, nome: v.nome.trim(), periodo: v.periodo || null, atual: v.atual,
        funcoes: copiarFuncoes(v.funcoes).map((f) => ({ ...f, funcoes_html: DOMPurify.sanitize(f.funcoes_html) })), updated_at: new Date().toISOString() };
      // Clear the current flag only when another version is being promoted.
      if (v.atual) {
        let desmarcar = supabase.from("microarea_cargo_versions").update({ atual: false }).eq("workspace_id", workspaceId).eq("atual", true);
        if (v.id) desmarcar = desmarcar.neq("id", v.id);
        const { error } = await desmarcar;
        if (error) throw error;
      }
      const { data, error } = v.id
        ? await supabase.from("microarea_cargo_versions").update(payload).eq("id", v.id).eq("workspace_id", workspaceId).select("id").single()
        : await supabase.from("microarea_cargo_versions").insert(payload).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      setSelecionada(id);
      await qc.invalidateQueries({ queryKey });
      setSelecionado(null); setEditando(null);
      toast.success("Versão salva");
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });
  const rascunhoAtual = (): Rascunho => ({ ...(versao ? { id: versao.id } : {}), nome: versao?.nome ?? "Visão atual", periodo: versao?.periodo ?? null, atual: versao?.atual ?? true, funcoes });
  const abrirCargo = (item: FuncaoMicroarea) => setSelecionado({ ...item });

  return (
    <section className="mt-6 border-t pt-6" aria-labelledby="microarea-cargos-titulo">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="microarea-cargos-titulo" className="text-base font-semibold">Microáreas e funções por cargo</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant={grafico ? "default" : "outline"} size="sm" onClick={() => setGrafico(!grafico)}>{grafico ? <Table2 className="mr-2 h-4 w-4" /> : <Network className="mr-2 h-4 w-4" />}{grafico ? "Lista" : "Gráfico"}</Button>
            <ExportarMenu size="sm" titulo={`Microáreas e funções por cargo — ${versao?.nome ?? "Visão atual"}`} colunas={[{ chave: "microarea", titulo: "Microárea" }, { chave: "cargo", titulo: "Cargo" }, { chave: "funcoes", titulo: "Funções" }]} linhas={funcoes.map((f) => ({ microarea: f.microarea, cargo: f.cargo, funcoes: textoExportacao(f.funcoes_html) }))} />
            {podeEditar && <>
              <Button size="sm" variant="outline" disabled={consulta.isPending || consulta.isError} onClick={() => setEditando(rascunhoAtual())}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
              <Button size="sm" variant="outline" disabled={consulta.isPending || consulta.isError} onClick={() => setEditando({ nome: "Nova visão", periodo: String(new Date().getFullYear()), atual: false, funcoes: copiarFuncoes(funcoes) })}><Copy className="mr-2 h-4 w-4" />Nova versão a partir desta</Button>
              <Button size="sm" disabled={consulta.isPending || consulta.isError} onClick={() => setEditando({ nome: "", periodo: "", atual: !versoes.length, funcoes: copiarFuncoes([]) })}><Plus className="mr-2 h-4 w-4" />Versão</Button>
            </>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {versoes.length ? versoes.map((v) => <Button key={v.id} variant="outline" size="sm" onClick={() => setSelecionada(v.id)} className={`h-auto rounded-full px-3 py-1 text-xs ${versao?.id === v.id ? "border-primary bg-primary/15 text-primary" : ""}`}>{v.nome}{v.periodo ? ` (${v.periodo})` : ""}{v.atual && " • atual"}</Button>) : <span className="rounded-full border border-primary bg-primary/15 px-3 py-1 text-xs text-primary">Visão atual • atual</span>}
        </div>
      </header>
      {consulta.isPending ? <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando funções" /></div>
      : consulta.isError ? <div className="py-8 text-sm text-destructive">Não foi possível carregar as funções. <Button variant="outline" size="sm" onClick={() => consulta.refetch()}>Tentar novamente</Button></div>
      : grafico ? <div className="microarea-chart py-6">
          <div className="microarea-top text-sm">T.I.</div>
          <div className="microarea-branches">{MICROAREAS.map((microarea) => <div key={microarea} className="microarea-branch">
            <h3 className="microarea-area text-sm">{microarea}</h3>
            {CARGOS_MICROAREA.map((cargo) => { const item = funcoes.find((f) => f.microarea === microarea && f.cargo === cargo); return item && <div key={cargo} className="microarea-role"><Button variant="outline" className="h-auto min-h-14 w-full whitespace-normal border-primary/60 bg-card px-3 py-3 text-sm text-card-foreground" aria-label={`${cargo} — ${microarea}`} onClick={() => abrirCargo(item)}>{cargo}</Button></div>; })}
          </div>)}</div>
        </div>
      : <div className="overflow-x-auto py-6"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr className="border-b"><th className="p-2">Microárea</th><th className="p-2">Cargo</th><th className="p-2">Funções</th></tr></thead><tbody>{funcoes.map((item) => <tr key={chaveFuncoes(item.microarea, item.cargo)} className="border-b last:border-0"><td className="p-2">{item.microarea}</td><td className="p-2"><Button variant="link" className="h-auto p-0 text-sm" onClick={() => abrirCargo(item)}>{item.cargo}</Button></td><td className="max-w-md p-2"><p className="line-clamp-2 break-words">{textoExportacao(item.funcoes_html) || "—"}</p></td></tr>)}</tbody></table></div>}
      <Dialog open={selecionado !== null} onOpenChange={(open) => { if (!open && !salvar.isPending) setSelecionado(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{selecionado?.cargo} — {selecionado?.microarea}</DialogTitle><DialogDescription>Funções do cargo — {versao?.nome ?? "Visão atual"}</DialogDescription></DialogHeader>
          {selecionado && (podeEditar ? <EditorFormatado key={chaveFuncoes(selecionado.microarea, selecionado.cargo)} id="funcoes-microarea" value={selecionado.funcoes_html} onChange={(html) => setSelecionado({ ...selecionado, funcoes_html: html })} placeholder="Descreva as funções deste cargo..." /> : <ConteudoRico html={DOMPurify.sanitize(selecionado.funcoes_html)} />)}
          <DialogFooter><Button variant="outline" disabled={salvar.isPending} onClick={() => setSelecionado(null)}>Fechar</Button>{podeEditar && <Button disabled={!selecionado || salvar.isPending} onClick={() => { if (selecionado) salvar.mutate({ ...rascunhoAtual(), funcoes: funcoes.map((f) => chaveFuncoes(f.microarea, f.cargo) === chaveFuncoes(selecionado.microarea, selecionado.cargo) ? selecionado : f) }); }}>{salvar.isPending ? "Salvando..." : "Salvar funções"}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editando !== null} onOpenChange={(open) => { if (!open && !salvar.isPending) setEditando(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>{editando?.id ? "Editar versão" : "Nova versão"} — Microáreas e funções por cargo</DialogTitle></DialogHeader>
          {editando && <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3"><div className="sm:col-span-2"><Label htmlFor="cargo-versao-nome">Nome da visão</Label><Input id="cargo-versao-nome" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></div><div><Label htmlFor="cargo-versao-periodo">Período</Label><Input id="cargo-versao-periodo" value={editando.periodo ?? ""} onChange={(e) => setEditando({ ...editando, periodo: e.target.value })} /></div></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={editando.atual} onCheckedChange={(atual) => setEditando({ ...editando, atual })} />Marcar como visão atual</label>
            {editando.funcoes.map((f, i) => <div key={chaveFuncoes(f.microarea, f.cargo)} className="space-y-2 border-t pt-4"><h3 className="text-sm font-semibold">{f.cargo} — {f.microarea}</h3><EditorFormatado id={`versao-cargo-${i}`} value={f.funcoes_html} onChange={(html) => setEditando({ ...editando, funcoes: editando.funcoes.map((item, j) => i === j ? { ...item, funcoes_html: html } : item) })} placeholder="Descreva as funções deste cargo..." /></div>)}
          </div>}
          <DialogFooter><Button variant="outline" disabled={salvar.isPending} onClick={() => setEditando(null)}>Cancelar</Button><Button disabled={!editando?.nome.trim() || salvar.isPending} onClick={() => { if (editando) salvar.mutate(editando); }}>{salvar.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
