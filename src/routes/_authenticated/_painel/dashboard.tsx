import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Cpu, KeyRound, Smartphone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_painel/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard | TIControl" }, { name: "description", content: "Visão geral dos ativos e serviços de T.I da empresa." },
    { property: "og:title", content: "Dashboard | TIControl" }, { property: "og:description", content: "Visão geral dos ativos e serviços de T.I da empresa." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

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

  const totais = useQuery({
    queryKey: ["dashboard-totais", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const baseEquip = () =>
        supabase.from("equipments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!);

      const [
        equipamentos,
        equipaAtivos,
        equipaEstoque,
        equipaManut,
        linhas,
        acessos,
        monitores,
      ] = await Promise.all([
        baseEquip(),
        baseEquip().ilike("status", "ativo"),
        baseEquip().ilike("status", "estoque"),
        baseEquip().ilike("status", "manutenção"),
        supabase.from("phone_lines").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!).ilike("status", "ativo"),
        supabase.from("access_entries").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!),
        supabase.from("monitors").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!).eq("ativo", true),
      ]);
      const erro = [
        equipamentos,
        equipaAtivos,
        equipaEstoque,
        equipaManut,
        linhas,
        acessos,
        monitores,
      ].find((resultado) => resultado.error)?.error;
      if (erro) throw erro;
      return {
        equipamentos: equipamentos.count ?? 0,
        equipaAtivos: equipaAtivos.count ?? 0,
        equipaEstoque: equipaEstoque.count ?? 0,
        equipaManut: equipaManut.count ?? 0,
        linhas: linhas.count ?? 0,
        acessos: acessos.count ?? 0,
        monitores: monitores.count ?? 0,
      };
    },
  });

  const kpis = [
    { label: "Equipamentos", icon: Cpu, valor: totais.data?.equipamentos ?? 0 },
    { label: "Equipa. Ativos", icon: Cpu, valor: totais.data?.equipaAtivos ?? 0 },
    { label: "Equipa. Estoque", icon: Cpu, valor: totais.data?.equipaEstoque ?? 0 },
    { label: "Equipa. Manut.", icon: Cpu, valor: totais.data?.equipaManut ?? 0 },
    { label: "Linhas ativas", icon: Smartphone, valor: totais.data?.linhas ?? 0 },
    { label: "Acessos mapeados", icon: KeyRound, valor: totais.data?.acessos ?? 0 },
    { label: "Monitores ativos", icon: Activity, valor: totais.data?.monitores ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral de {atual?.workspace.nome ?? "sua empresa"}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
            <CardContent>
              <p className="text-2xl font-bold">{kpi.valor}</p>
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
                    {log.acao} {log.item_nome ? `· ${log.item_nome}` : log.entidade ? `· ${log.entidade}` : ""}
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
