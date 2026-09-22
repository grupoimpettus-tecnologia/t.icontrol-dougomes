import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download, KeyRound, RefreshCw, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { gerarTokenAgente, definirManutencao } from "@/lib/equipments.functions";
import { gerarScriptAgente, situacaoAgente, agentStatusLabels } from "@/lib/agente";
import type { Registro } from "@/components/infra/RecursoCrud";

function baixarArquivo(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function PainelAgente({ item, podeGerenciar }: { item: Registro; podeGerenciar: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const gerar = useServerFn(gerarTokenAgente);
  const manutencao = useServerFn(definirManutencao);

  const patrimonio = String(item["patrimonio"] ?? "Equipamento");
  const situacao = situacaoAgente(item as never);
  const endpoint =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/agent/heartbeat` : "";

  const historico = useQuery({
    queryKey: ["equipment-heartbeats", item.id],
    enabled: aberto,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_heartbeats")
        .select("id, recebido_em, metricas")
        .eq("equipment_id", item.id)
        .order("recebido_em", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const gerarToken = useMutation({
    mutationFn: async () => await gerar({ data: { equipmentId: item.id } }),
    onSuccess: (res) => {
      setToken(res.token);
      toast.success("Token gerado", { description: "Copie agora: ele não será exibido de novo." });
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
    },
    onError: (e: Error) => toast.error("Não foi possível gerar o token", { description: e.message }),
  });

  const alternarManutencao = useMutation({
    mutationFn: async (valor: boolean) =>
      await manutencao({ data: { equipmentId: item.id, manutencao: valor } }),
    onSuccess: () => {
      toast.success("Situação atualizada");
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
    },
    onError: (e: Error) => toast.error("Não foi possível atualizar", { description: e.message }),
  });

  const ultimo = historico.data?.[0];
  const metricas = (ultimo?.metricas ?? {}) as Record<string, unknown>;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Agente de status">
          <Radar className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Agente de status — {patrimonio}</DialogTitle>
          <DialogDescription>
            O agente instalado na máquina envia um sinal a cada 60 segundos com o estado do
            equipamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={situacao === "online" ? "default" : "secondary"}>
              {agentStatusLabels[situacao]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Último sinal:{" "}
              {item["ultimo_heartbeat"]
                ? new Date(String(item["ultimo_heartbeat"])).toLocaleString("pt-BR")
                : "nunca"}
            </span>
          </div>

          {podeGerenciar && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor={`manutencao-${item.id}`}>Em manutenção</Label>
              <Switch
                id={`manutencao-${item.id}`}
                checked={!!item["manutencao"]}
                onCheckedChange={(v) => alternarManutencao.mutate(v)}
              />
            </div>
          )}

          {podeGerenciar && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => gerarToken.mutate()} disabled={gerarToken.isPending}>
                  {item["agent_token_hash"] ? (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  {item["agent_token_hash"] ? "Renovar token" : "Gerar token"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!token}
                  onClick={() =>
                    token &&
                    baixarArquivo(
                      `ticontrol-agent-${patrimonio}.js`,
                      gerarScriptAgente(token, endpoint, patrimonio),
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar agente
                </Button>
              </div>

              {token ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Guarde este token com segurança. Ele aparece apenas uma vez.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                      {token}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(token);
                        toast.success("Token copiado");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  O download do agente já configurado fica disponível logo após gerar o token.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Último relatório</h4>
            {ultimo ? (
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[
                  ["CPU", metricas["cpu_percent"], "%"],
                  ["Memória", metricas["memoria_percent"], "%"],
                  ["Disco", metricas["disco_percent"], "%"],
                  [
                    "Ligado há",
                    metricas["uptime_segundos"]
                      ? Math.round(Number(metricas["uptime_segundos"]) / 3600)
                      : null,
                    " h",
                  ],
                ].map(([rotulo, valor, sufixo]) => (
                  <div key={String(rotulo)} className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">{String(rotulo)}</p>
                    <p className="font-medium">
                      {valor === null || valor === undefined
                        ? "—"
                        : `${Math.round(Number(valor))}${String(sufixo)}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum sinal recebido ainda.</p>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium">Sinais recentes</h4>
            <ul className="app-scrollbar max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {(historico.data ?? []).map((h) => (
                <li key={h.id}>{new Date(h.recebido_em).toLocaleString("pt-BR")}</li>
              ))}
              {historico.data?.length === 0 && <li>Sem histórico.</li>}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
