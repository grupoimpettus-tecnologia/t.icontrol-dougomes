import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/empresa/RoleBadge";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, roleLabels, type AppRole } from "@/hooks/useWorkspaces";
import { ExportarMenu } from "@/components/ExportarMenu";

export const Route = createFileRoute("/_authenticated/_painel/admin-global/usuarios")({
  head: () => ({ meta: [
    { title: "Usuários | TIControl" }, { name: "description", content: "Administração de usuários, perfis e acessos às empresas." },
    { property: "og:title", content: "Usuários | TIControl" }, { property: "og:description", content: "Administração de usuários, perfis e acessos às empresas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminUsuarios,
});

const rolesSelecionaveis: AppRole[] = ["admin", "tecnico", "viewer"];

function AdminUsuarios() {
  const profile = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Record<string, boolean>>({});
  const [roleVinculo, setRoleVinculo] = useState<AppRole>("viewer");

  useEffect(() => {
    if (profile.isSuccess && profile.data?.role_global !== "master") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [profile.isSuccess, profile.data, navigate]);

  const usuarios = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const empresas = useQuery({
    queryKey: ["admin-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspaces").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const vinculos = useQuery({
    queryKey: ["admin-vinculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_workspaces").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const salvarVinculos = useMutation({
    mutationFn: async (profileId: string) => {
      const atuais = (vinculos.data ?? []).filter((v) => v.profile_id === profileId);
      const desejadas = Object.entries(selecionadas)
        .filter(([, marcado]) => marcado)
        .map(([id]) => id);

      const remover = atuais.filter((v) => !desejadas.includes(v.workspace_id));
      for (const item of remover) {
        const { error } = await supabase.from("user_workspaces").delete().eq("id", item.id);
        if (error) throw error;
      }
      for (const workspaceId of desejadas) {
        const { error } = await supabase.from("user_workspaces").upsert(
          {
            profile_id: profileId,
            workspace_id: workspaceId,
            role_no_workspace: roleVinculo,
          },
          { onConflict: "profile_id,workspace_id" },
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Acessos atualizados");
      setEditando(null);
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Erro ao salvar", { description: error.message }),
  });

  function abrirEdicao(profileId: string) {
    const atuais = (vinculos.data ?? []).filter((v) => v.profile_id === profileId);
    const mapa: Record<string, boolean> = {};
    atuais.forEach((v) => (mapa[v.workspace_id] = true));
    setSelecionadas(mapa);
    setRoleVinculo((atuais[0]?.role_no_workspace as AppRole) ?? "viewer");
    setEditando(profileId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">Perfis do sistema e empresas que cada pessoa acessa.</p>
        </div>
        <ExportarMenu
          titulo="Usuários"
          colunas={[{ chave: "nome", titulo: "Nome" }, { chave: "email", titulo: "E-mail" }, { chave: "perfil", titulo: "Perfil" }, { chave: "empresas", titulo: "Empresas" }]}
          linhas={(usuarios.data ?? []).map((usuario) => ({ ...usuario, perfil: roleLabels[usuario.role_global], empresas: usuario.role_global === "master" ? "Todas" : (vinculos.data ?? []).filter((v) => v.profile_id === usuario.id).length }))}
        />
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>{usuarios.data?.length ?? 0} usuário(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.data?.map((usuario) => {
                const total = (vinculos.data ?? []).filter(
                  (v) => v.profile_id === usuario.id,
                ).length;
                return (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={usuario.role_global} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {usuario.role_global === "master" ? "Todas" : total}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEdicao(usuario.id)}
                        disabled={usuario.role_global === "master"}
                      >
                        <Settings2 className="mr-2 h-4 w-4" /> Acessos
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empresas do usuário</DialogTitle>
            <DialogDescription>
              Escolha as empresas que esta pessoa pode acessar e o perfil dela.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Perfil nas empresas</Label>
              <Select value={roleVinculo} onValueChange={(v) => setRoleVinculo(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rolesSelecionaveis.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Empresas</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
                {empresas.data?.map((empresa) => (
                  <label key={empresa.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!selecionadas[empresa.id]}
                      onCheckedChange={(valor) =>
                        setSelecionadas((atual) => ({ ...atual, [empresa.id]: valor === true }))
                      }
                    />
                    {empresa.nome}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => editando && salvarVinculos.mutate(editando)}
              disabled={salvarVinculos.isPending}
            >
              Salvar acessos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
