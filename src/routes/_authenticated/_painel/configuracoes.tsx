import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/empresa/RoleBadge";
import { useCurrentWorkspace, useProfile, roleLabels } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_painel/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const profile = useProfile();
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;

  const membros = useQuery({
    queryKey: ["membros-detalhe", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workspaces")
        .select("id, role_no_workspace, profile_id, profiles(nome, email)")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferências da sua conta e da empresa {atual?.workspace.nome ?? ""}.
        </p>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Meu perfil</CardTitle>
          <CardDescription>Dados da sua conta no TIControl.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input readOnly value={profile.data?.nome ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input readOnly value={profile.data?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Perfil global</Label>
            <div>
              {profile.data && <RoleBadge role={profile.data.role_global} />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Membros da empresa</CardTitle>
          <CardDescription>Pessoas com acesso a esta empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {membros.data?.map((membro) => {
              const perfil = membro.profiles as { nome: string; email: string } | null;
              return (
                <li key={membro.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{perfil?.nome ?? "Usuário"}</p>
                    <p className="truncate text-xs text-muted-foreground">{perfil?.email}</p>
                  </div>
                  <RoleBadge role={membro.role_no_workspace} />
                </li>
              );
            })}
            {(membros.data?.length ?? 0) === 0 && (
              <li className="py-3 text-sm text-muted-foreground">Nenhum membro encontrado.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>E-mail e notificações</CardTitle>
          <CardDescription>
            O servidor de e-mail do cliente já está guardado com segurança e será usado quando os
            alertas forem ativados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Próxima etapa</Badge>
          <p>
            Envio de convites e alertas por e-mail, templates editáveis e notificações no celular
            entram nas próximas fases. Perfis disponíveis hoje:{" "}
            {Object.values(roleLabels).join(", ")}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
