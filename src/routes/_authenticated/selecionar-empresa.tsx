import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/empresa/RoleBadge";
import { useMyWorkspaces, useProfile } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/selecionar-empresa")({
  component: SelecionarEmpresa,
});

function SelecionarEmpresa() {
  const { user } = useAuth();
  const profile = useProfile();
  const empresas = useMyWorkspaces();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const [busca, setBusca] = useState("");

  const isMaster = profile.data?.role_global === "master";
  const lista = (empresas.data ?? []).filter((item) => item.workspace.ativo);

  useEffect(() => {
    if (!empresas.isSuccess) return;
    if (lista.length === 1) {
      entrar(lista[0]!.workspace.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresas.isSuccess, lista.length]);


  async function entrar(id: string) {
    setWorkspaceId(id);
    queryClient.clear();
    if (user) {
      await supabase
        .from("user_workspaces")
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq("profile_id", user.id)
        .eq("workspace_id", id);
    }
    navigate({ to: "/dashboard", replace: true });
  }

  if (empresas.isLoading || profile.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const filtradas = lista.filter((item) =>
    item.workspace.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <span className="text-xl font-bold tracking-tight">
            TI<span className="text-primary">Control</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Selecionar empresa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha a empresa que você quer gerenciar agora.
          </p>
        </div>

        {lista.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 font-semibold">Nenhuma empresa disponível</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isMaster
                ? "Crie a primeira empresa para começar."
                : "Peça a um administrador para vincular seu usuário a uma empresa."}
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/onboarding" })}>
              <Plus className="mr-2 h-4 w-4" /> Criar empresa
            </Button>
          </div>
        ) : (
          <>
            {lista.length > 4 && (
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empresa..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {filtradas.map((item) => (
                <button
                  key={item.workspace.id}
                  onClick={() => entrar(item.workspace.id)}
                  className="flex items-center gap-4 rounded-xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent">
                    {item.workspace.logo_url ? (
                      <img
                        src={item.workspace.logo_url}
                        alt={item.workspace.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.workspace.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.ultimoAcesso
                        ? `Último acesso: ${new Date(item.ultimoAcesso).toLocaleDateString("pt-BR")}`
                        : "Primeiro acesso"}
                    </p>
                  </div>
                  <RoleBadge role={item.role} />
                </button>
              ))}
            </div>

            {isMaster && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => navigate({ to: "/onboarding" })}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar nova empresa
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
