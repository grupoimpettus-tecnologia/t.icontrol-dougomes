import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

export function slugify(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [segmento, setSegmento] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        nome,
        slug: slug || slugify(nome),
        segmento: segmento || null,
        logo_url: logoUrl || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !data) {
      setLoading(false);
      toast.error("Não foi possível criar a empresa", { description: error?.message });
      return;
    }

    await supabase.from("user_workspaces").insert({
      profile_id: user.id,
      workspace_id: data.id,
      role_no_workspace: "admin",
    });

    await supabase.from("audit_logs").insert({
      workspace_id: data.id,
      user_id: user.id,
      acao: "empresa_criada",
      entidade: "workspaces",
      entidade_id: data.id,
    });

    setWorkspaceId(data.id);
    queryClient.clear();
    setLoading(false);
    toast.success("Empresa criada com sucesso");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Criar empresa</CardTitle>
          <CardDescription>
            Cadastre a empresa que será gerenciada dentro do TIControl.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={criar}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da empresa</Label>
              <Input
                id="nome"
                required
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador</Label>
              <Input id="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento (opcional)</Label>
              <Input
                id="segmento"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Link do logo (opcional)</Label>
              <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar empresa
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/selecionar-empresa" })}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
