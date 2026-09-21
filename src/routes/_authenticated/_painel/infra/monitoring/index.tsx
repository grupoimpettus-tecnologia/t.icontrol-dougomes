import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Activity, ArrowRight, Loader2, Plus, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { MonitorFormDialog } from "@/components/monitoramento/MonitorFormDialog";
import { BarraDeChecks } from "@/components/monitoramento/BarraDeChecks";
import {
  alvoDoMonitor,
  calcularUptime,
  formatarIntervalo,
  statusClasses,
  statusLabels,
  tipoLabels,
  type Monitor,
} from "@/components/monitoramento/monitor-utils";
import { verificarAgora } from "@/lib/monitors.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_painel/infra/monitoring/")({
  component: PaginaMonitoramento,
});

function PaginaMonitoramento() {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const podeEditar = atual ? ["master", "admin", "tecnico"].includes(atual.role) : false;
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const executar = useServerFn(verificarAgora);

  const monitores = useQuery({
    queryKey: ["monitores", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitors")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("nome");
      if (error) throw error;
      return data as Monitor[];
    },
  });

  const checks = useQuery({
    queryKey: ["monitor-checks-resumo", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 30000,
    queryFn: async () => {
      const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("monitor_checks")
        .select("monitor_id, ok, criado_em, mensagem")
        .eq("workspace_id", workspaceId!)
        .gte("criado_em", desde)
        .order("criado_em", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const verificar = useMutation({
    mutationFn: async (monitorId: string) => executar({ data: { monitorId } }),
    onSuccess: (resultado) => {
      toast[resultado.ok ? "success" : "error"](resultado.ok ? "Tudo certo" : "Falha detectada", {
        description: resultado.mensagem,
      });
      queryClient.invalidateQueries({ queryKey: ["monitores"] });
      queryClient.invalidateQueries({ queryKey: ["monitor-checks-resumo"] });
    },
    onError: (erro: Error) => toast.error("Não foi possível verificar", { description: erro.message }),
  });

  const lista = (monitores.data ?? []).filter((m) =>
    m.nome.toLowerCase().includes(busca.toLowerCase()),
  );
  const fora = lista.filter((m) => m.status === "fora").length;
  const noAr = lista.filter((m) => m.status === "ativo").length;

  const linkStatus =
    typeof window !== "undefined" && atual
      ? `${window.location.origin}/status/${atual.workspace.slug}`
      : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitoramento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe sites, servidores, portas e rotinas em tempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(linkStatus);
              toast.success("Link da página de status copiado");
            }}
          >
            <Share2 className="mr-2 h-4 w-4" /> Página de status
          </Button>
          {podeEditar && (
            <Button onClick={() => setAberto(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo monitor
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { rotulo: "Monitores", valor: lista.length },
          { rotulo: "No ar", valor: noAr },
          { rotulo: "Fora do ar", valor: fora },
        ].map((kpi) => (
          <Card key={kpi.rotulo} className="rounded-xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{kpi.rotulo}</p>
              <p className="mt-1 text-3xl font-bold">{kpi.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar monitor..."
        className="max-w-sm"
      />

      {monitores.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !lista.length ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum monitor cadastrado para esta empresa.
            </p>
            {podeEditar && (
              <Button onClick={() => setAberto(true)}>
                <Plus className="mr-2 h-4 w-4" /> Criar primeiro monitor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((monitor) => {
            const doMonitor = (checks.data ?? []).filter((c) => c.monitor_id === monitor.id);
            const uptime = calcularUptime(doMonitor);
            return (
              <Card key={monitor.id} className="rounded-xl">
                <CardContent className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-48 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          statusClasses[monitor.status],
                        )}
                      >
                        {statusLabels[monitor.status]}
                      </span>
                      <Link
                        to="/infra/monitoring/$id"
                        params={{ id: monitor.id }}
                        className="font-semibold hover:text-primary"
                      >
                        {monitor.nome}
                      </Link>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {alvoDoMonitor(monitor)}
                    </p>
                  </div>

                  <Badge variant="secondary">{tipoLabels[monitor.tipo]}</Badge>

                  <div className="hidden md:block">
                    <BarraDeChecks checks={doMonitor} />
                  </div>

                  <div className="w-24 text-right">
                    <p className="text-sm font-semibold">
                      {uptime == null ? "—" : `${uptime.toFixed(1)}%`}
                    </p>
                    <p className="text-xs text-muted-foreground">24h</p>
                  </div>

                  <div className="w-24 text-right">
                    <p className="text-sm font-semibold">
                      {monitor.ultima_latencia_ms != null ? `${monitor.ultima_latencia_ms} ms` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      a cada {formatarIntervalo(monitor.intervalo_segundos)}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    {podeEditar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Verificar agora"
                        disabled={verificar.isPending}
                        onClick={() => verificar.mutate(monitor.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild title="Abrir detalhes">
                      <Link to="/infra/monitoring/$id" params={{ id: monitor.id }}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {workspaceId && (
        <MonitorFormDialog aberto={aberto} onOpenChange={setAberto} workspaceId={workspaceId} />
      )}
    </div>
  );
}
