import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditorFormatado } from "@/components/infra/EditorFormatado";
import { ConteudoRico } from "@/components/infra/ConteudoRico";
import { supabase } from "@/integrations/supabase/client";
import { MICROAREAS, CARGOS_MICROAREA, chaveFuncoes, type Microarea, type CargoMicroarea } from "@/lib/microarea-cargos";

type Selecionado = { microarea: Microarea; cargo: CargoMicroarea; html: string };

export function MicroareaCargos({ workspaceId, podeEditar }: { workspaceId: string; podeEditar: boolean }) {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<Selecionado | null>(null);
  const queryKey = ["microarea-role-functions", workspaceId];
  const funcoes = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("microarea_role_functions")
        .select("microarea,cargo,funcoes_html").eq("workspace_id", workspaceId);
      if (error) throw error;
      return data;
    },
  });
  const salvar = useMutation({
    mutationFn: async (item: Selecionado) => {
      if (!podeEditar) throw new Error("Você não pode editar as funções nesta empresa.");
      const { error } = await supabase.from("microarea_role_functions").upsert({
        workspace_id: workspaceId,
        microarea: item.microarea,
        cargo: item.cargo,
        funcoes_html: DOMPurify.sanitize(item.html),
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,microarea,cargo" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
      setSelecionado(null);
      toast.success("Funções salvas");
    },
    onError: () => toast.error("Não foi possível salvar as funções. Tente novamente."),
  });
  const porCargo = new Map(funcoes.data?.map((f) => [`${f.microarea}:${f.cargo}`, f.funcoes_html]));

  return (
    <section className="mt-6 border-t pt-6" aria-labelledby="microarea-cargos-titulo">
      <h2 id="microarea-cargos-titulo" className="text-xl font-semibold">Microáreas e funções por cargo</h2>
      {funcoes.isPending ? (
        <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando funções" /></div>
      ) : funcoes.isError ? (
        <div className="py-8 text-sm text-destructive">Não foi possível carregar as funções. <Button variant="outline" size="sm" onClick={() => funcoes.refetch()}>Tentar novamente</Button></div>
      ) : (
        <div className="microarea-chart py-6">
          <div className="microarea-top">T.I.</div>
          <div className="microarea-branches">
            {MICROAREAS.map((microarea) => (
              <div key={microarea} className="microarea-branch">
                <h3 className="microarea-area">{microarea}</h3>
                {CARGOS_MICROAREA.map((cargo) => {
                  const html = porCargo.get(chaveFuncoes(microarea, cargo)) ?? "";
                  return (
                    <div key={cargo} className="microarea-role">
                      <Button variant="outline" className="h-auto min-h-14 w-full whitespace-normal border-primary/60 bg-card px-3 py-3 text-card-foreground" aria-label={`${cargo} — ${microarea}`} onClick={() => setSelecionado({ microarea, cargo, html })}>
                        {cargo}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <Dialog open={selecionado !== null} onOpenChange={(open) => { if (!open && !salvar.isPending) setSelecionado(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selecionado?.cargo} — {selecionado?.microarea}</DialogTitle>
            <DialogDescription>Funções do cargo</DialogDescription>
          </DialogHeader>
          {selecionado && (podeEditar ? (
            <EditorFormatado key={chaveFuncoes(selecionado.microarea, selecionado.cargo)} id="funcoes-microarea" value={selecionado.html} onChange={(html) => setSelecionado({ ...selecionado, html })} placeholder="Descreva as funções deste cargo..." />
          ) : (
            <ConteudoRico html={DOMPurify.sanitize(selecionado.html)} />
          ))}
          <DialogFooter>
            <Button variant="outline" disabled={salvar.isPending} onClick={() => setSelecionado(null)}>Fechar</Button>
            {podeEditar && <Button disabled={!selecionado || salvar.isPending} onClick={() => { if (selecionado) salvar.mutate(selecionado); }}>{salvar.isPending ? "Salvando..." : "Salvar funções"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}