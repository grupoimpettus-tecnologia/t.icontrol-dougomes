import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/empresa/RoleBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, roleLabels, type AppRole } from "@/hooks/useWorkspaces";

export const Route = createFileRoute("/_authenticated/_painel/admin-global/convites")({
  component: AdminConvites,
});

const rolesSelecionaveis: AppRole[] = ["admin", "tecnico", "viewer"];

function AdminConvites() {
  const profile = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");
  const [selecionadas, setSelecionadas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (profile.isSuccess && profile.data?.role_global !== "master") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [profile.isSuccess, profile.data, navigate]);

  const empresas = useQuery({
    queryKey: ["admin-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspaces").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const convites = useQuery({
    queryKey: ["admin-convites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const workspaceIds = Object.entries(selecionadas)
        .filter(([, marcado]) => marcado)
        .map(([id]) => id);
      if (workspaceIds.length === 0) throw new Error("Selecione ao menos uma empresa.");
      const { data, error } = await supabase
        .from("invites")
        .insert({
          email: email.trim().toLowerCase(),
          nome: nome || null,
          role,
          workspace_ids: workspaceIds,
          criado_por: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/aceitar-convite?token=${data.token}`;
      navigator.clipboard?.writeText(link);
      toast.success("Convite criado", { description: "Link copiado para a área de transferência." });
      setAberto(false);
      setEmail("");
      setNome("");
      setSelecionadas({});
      queryClient.invalidateQueries({ queryKey: ["admin-convites"] });
    },
    onError: (error: Error) => toast.error("Erro ao convidar", { description: error.message }),
  });

  const revogar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite revogado");
      queryClient.invalidateQueries({ queryKey: ["admin-convites"] });
    },
  });

  function copiarLink(token: string) {
    navigator.clipboard?.writeText(`${window.location.origin}/aceitar-convite?token=${token}`);
    toast.success("Link copiado");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Convide pessoas e defina o perfil e as empresas que elas poderão acessar.
          </p>
        </div>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Convidar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar usuário</DialogTitle>
              <DialogDescription>
                O link do convite é copiado automaticamente ao criar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-convite">E-mail</Label>
                <Input
                  id="email-convite"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome-convite">Nome (opcional)</Label>
                <Input
                  id="nome-convite"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesSelecionaveis.map((item) => (
                      <SelectItem key={item} value={item}>
                        {roleLabels[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresas</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
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
              <Button onClick={() => criar.mutate()} disabled={!email || criar.isPending}>
                {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>{convites.data?.length ?? 0} convite(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convites.data?.map((convite) => (
                <TableRow key={convite.id}>
                  <TableCell className="font-medium">{convite.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={convite.role} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {convite.workspace_ids.length}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {convite.aceito_em
                      ? "Aceito"
                      : new Date(convite.expira_em) < new Date()
                        ? "Expirado"
                        : "Pendente"}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => copiarLink(convite.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => revogar.mutate(convite.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(convites.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Nenhum convite criado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
