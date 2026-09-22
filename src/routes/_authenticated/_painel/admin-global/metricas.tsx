import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useWorkspaces";

export const Route = createFileRoute("/_authenticated/_painel/admin-global/metricas")({
  head: () => ({ meta: [
    { title: "Métricas globais | TIControl" }, { name: "description", content: "Visão consolidada de empresas, usuários e convites do TIControl." },
    { property: "og:title", content: "Métricas globais | TIControl" }, { property: "og:description", content: "Visão consolidada de empresas, usuários e convites do TIControl." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Metricas,
});

function Metricas() {
  const profile = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile.isSuccess && profile.data?.role_global !== "master") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [profile.isSuccess, profile.data, navigate]);

  const metricas = useQuery({
    queryKey: ["metricas-saas"],
    queryFn: async () => {
      const [empresas, usuarios, convites] = await Promise.all([
        supabase.from("workspaces").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("invites")
          .select("id", { count: "exact", head: true })
          .is("aceito_em", null),
      ]);
      return {
        empresas: empresas.count ?? 0,
        usuarios: usuarios.count ?? 0,
        convites: convites.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Empresas cadastradas", valor: metricas.data?.empresas ?? 0, icon: Building2 },
    { label: "Usuários", valor: metricas.data?.usuarios ?? 0, icon: Users },
    { label: "Convites pendentes", valor: metricas.data?.convites ?? 0, icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métricas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral de toda a plataforma.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
