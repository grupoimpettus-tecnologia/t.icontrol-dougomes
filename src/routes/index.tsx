import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, Server, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIControl — Gestão de T.I" },
      {
        name: "description",
        content:
          "Centralize acessos, equipamentos, linhas, contratos e monitoramento de serviços do seu time de T.I.",
      },
      { property: "og:title", content: "TIControl — Gestão de T.I" },
      {
        property: "og:description",
        content:
          "Centralize acessos, equipamentos, linhas, contratos e monitoramento de serviços do seu time de T.I.",
      },
    ],
  }),
  component: Index,
});

const destaques = [
  { icon: ShieldCheck, titulo: "Mapa de acessos", texto: "Credenciais de manutenção protegidas." },
  { icon: Server, titulo: "Inventário", texto: "Equipamentos e ativos sempre atualizados." },
  { icon: Smartphone, titulo: "Linhas móveis", texto: "Planos, fidelidade e responsáveis." },
  { icon: Activity, titulo: "Monitoramento", texto: "Disponibilidade dos serviços em tempo real." },
];

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/selecionar-empresa", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight">
          TI<span className="text-primary">Control</span>
        </span>
        <Button asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="py-16">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            A gestão de T.I da sua empresa em um só lugar
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            Acessos, contratos, equipamentos, linhas e monitoramento de serviços — com múltiplas
            empresas e perfis de acesso.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Começar agora</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((item) => (
            <div key={item.titulo} className="rounded-xl border bg-card p-5 shadow-sm">
              <item.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-semibold">{item.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.texto}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
