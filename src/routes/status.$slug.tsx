import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarraDeChecks } from "@/components/monitoramento/BarraDeChecks";
import {
  calcularUptime,
  statusClasses,
  statusLabels,
  type Monitor,
} from "@/components/monitoramento/monitor-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/status/$slug")({
  component: PaginaStatus,
  head: () => ({
    meta: [
      { title: "Status dos serviços | TIControl" },
      {
        name: "description",
        content: "Página pública com a disponibilidade dos serviços monitorados pelo TIControl.",
      },
      { property: "og:title", content: "Status dos serviços | TIControl" },
      {
        property: "og:description",
        content: "Disponibilidade em tempo real dos serviços monitorados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaginaStatus() {
  const { slug } = Route.useParams();

  const dados = useQuery({
    queryKey: ["status-publico", slug],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data: empresa } = await supabase
        .from("workspaces")
        .select("id, nome")
        .eq("slug", slug)
        .maybeSingle();
      if (!empresa) return null;

      const { data: monitores } = await supabase
        .from("monitors")
        .select("*")
        .eq("workspace_id", empresa.id)
        .eq("publico", true)
        .order("nome");

      const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: checks } = await supabase
        .from("monitor_checks")
        .select("monitor_id, ok, criado_em, mensagem")
        .gte("criado_em", desde)
        .order("criado_em", { ascending: false })
        .limit(2000);

      return {
        empresa,
        monitores: (monitores ?? []) as Monitor[],
        checks: checks ?? [],
      };
    },
  });

  if (dados.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dados.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">
        Página de status não disponível.
      </div>
    );
  }

  const { empresa, monitores, checks } = dados.data;
  const algumFora = monitores.some((m) => m.status === "fora");

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Activity className="h-4 w-4 text-primary" /> TIControl
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{empresa.nome}</h1>
          <p
            className={cn(
              "mt-2 text-sm font-medium",
              algumFora ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {algumFora ? "Há serviços com instabilidade" : "Todos os serviços operando"}
          </p>
        </div>

        {!monitores.length ? (
          <Card className="rounded-xl">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum serviço publicado nesta página.
            </CardContent>
          </Card>
        ) : (
          monitores.map((monitor) => {
            const doMonitor = checks.filter((c) => c.monitor_id === monitor.id);
            const uptime = calcularUptime(doMonitor);
            return (
              <Card key={monitor.id} className="rounded-xl">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-semibold">{monitor.nome}</p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        statusClasses[monitor.status],
                      )}
                    >
                      {statusLabels[monitor.status]}
                    </span>
                  </div>
                  <BarraDeChecks checks={doMonitor} className="hidden sm:flex" />
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {uptime == null ? "—" : `${uptime.toFixed(1)}%`}
                    </p>
                    <p className="text-xs text-muted-foreground">últimas 24h</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
