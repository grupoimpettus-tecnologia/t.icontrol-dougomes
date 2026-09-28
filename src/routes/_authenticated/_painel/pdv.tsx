import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ClipboardList, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorFormatado } from "@/components/infra/EditorFormatado";
import { ConteudoRico } from "@/components/infra/ConteudoRico";
import { DetalhePassoMicro } from "@/components/overview/DetalhePassoMicro";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { enviarConfirmacaoImplantacao } from "@/lib/pdv.functions";
import {
  FASES_MICRO_FRANQUEADO,
  TOTAL_PASSOS_MICRO,
  type FaseMicroFranqueado,
  type PassoMicroFranqueado,
} from "@/data/micro-franqueado";

// Tabelas novas ainda não presentes nos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_painel/pdv")({
  head: () => ({
    meta: [
      { title: "Sistema PDV | TIControl" },
      { name: "description", content: "Implantação de lojas e gestão do ponto de venda." },
      { property: "og:title", content: "Sistema PDV | TIControl" },
      { property: "og:description", content: "Implantação de lojas e gestão do ponto de venda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SistemaPdv,
});

type StatusLoja = "fase_inicial" | "em_andamento" | "em_lancamento" | "concluida";

type LojaPdv = {
  id: string;
  nome: string;
  marca: string;
  cnpj: string;
  status: StatusLoja;
  created_at: string;
};

type EtapaLoja = {
  id: string;
  loja_id: string;
  etapa_id: string;
  concluida: boolean;
  evidencia_html: string | null;
};

const STATUS_OPCOES: { valor: StatusLoja; rotulo: string }[] = [
  { valor: "fase_inicial", rotulo: "Fase inicial" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "em_lancamento", rotulo: "Em lançamento" },
  { valor: "concluida", rotulo: "Concluída" },
];

const CORES_STATUS: Record<StatusLoja, string> = {
  fase_inicial: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  em_andamento: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  em_lancamento: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  concluida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

function rotuloStatus(status: StatusLoja) {
  return STATUS_OPCOES.find((s) => s.valor === status)?.rotulo ?? status;
}

function formatarCnpj(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cnpjValido(valor: string) {
  return valor.replace(/\D/g, "").length === 14;
}

function temEvidencia(html: string | null | undefined) {
  if (!html?.trim()) return false;
  const texto = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return Boolean(texto) || /data-anexo/.test(html);
}

function SistemaPdv() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sistema PDV</h1>
        <p className="text-sm text-muted-foreground">
          Implantação de lojas, checklist de etapas e evidências do go-live.
        </p>
      </div>
      <Tabs defaultValue="implantacao" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="implantacao">Implantação de loja</TabsTrigger>
        </TabsList>
        <TabsContent value="implantacao">
          <AbaImplantacaoLoja />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const lojaVazia = { nome: "", marca: "", cnpj: "" };

function AbaImplantacaoLoja() {
  const atual = useCurrentWorkspace();
  const ws = atual?.workspace.id;
  const podeEditar = atual?.role === "master" || atual?.role === "admin" || atual?.role === "tecnico";
  const qc = useQueryClient();
  const [cadastro, setCadastro] = useState<typeof lojaVazia | null>(null);
  const [editando, setEditando] = useState<(typeof lojaVazia & { id: string; status: StatusLoja }) | null>(null);
  const [checklistLoja, setChecklistLoja] = useState<LojaPdv | null>(null);

  const lojas = useQuery({
    queryKey: ["pdv_lojas", ws],
    enabled: !!ws,
    queryFn: async (): Promise<LojaPdv[]> => {
      const { data, error } = await db
        .from("pdv_lojas")
        .select("id, nome, marca, cnpj, status, created_at")
        .eq("workspace_id", ws)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const etapas = useQuery({
    queryKey: ["pdv_loja_etapas", ws],
    enabled: !!ws,
    queryFn: async (): Promise<EtapaLoja[]> => {
      const { data, error } = await db
        .from("pdv_loja_etapas")
        .select("id, loja_id, etapa_id, concluida, evidencia_html")
        .eq("workspace_id", ws);
      if (error) throw error;
      return data ?? [];
    },
  });

  const progressoPorLoja = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of etapas.data ?? []) {
      if (!e.concluida) continue;
      mapa.set(e.loja_id, (mapa.get(e.loja_id) ?? 0) + 1);
    }
    return mapa;
  }, [etapas.data]);

  const criar = useMutation({
    mutationFn: async (dados: typeof lojaVazia) => {
      const { error } = await db.from("pdv_lojas").insert({
        workspace_id: ws,
        nome: dados.nome.trim(),
        marca: dados.marca.trim(),
        cnpj: formatarCnpj(dados.cnpj),
        status: "fase_inicial",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja cadastrada");
      setCadastro(null);
      qc.invalidateQueries({ queryKey: ["pdv_lojas"] });
    },
    onError: (e: Error) => {
      const msg = e.message || "";
      if (/pdv_lojas|schema cache|Could not find the table/i.test(msg)) {
        toast.error("Tabela ainda não criada no banco", {
          description:
            "Execute a migration 0015_pdv_implantacao_lojas.sql no SQL Editor do Supabase e tente novamente.",
        });
        return;
      }
      toast.error("Não foi possível cadastrar", { description: msg });
    },
  });

  const atualizar = useMutation({
    mutationFn: async (dados: typeof lojaVazia & { id: string; status: StatusLoja }) => {
      const { error } = await db
        .from("pdv_lojas")
        .update({
          nome: dados.nome.trim(),
          marca: dados.marca.trim(),
          cnpj: formatarCnpj(dados.cnpj),
          status: dados.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dados.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja atualizada");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["pdv_lojas"] });
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("pdv_lojas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja removida");
      qc.invalidateQueries({ queryKey: ["pdv_lojas"] });
      qc.invalidateQueries({ queryKey: ["pdv_loja_etapas"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Implantação de loja</CardTitle>
          {podeEditar && (
            <Button size="sm" onClick={() => setCadastro({ ...lojaVazia })}>
              <Plus className="mr-2 h-4 w-4" /> Nova loja
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="p-2">Loja</th>
                  <th className="p-2">Marca</th>
                  <th className="p-2">CNPJ</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Checklist</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {(lojas.data ?? []).map((loja) => {
                  const feitos = progressoPorLoja.get(loja.id) ?? 0;
                  return (
                    <tr key={loja.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">{loja.nome}</td>
                      <td className="p-2">{loja.marca}</td>
                      <td className="p-2 whitespace-nowrap">{loja.cnpj}</td>
                      <td className="p-2">
                        <Badge variant="secondary" className={cn(CORES_STATUS[loja.status])}>
                          {rotuloStatus(loja.status)}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {feitos}/{TOTAL_PASSOS_MICRO}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => setChecklistLoja(loja)}>
                          <ClipboardList className="mr-2 h-4 w-4" /> Fluxograma
                        </Button>
                        {podeEditar && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setEditando({
                                  id: loja.id,
                                  nome: loja.nome,
                                  marca: loja.marca,
                                  cnpj: loja.cnpj,
                                  status: loja.status,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirm(`Remover ${loja.nome}?`) && excluir.mutate(loja.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!lojas.data?.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Nenhuma loja cadastrada. Clique em Nova loja para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!cadastro} onOpenChange={(o) => !o && setCadastro(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova loja</DialogTitle>
          </DialogHeader>
          {cadastro && (
            <div className="space-y-3">
              <div>
                <Label>Nome da loja</Label>
                <Input
                  value={cadastro.nome}
                  onChange={(e) => setCadastro({ ...cadastro, nome: e.target.value })}
                  placeholder="Ex.: Espetto Carioca — Botafogo"
                />
              </div>
              <div>
                <Label>Nome da marca</Label>
                <Input
                  value={cadastro.marca}
                  onChange={(e) => setCadastro({ ...cadastro, marca: e.target.value })}
                  placeholder="Ex.: Espetto Carioca"
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={cadastro.cnpj}
                  onChange={(e) => setCadastro({ ...cadastro, cnpj: formatarCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A loja será criada com status <strong>Fase inicial</strong>.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCadastro(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !cadastro?.nome.trim() ||
                !cadastro?.marca.trim() ||
                !cnpjValido(cadastro?.cnpj ?? "") ||
                criar.isPending
              }
              onClick={() => cadastro && criar.mutate(cadastro)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar loja</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-3">
              <div>
                <Label>Nome da loja</Label>
                <Input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
              </div>
              <div>
                <Label>Nome da marca</Label>
                <Input value={editando.marca} onChange={(e) => setEditando({ ...editando, marca: e.target.value })} />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={editando.cnpj}
                  onChange={(e) => setEditando({ ...editando, cnpj: formatarCnpj(e.target.value) })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={editando.status}
                  onChange={(e) => setEditando({ ...editando, status: e.target.value as StatusLoja })}
                >
                  {STATUS_OPCOES.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !editando?.nome.trim() ||
                !editando?.marca.trim() ||
                !cnpjValido(editando?.cnpj ?? "") ||
                atualizar.isPending
              }
              onClick={() => editando && atualizar.mutate(editando)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {checklistLoja && (
        <ModalChecklistLoja
          loja={checklistLoja}
          ws={ws}
          podeEditar={podeEditar}
          etapas={(etapas.data ?? []).filter((e) => e.loja_id === checklistLoja.id)}
          onClose={() => setChecklistLoja(null)}
        />
      )}
    </>
  );
}

function ModalChecklistLoja({
  loja,
  ws,
  podeEditar,
  etapas,
  onClose,
}: {
  loja: LojaPdv;
  ws: string | undefined;
  podeEditar: boolean;
  etapas: EtapaLoja[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const enviarConfirmacaoFn = useServerFn(enviarConfirmacaoImplantacao);
  const [evidenciaPasso, setEvidenciaPasso] = useState<PassoMicroFranqueado | null>(null);
  const [evidenciaHtml, setEvidenciaHtml] = useState("");
  const [confirmacaoFase, setConfirmacaoFase] = useState<FaseMicroFranqueado | null>(null);
  const [emailsConfirmacao, setEmailsConfirmacao] = useState({
    emailLoja: "",
    emailArea: "",
    emailTi: "",
  });

  const etapaPorId = useMemo(() => new Map(etapas.map((e) => [e.etapa_id, e])), [etapas]);
  const feitos = etapas.filter((e) => e.concluida).length;

  const salvarEvidencia = useMutation({
    mutationFn: async ({ passo, html }: { passo: PassoMicroFranqueado; html: string }) => {
      if (!ws) throw new Error("Workspace não encontrado");
      if (!temEvidencia(html)) throw new Error("Informe o texto ou anexe uma evidência da etapa.");
      const existente = etapaPorId.get(passo.id);
      const payload = {
        loja_id: loja.id,
        workspace_id: ws,
        etapa_id: passo.id,
        concluida: true,
        evidencia_html: html,
        concluida_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (existente) {
        const { error } = await db.from("pdv_loja_etapas").update(payload).eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("pdv_loja_etapas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Etapa concluída com evidência");
      setEvidenciaPasso(null);
      setEvidenciaHtml("");
      qc.invalidateQueries({ queryKey: ["pdv_loja_etapas"] });
    },
    onError: (e: Error) => toast.error("Não foi possível salvar a evidência", { description: e.message }),
  });

  const desmarcar = useMutation({
    mutationFn: async (passoId: string) => {
      const existente = etapaPorId.get(passoId);
      if (!existente) return;
      const { error } = await db
        .from("pdv_loja_etapas")
        .update({
          concluida: false,
          concluida_em: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existente.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa reaberta");
      qc.invalidateQueries({ queryKey: ["pdv_loja_etapas"] });
    },
    onError: (e: Error) => toast.error("Não foi possível atualizar", { description: e.message }),
  });

  const enviarConfirmacao = useMutation({
    mutationFn: async () => {
      if (!confirmacaoFase) throw new Error("Fase não selecionada");
      return enviarConfirmacaoFn({
        data: {
          lojaId: loja.id,
          faseId: confirmacaoFase.id as "nova-loja" | "pos",
          emailLoja: emailsConfirmacao.emailLoja.trim(),
          emailArea: emailsConfirmacao.emailArea.trim(),
          emailTi: emailsConfirmacao.emailTi.trim(),
        },
      });
    },
    onSuccess: (res) => {
      toast.success("Confirmação enviada", {
        description: `E-mail enviado para ${res.destinatarios.join(", ")}`,
      });
      setConfirmacaoFase(null);
      setEmailsConfirmacao({ emailLoja: "", emailArea: "", emailTi: "" });
    },
    onError: (e: Error) => toast.error("Não foi possível enviar a confirmação", { description: e.message }),
  });

  function aoAlternarCheck(passo: PassoMicroFranqueado, marcado: boolean) {
    if (!podeEditar) return;
    if (marcado) {
      const atual = etapaPorId.get(passo.id);
      setEvidenciaHtml(atual?.evidencia_html ?? "");
      setEvidenciaPasso(passo);
      return;
    }
    if (confirm(`Reabrir a etapa ${passo.codigo}? A evidência será mantida.`)) {
      desmarcar.mutate(passo.id);
    }
  }

  const emailsOk =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailsConfirmacao.emailLoja.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailsConfirmacao.emailArea.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailsConfirmacao.emailTi.trim());

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist — {loja.nome}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Fluxograma Micro área p/ franqueado · {feitos}/{TOTAL_PASSOS_MICRO} etapas concluídas
            </p>
          </DialogHeader>

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
                  {fase.passos.map((passo) => {
                    const etapa = etapaPorId.get(passo.id);
                    const concluida = Boolean(etapa?.concluida);
                    return (
                      <AccordionItem key={passo.id} value={passo.id}>
                        <div className="flex items-start gap-3 py-2">
                          <Checkbox
                            className="mt-3.5"
                            checked={concluida}
                            disabled={!podeEditar}
                            onCheckedChange={(v) => aoAlternarCheck(passo, v === true)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0 flex-1">
                            <AccordionTrigger className="py-2 hover:no-underline">
                              <span className="pr-2 text-left">
                                <span className="mr-2 text-primary">{passo.codigo}</span>
                                <span className={concluida ? "line-through opacity-70" : ""}>{passo.titulo}</span>
                                {concluida && (
                                  <Badge variant="secondary" className="ml-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                    Concluída
                                  </Badge>
                                )}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <DetalhePassoMicro passo={passo} />
                              {temEvidencia(etapa?.evidencia_html) && (
                                <div className="mt-4 rounded-md border p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Evidência registrada
                                  </p>
                                  <ConteudoRico html={etapa?.evidencia_html ?? ""} />
                                  {podeEditar && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-3"
                                      onClick={() => {
                                        setEvidenciaHtml(etapa?.evidencia_html ?? "");
                                        setEvidenciaPasso(passo);
                                      }}
                                    >
                                      Editar evidência
                                    </Button>
                                  )}
                                </div>
                              )}
                            </AccordionContent>
                          </div>
                        </div>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
                {podeEditar && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setConfirmacaoFase(fase);
                      setEmailsConfirmacao({ emailLoja: "", emailArea: "", emailTi: "" });
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" /> Gerar Confirmação
                  </Button>
                )}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!evidenciaPasso}
        onOpenChange={(o) => {
          if (!o) {
            setEvidenciaPasso(null);
            setEvidenciaHtml("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Evidência — {evidenciaPasso ? `${evidenciaPasso.codigo} ${evidenciaPasso.titulo}` : ""}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Descreva a conclusão da etapa e anexe imagens, PDF ou Excel como evidência.
            </p>
          </DialogHeader>
          {evidenciaPasso && (
            <div className="space-y-3">
              <DetalhePassoMicro passo={evidenciaPasso} />
              <div className="space-y-1.5">
                <Label>Registro e anexos</Label>
                <EditorFormatado
                  id={`evidencia-${loja.id}-${evidenciaPasso.id}`}
                  value={evidenciaHtml}
                  onChange={setEvidenciaHtml}
                  placeholder="Descreva o que foi feito, cole imagens ou anexe arquivos..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEvidenciaPasso(null);
                setEvidenciaHtml("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!temEvidencia(evidenciaHtml) || salvarEvidencia.isPending}
              onClick={() => evidenciaPasso && salvarEvidencia.mutate({ passo: evidenciaPasso, html: evidenciaHtml })}
            >
              Concluir etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmacaoFase}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmacaoFase(null);
            setEmailsConfirmacao({ emailLoja: "", emailArea: "", emailTi: "" });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Confirmação</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {confirmacaoFase
                ? `Enviar resumo da fase ${confirmacaoFase.codigo}. ${confirmacaoFase.titulo} — ${loja.nome}`
                : ""}
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>E-mail da loja</Label>
              <Input
                type="email"
                placeholder="loja@franquia.com.br"
                value={emailsConfirmacao.emailLoja}
                onChange={(e) => setEmailsConfirmacao({ ...emailsConfirmacao, emailLoja: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail da área envolvida</Label>
              <Input
                type="email"
                placeholder="area@empresa.com.br"
                value={emailsConfirmacao.emailArea}
                onChange={(e) => setEmailsConfirmacao({ ...emailsConfirmacao, emailArea: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail do time de T.I.</Label>
              <Input
                type="email"
                placeholder="ti@grupoimpettus.com.br"
                value={emailsConfirmacao.emailTi}
                onChange={(e) => setEmailsConfirmacao({ ...emailsConfirmacao, emailTi: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Assunto: [TIControl] Entrega Implantação de loja - {loja.nome}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmacaoFase(null);
                setEmailsConfirmacao({ emailLoja: "", emailArea: "", emailTi: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!emailsOk || enviarConfirmacao.isPending}
              onClick={() => enviarConfirmacao.mutate()}
            >
              {enviarConfirmacao.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
