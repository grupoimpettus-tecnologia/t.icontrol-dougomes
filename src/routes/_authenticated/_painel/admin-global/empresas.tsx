import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useWorkspaces";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/_painel/admin-global/empresas")({
  component: AdminEmpresas,
});

function slugify(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminEmpresas() {
  const profile = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [segmento, setSegmento] = useState("");

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

  const criar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          nome,
          slug: slug || slugify(nome),
          segmento: segmento || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Empresa criada");
      setAberto(false);
      setNome("");
      setSlug("");
      setSegmento("");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error("Erro ao criar empresa", { description: error.message }),
  });

  const alternarAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("workspaces").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error: Error) => toast.error("Erro ao atualizar", { description: error.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro das empresas atendidas pela plataforma.
          </p>
        </div>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova empresa</DialogTitle>
              <DialogDescription>Cadastre mais uma empresa no TIControl.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-empresa">Nome</Label>
                <Input
                  id="nome-empresa"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    setSlug(slugify(e.target.value));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug-empresa">Identificador</Label>
                <Input
                  id="slug-empresa"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segmento-empresa">Segmento</Label>
                <Input
                  id="segmento-empresa"
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criar.mutate()} disabled={!nome || criar.isPending}>
                {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar empresa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> {empresas.data?.length ?? 0} empresa(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead className="text-right">Ativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.data?.map((empresa) => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{empresa.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{empresa.segmento ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={empresa.ativo}
                      onCheckedChange={(ativo) => alternarAtivo.mutate({ id: empresa.id, ativo })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
