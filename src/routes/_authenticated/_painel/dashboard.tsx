import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Cpu, KeyRound, Smartphone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_painel/dashboard")({
  component: Dashboard,
});

const kpis = [
  { label: "Equipamentos", icon: Cpu },
  { label: "Linhas ativas", icon: Smartphone },
  { label: "Acessos mapeados", icon: KeyRound },
  { label: "Monitores ativos", icon: Activity },
];

function Dashboard() {
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;

  const membros = useQuery({
    queryKey: ["membros", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_workspaces")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const atividades = useQuery({
    queryKey: ["atividades", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral de {atual?.workspace.nome ?? "sua empresa"}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresa</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-semibold">{atual?.workspace.nome ?? "—"}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membros</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{membros.data ?? 0}</p>
          </CardContent>
        </Card>

        {kpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">0</p>
              <Badge variant="secondary" className="text-xs">
                Módulo em breve
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Últimas atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {(atividades.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          ) : (
            <ul className="space-y-3">
              {atividades.data?.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate">
                    {log.acao} {log.entidade ? `· ${log.entidade}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
