import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { MonitorFormDialog } from "@/components/monitoramento/MonitorFormDialog";
import { BarraDeChecks } from "@/components/monitoramento/BarraDeChecks";
import {
  alvoDoMonitor,
  calcularUptime,
  formatarDuracao,
  formatarIntervalo,
  statusClasses,
  statusLabels,
  tipoLabels,
  type Monitor,
} from "@/components/monitoramento/monitor-utils";
import { verificarAgora } from "@/lib/monitors.functions";
import { cn } from "@/lib/utils";
import { ConfigurarAlertas } from "@/components/monitoramento/ConfigurarAlertas";

export const Route = createFileRoute("/_authenticated/_painel/infra/monitoring/$id")({
  head: () => ({ meta: [
    { title: "Detalhes do monitor | TIControl" }, { name: "description", content: "Histórico, incidentes e alertas do monitor selecionado." },
    { property: "og:title", content: "Detalhes do monitor | TIControl" }, { property: "og:description", content: "Histórico, incidentes e alertas do monitor selecionado." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: DetalheMonitor,
});

function DetalheMonitor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const atual = useCurrentWorkspace();
  const podeEditar = atual ? ["master", "admin", "tecnico"].includes(atual.role) : false;
  const [editando, setEditando] = useState(false);
  const executar = useServerFn(verificarAgora);

  const monitor = useQuery({
    queryKey: ["monitor", id],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("monitors").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Monitor | null;
    },
  });

  const checks = useQuery({
    queryKey: ["monitor-checks", id],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitor_checks")
        .select("*")
        .eq("monitor_id", id)
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const incidentes = useQuery({
    queryKey: ["monitor-incidentes", id],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitor_incidents")
        .select("*")
        .eq("monitor_id", id)
        .order("iniciado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const verificar = useMutation({
    mutationFn: async () => executar({ data: { monitorId: id } }),
    onSuccess: (resultado) => {
      toast[resultado.ok ? "success" : "error"](resultado.ok ? "Tudo certo" : "Falha detectada", {
        description: resultado.mensagem,
      });
      queryClient.invalidateQueries({ queryKey: ["monitor"] });
      queryClient.invalidateQueries({ queryKey: ["monitor-checks"] });
    },
    onError: (erro: Error) => toast.error("Não foi possível verificar", { description: erro.message }),
  });

  const alternarPausa = useMutation({
    mutationFn: async () => {
      const pausado = monitor.data?.status === "pausado";
      const { error } = await supabase
        .from("monitors")
        .update({ status: pausado ? "pendente" : "pausado", ativo: pausado })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitor"] }),
    onError: (erro: Error) => toast.error("Erro ao atualizar", { description: erro.message }),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("monitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Monitor removido");
      queryClient.invalidateQueries({ queryKey: ["monitores"] });
      navigate({ to: "/infra/monitoring" });
    },
    onError: (erro: Error) => toast.error("Erro ao remover", { description: erro.message }),
  });

  if (monitor.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const m = monitor.data;
  if (!m) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Monitor não encontrado.</p>
        <Button variant="outline" asChild>
          <Link to="/infra/monitoring">Voltar</Link>
        </Button>
      </div>
    );
  }

  const lista = checks.data ?? [];
  const uptime24 = calcularUptime(
    lista.filter((c) => Date.now() - new Date(c.criado_em).getTime() <= 24 * 3600 * 1000),
  );
  const uptimeTotal = calcularUptime(lista);
  const grafico = [...lista]
    .filter((c) => c.latencia_ms != null)
    .slice(0, 60)
    .reverse()
    .map((c) => ({
      hora: new Date(c.criado_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      latencia: c.latencia_ms,
    }));

  const linkHeartbeat =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/heartbeat/${m.heartbeat_token}`
      : "";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/infra/monitoring">
          <ArrowLeft className="mr-2 h-4 w-4" /> Monitoramento
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClasses[m.status])}
            >
              {statusLabels[m.status]}
            </span>
            <Badge variant="secondary">{tipoLabels[m.tipo]}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{m.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{alvoDoMonitor(m)}</p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => verificar.mutate()} disabled={verificar.isPending}>
              {verificar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Verificar agora
            </Button>
            <Button variant="outline" onClick={() => alternarPausa.mutate()}>
              {m.status === "pausado" ? (
                <>
                  <Play className="mr-2 h-4 w-4" /> Retomar
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" /> Pausar
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => {
                if (confirm("Remover este monitor e todo o histórico?")) excluir.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { rotulo: "Disponibilidade 24h", valor: uptime24 == null ? "—" : `${uptime24.toFixed(2)}%` },
          {
            rotulo: "Disponibilidade histórico",
            valor: uptimeTotal == null ? "—" : `${uptimeTotal.toFixed(2)}%`,
          },
          {
            rotulo: "Última resposta",
            valor: m.ultima_latencia_ms != null ? `${m.ultima_latencia_ms} ms` : "—",
          },
          { rotulo: "Frequência", valor: formatarIntervalo(m.intervalo_segundos) },
        ].map((kpi) => (
          <Card key={kpi.rotulo} className="rounded-xl">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{kpi.rotulo}</p>
              <p className="mt-1 text-2xl font-bold">{kpi.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Últimas verificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BarraDeChecks checks={lista} />
          {m.ultima_mensagem && (
            <p className="text-sm text-muted-foreground">Último resultado: {m.ultima_mensagem}</p>
          )}
        </CardContent>
      </Card>

      {podeEditar && <ConfigurarAlertas monitorId={m.id} workspaceId={m.workspace_id} />}

      {grafico.length > 1 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Tempo de resposta (ms)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={grafico}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <ChartTooltip />
                <Line
                  type="monotone"
                  dataKey="latencia"
                  name="latencia"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--primary)" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {m.tipo === "heartbeat" && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Endereço de sinal</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">
              {linkHeartbeat}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(linkHeartbeat);
                toast.success("Endereço copiado");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Incidentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!incidentes.data?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum incidente registrado.</p>
          ) : (
            <ul className="space-y-3">
              {incidentes.data.map((inc) => (
                <li key={inc.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(inc.iniciado_em).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">{inc.causa ?? "Falha"}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      inc.resolvido_em
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {inc.resolvido_em
                      ? `Resolvido em ${formatarDuracao(inc.duracao_segundos)}`
                      : "Em aberto"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {atual && (
        <MonitorFormDialog
          aberto={editando}
          onOpenChange={setEditando}
          workspaceId={atual.workspace.id}
          monitor={m}
        />
      )}
    </div>
  );
}
