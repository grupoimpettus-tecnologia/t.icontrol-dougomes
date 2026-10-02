import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Cpu, KeyRound, Printer, Smartphone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentWorkspace } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_painel/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard de Infra | TIControl" }, { name: "description", content: "Visão geral dos ativos e serviços de T.I da empresa." },
    { property: "og:title", content: "Dashboard de Infra | TIControl" }, { property: "og:description", content: "Visão geral dos ativos e serviços de T.I da empresa." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

const CORES_TONER = ["Preto", "Ciano", "Magenta", "Amarelo"] as const;

const corTonerPonto: Record<(typeof CORES_TONER)[number], string> = {
  Preto: "bg-neutral-900",
  Ciano: "bg-cyan-500",
  Magenta: "bg-fuchsia-600",
  Amarelo: "bg-amber-300",
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

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
        equipaManut,
        equipamentosDetalhe,
        linhas,
        acessos,
        monitores,
        celularesEstoque,
        impressorasLista,
        tonerEstoque,
      ] = await Promise.all([
        baseEquip(),
        baseEquip().ilike("status", "ativo"),
        baseEquip().ilike("status", "manutenção"),
        supabase.from("equipments").select("tipo, status").eq("workspace_id", workspaceId!),
        supabase.from("phone_lines").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!).ilike("status", "ativo"),
        supabase.from("access_entries").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!),
        supabase.from("monitors").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId!).eq("ativo", true),
        supabase.from("phone_stock").select("modelo, status, quantidade").eq("workspace_id", workspaceId!),
        supabase.from("printers").select("id, nome").eq("workspace_id", workspaceId!).order("nome"),
        supabase.from("printer_toner_stock").select("printer_id, cor, quantidade").eq("workspace_id", workspaceId!),
      ]);

      const erro = [
        equipamentos,
        equipaAtivos,
        equipaManut,
        equipamentosDetalhe,
        linhas,
        acessos,
        monitores,
      ].find((resultado) => resultado.error)?.error;
      if (erro) throw erro;

      if (
        celularesEstoque.error &&
        !/phone_stock|schema cache|does not exist|não existe/i.test(celularesEstoque.error.message)
      ) {
        throw celularesEstoque.error;
      }
      if (
        impressorasLista.error &&
        !/printers|schema cache|does not exist|não existe/i.test(impressorasLista.error.message)
      ) {
        throw impressorasLista.error;
      }
      if (
        tonerEstoque.error &&
        !/printer_toner_stock|schema cache|does not exist|não existe/i.test(tonerEstoque.error.message)
      ) {
        throw tonerEstoque.error;
      }

      const emEstoque = (equipamentosDetalhe.data ?? []).filter(
        (item) => normalizar(String(item.status ?? "")) === "estoque",
      );
      const equipaEstoqueDesktop = emEstoque.filter(
        (item) => normalizar(String(item.tipo ?? "")) === "desktop",
      ).length;
      const equipaEstoqueNotebook = emEstoque.filter(
        (item) => normalizar(String(item.tipo ?? "")) === "notebook",
      ).length;

      const celulares = celularesEstoque.error ? [] : (celularesEstoque.data ?? []);
      const celularesTotal = celulares.reduce((acc, item) => acc + Number(item.quantidade ?? 0), 0);

      const agregarPorStatus = (statusAlvo: string) => {
        const mapa = new Map<string, number>();
        let total = 0;
        for (const item of celulares) {
          if (normalizar(String(item.status ?? "")) !== normalizar(statusAlvo)) continue;
          const qtd = Number(item.quantidade ?? 0);
          total += qtd;
          const modelo = String(item.modelo ?? "Sem modelo");
          mapa.set(modelo, (mapa.get(modelo) ?? 0) + qtd);
        }
        return {
          total,
          modelos: [...mapa.entries()].map(([modelo, quantidade]) => ({ modelo, quantidade })),
        };
      };

      const impressorasBase = impressorasLista.error ? [] : (impressorasLista.data ?? []);
      const toner = tonerEstoque.error ? [] : (tonerEstoque.data ?? []);
      const impressoras = impressorasBase.map((impressora) => {
        const cores: Record<(typeof CORES_TONER)[number], number> = {
          Preto: 0,
          Ciano: 0,
          Magenta: 0,
          Amarelo: 0,
        };
        for (const item of toner) {
          if (item.printer_id !== impressora.id) continue;
          const cor = item.cor as (typeof CORES_TONER)[number];
          if (cor in cores) cores[cor] += Number(item.quantidade ?? 0);
        }
        return { id: impressora.id, nome: impressora.nome, cores };
      });

      return {
        equipamentos: equipamentos.count ?? 0,
        equipaAtivos: equipaAtivos.count ?? 0,
        equipaEstoque: emEstoque.length,
        equipaEstoqueDesktop,
        equipaEstoqueNotebook,
        equipaManut: equipaManut.count ?? 0,
        linhas: linhas.count ?? 0,
        acessos: acessos.count ?? 0,
        monitores: monitores.count ?? 0,
        celularesTotal,
        celularesFuncionando: agregarPorStatus("Funcionando"),
        celularesManutencao: agregarPorStatus("Manutenção"),
        impressoras,
      };
    },
  });

  const kpis = [
    { label: "Equipamentos", icon: Cpu, valor: totais.data?.equipamentos ?? 0 },
    { label: "Equipa. Ativos", icon: Cpu, valor: totais.data?.equipaAtivos ?? 0 },
    { label: "Equipa. Manut.", icon: Cpu, valor: totais.data?.equipaManut ?? 0 },
    { label: "Linhas ativas", icon: Smartphone, valor: totais.data?.linhas ?? 0 },
    { label: "Acessos mapeados", icon: KeyRound, valor: totais.data?.acessos ?? 0 },
    { label: "Monitores ativos", icon: Activity, valor: totais.data?.monitores ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Infra</h1>
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

        {kpis.slice(0, 2).map((kpi) => (
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

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Equipa. Estoque
            </CardTitle>
            <Cpu className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{totais.data?.equipaEstoque ?? 0}</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>Desktop</span>
                <span className="font-semibold text-foreground">
                  {totais.data?.equipaEstoqueDesktop ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Notebook</span>
                <span className="font-semibold text-foreground">
                  {totais.data?.equipaEstoqueNotebook ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {kpis.slice(2, 4).map((kpi) => (
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

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celulares Estoque
            </CardTitle>
            <Smartphone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold">{totais.data?.celularesTotal ?? 0}</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Funcionando</span>
                  <span className="font-semibold text-foreground">
                    {totais.data?.celularesFuncionando.total ?? 0}
                  </span>
                </div>
                {(totais.data?.celularesFuncionando.modelos ?? []).map((item) => (
                  <div key={`func-${item.modelo}`} className="flex items-start justify-between gap-2 pl-2">
                    <span className="truncate" title={item.modelo}>{item.modelo}</span>
                    <span className="shrink-0 font-semibold text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Manutenção</span>
                  <span className="font-semibold text-foreground">
                    {totais.data?.celularesManutencao.total ?? 0}
                  </span>
                </div>
                {(totais.data?.celularesManutencao.modelos ?? []).map((item) => (
                  <div key={`manut-${item.modelo}`} className="flex items-start justify-between gap-2 pl-2">
                    <span className="truncate" title={item.modelo}>{item.modelo}</span>
                    <span className="shrink-0 font-semibold text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impressoras</CardTitle>
            <Printer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold">{totais.data?.impressoras.length ?? 0}</p>
            <div className="space-y-3 text-xs text-muted-foreground">
              {(totais.data?.impressoras.length ?? 0) === 0 && (
                <p>Nenhuma impressora cadastrada.</p>
              )}
              {(totais.data?.impressoras ?? []).map((impressora) => (
                <div key={impressora.id} className="space-y-1">
                  <p className="truncate font-medium text-foreground" title={impressora.nome}>
                    {impressora.nome}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-2">
                    {CORES_TONER.map((cor) => (
                      <span key={cor} className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${corTonerPonto[cor]}`} />
                        <span>{cor}</span>
                        <span className="font-semibold text-foreground">{impressora.cores[cor]}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {kpis.slice(4).map((kpi) => (
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
