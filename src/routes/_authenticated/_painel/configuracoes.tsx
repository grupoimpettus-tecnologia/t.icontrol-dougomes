import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/empresa/RoleBadge";
import { useCurrentWorkspace, useProfile, roleLabels } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { obterChavePush, removerAssinaturasPush, salvarAssinaturaPush } from "@/lib/push.functions";

export const Route = createFileRoute("/_authenticated/_painel/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações | TIControl" }, { name: "description", content: "Preferências de perfil, empresa e notificações do TIControl." },
    { property: "og:title", content: "Configurações | TIControl" }, { property: "og:description", content: "Preferências de perfil, empresa e notificações do TIControl." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Configuracoes,
});

function Configuracoes() {
  const profile = useProfile();
  const atual = useCurrentWorkspace();
  const workspaceId = atual?.workspace.id;
  const obterChave = useServerFn(obterChavePush);
  const salvarPush = useServerFn(salvarAssinaturaPush);
  const removerPush = useServerFn(removerAssinaturasPush);
  const pushDisponivel = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  function converterChave(chave: string) {
    const base64 = chave.replace(/-/g, "+").replace(/_/g, "/");
    const preenchida = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return Uint8Array.from(atob(preenchida), (caractere) => caractere.charCodeAt(0));
  }

  const push = useMutation({
    mutationFn: async () => {
      if (!pushDisponivel) throw new Error("Este navegador não oferece notificações push.");
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") throw new Error("A permissão para notificações não foi concedida.");
      const registro = await navigator.serviceWorker.register("/push-sw.js");
      const { publicKey } = await obterChave();
      const assinatura = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: converterChave(publicKey) });
      await salvarPush({ data: { assinatura: JSON.stringify(assinatura.toJSON()) } });
    },
    onSuccess: () => toast.success("Notificações push ativadas neste dispositivo"),
    onError: (erro: Error) => toast.error("Não foi possível ativar", { description: erro.message }),
  });

  const desativarPush = useMutation({ mutationFn: () => removerPush(), onSuccess: () => toast.success("Notificações push desativadas") });

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
            O servidor de e-mail está configurado. Ative o push neste dispositivo para poder ser escolhido nos alertas dos monitores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">E-mail ativo</Badge>
          <Button onClick={() => push.mutate()} disabled={!pushDisponivel || push.isPending}><BellRing className="mr-2 h-4 w-4" />Ativar push neste dispositivo</Button>
          <Button variant="outline" onClick={() => desativarPush.mutate()} disabled={desativarPush.isPending}>Desativar push</Button>
          {!pushDisponivel && <p className="w-full text-sm text-muted-foreground">Este navegador não oferece notificações push.</p>}
          <p className="w-full text-xs text-muted-foreground">Perfis disponíveis: {Object.values(roleLabels).join(", ")}.</p>
        </CardContent>
      </Card>
    </div>
  );
}
