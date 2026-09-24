import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Mail, Siren } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { simularQuedaMonitor } from "@/lib/monitors.functions";

export function ConfigurarAlertas({ monitorId, workspaceId }: { monitorId: string; workspaceId: string }) {
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState("");
  const [perfis, setPerfis] = useState<string[]>([]);
  const simularQueda = useServerFn(simularQuedaMonitor);

  const destinos = useQuery({
    queryKey: ["destinos-alerta", monitorId],
    queryFn: async () => {
      const { data, error } = await supabase.from("monitor_notification_recipients").select("*").eq("monitor_id", monitorId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const usuarios = useQuery({
    queryKey: ["usuarios-alerta", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_workspaces").select("profile_id, profiles(nome, email)").eq("workspace_id", workspaceId);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!destinos.data) return;
    setEmails(destinos.data.filter((item) => item.canal === "email").map((item) => item.email).filter(Boolean).join(", "));
    setPerfis(destinos.data.filter((item) => item.canal === "push" && item.profile_id).map((item) => item.profile_id as string));
  }, [destinos.data]);

  const salvar = useMutation({
    mutationFn: async () => {
      const listaEmails = [...new Set(emails.split(/[,;\n]/).map((email) => email.trim().toLowerCase()).filter(Boolean))];
      if (listaEmails.some((email) => !/^\S+@\S+\.\S+$/.test(email))) throw new Error("Revise os endereços de e-mail informados.");
      const { error: removerErro } = await supabase.from("monitor_notification_recipients").delete().eq("monitor_id", monitorId);
      if (removerErro) throw removerErro;
      const linhas = [
        ...listaEmails.map((email) => ({ monitor_id: monitorId, workspace_id: workspaceId, canal: "email" as const, email })),
        ...perfis.map((profile_id) => ({ monitor_id: monitorId, workspace_id: workspaceId, canal: "push" as const, profile_id })),
      ];
      if (linhas.length) {
        const { error } = await supabase.from("monitor_notification_recipients").insert(linhas);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Destinatários atualizados");
      queryClient.invalidateQueries({ queryKey: ["destinos-alerta", monitorId] });
    },
    onError: (erro: Error) => toast.error("Não foi possível salvar", { description: erro.message }),
  });

  const testeQueda = useMutation({
    mutationFn: async () => simularQueda({ data: { monitorId } }),
    onSuccess: (resultado) => {
      const falhas = (resultado.logs ?? []).filter((log) => !log.enviado);
      if (falhas.length) {
        toast.error("Simulação registrada, mas o envio falhou", {
          description: falhas[0]?.mensagem ?? "Verifique o SMTP no servidor.",
        });
        return;
      }
      toast.success("Simulação de queda enviada", {
        description: `E-mail de teste para: ${resultado.destinatarios.join(", ")}`,
      });
    },
    onError: (erro: Error) => toast.error("Não foi possível simular", { description: erro.message }),
  });

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-primary" /> Alertas
        </CardTitle>
        <CardDescription>
          Escolha os e-mails e usuários avisados quando este monitor cair ou voltar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="emails-alerta">
            <Mail className="mr-2 inline h-4 w-4" />
            E-mails
          </Label>
          <Input
            id="emails-alerta"
            value={emails}
            onChange={(evento) => setEmails(evento.target.value)}
            placeholder="ti@empresa.com.br, plantao@empresa.com.br"
          />
          <p className="text-xs text-muted-foreground">Separe vários endereços por vírgula.</p>
        </div>
        <div className="space-y-2">
          <Label>Notificação push para usuários</Label>
          <div className="app-scrollbar max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
            {usuarios.data?.map((vinculo) => {
              const perfil = vinculo.profiles as { nome: string; email: string } | null;
              const marcado = perfis.includes(vinculo.profile_id);
              return (
                <label key={vinculo.profile_id} className="flex cursor-pointer items-center gap-3 text-sm">
                  <Checkbox
                    checked={marcado}
                    onCheckedChange={(valor) =>
                      setPerfis((atual) =>
                        valor === true
                          ? [...atual, vinculo.profile_id]
                          : atual.filter((id) => id !== vinculo.profile_id),
                      )
                    }
                  />
                  <span>
                    <span className="font-medium">{perfil?.nome ?? "Usuário"}</span>
                    <span className="ml-2 text-muted-foreground">{perfil?.email}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            Salvar alertas
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => testeQueda.mutate()}
            disabled={testeQueda.isPending || !emails.trim()}
          >
            <Siren className="mr-2 h-4 w-4" />
            {testeQueda.isPending ? "Simulando..." : "Simular queda (e-mail)"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A simulação dispara o mesmo e-mail de “fora do ar”, sem alterar o status do monitor nem
          abrir incidente.
        </p>
      </CardContent>
    </Card>
  );
}
