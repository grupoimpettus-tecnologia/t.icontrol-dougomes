import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { tipoLabels, type Monitor, type MonitorTipo } from "./monitor-utils";

type Form = {
  nome: string;
  tipo: MonitorTipo;
  url: string;
  hostname: string;
  porta: string;
  keyword: string;
  dns_tipo: string;
  intervalo_segundos: string;
  timeout_segundos: string;
  falhas_para_alerta: string;
  status_codes_aceitos: string;
  webhook_url: string;
  publico: boolean;
};

const vazio: Form = {
  nome: "",
  tipo: "http",
  url: "",
  hostname: "",
  porta: "",
  keyword: "",
  dns_tipo: "A",
  intervalo_segundos: "300",
  timeout_segundos: "15",
  falhas_para_alerta: "2",
  status_codes_aceitos: "200-299",
  webhook_url: "",
  publico: false,
};

export function MonitorFormDialog({
  aberto,
  onOpenChange,
  workspaceId,
  monitor,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  monitor?: Monitor | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(vazio);

  useEffect(() => {
    if (!aberto) return;
    setForm(
      monitor
        ? {
            nome: monitor.nome,
            tipo: monitor.tipo,
            url: monitor.url ?? "",
            hostname: monitor.hostname ?? "",
            porta: monitor.porta?.toString() ?? "",
            keyword: monitor.keyword ?? "",
            dns_tipo: monitor.dns_tipo ?? "A",
            intervalo_segundos: monitor.intervalo_segundos.toString(),
            timeout_segundos: monitor.timeout_segundos.toString(),
            falhas_para_alerta: monitor.falhas_para_alerta.toString(),
            status_codes_aceitos: monitor.status_codes_aceitos,
            webhook_url: monitor.webhook_url ?? "",
            publico: monitor.publico,
          }
        : vazio,
    );
  }, [aberto, monitor]);

  const set = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        workspace_id: workspaceId,
        nome: form.nome,
        tipo: form.tipo,
        url: form.tipo === "http" || form.tipo === "keyword" ? form.url : null,
        hostname:
          form.tipo === "tcp" || form.tipo === "dns" || form.tipo === "ping"
            ? form.hostname
            : null,
        porta: form.tipo === "tcp" ? Number(form.porta) || null : null,
        keyword: form.tipo === "keyword" ? form.keyword : null,
        dns_tipo: form.tipo === "dns" ? form.dns_tipo : null,
        intervalo_segundos: Number(form.intervalo_segundos) || 300,
        timeout_segundos: Number(form.timeout_segundos) || 15,
        falhas_para_alerta: Number(form.falhas_para_alerta) || 1,
        status_codes_aceitos: form.status_codes_aceitos || "200-299",
        webhook_url: form.webhook_url || null,
        publico: form.publico,
      };

      if (monitor) {
        const { error } = await supabase.from("monitors").update(payload).eq("id", monitor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("monitors")
          .insert({ ...payload, criado_por: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(monitor ? "Monitor atualizado" : "Monitor criado");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["monitores"] });
      queryClient.invalidateQueries({ queryKey: ["monitor"] });
    },
    onError: (erro: Error) => toast.error("Não foi possível salvar", { description: erro.message }),
  });

  const precisaUrl = form.tipo === "http" || form.tipo === "keyword";
  const precisaHost = form.tipo === "tcp" || form.tipo === "dns" || form.tipo === "ping";
  const valido =
    form.nome.trim() !== "" &&
    (!precisaUrl || form.url.trim() !== "") &&
    (!precisaHost || form.hostname.trim() !== "") &&
    (form.tipo !== "tcp" || form.porta.trim() !== "") &&
    (form.tipo !== "keyword" || form.keyword.trim() !== "");

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{monitor ? "Editar monitor" : "Novo monitor"}</DialogTitle>
          <DialogDescription>
            Defina o que deve ser verificado e com que frequência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monitor-nome">Nome</Label>
            <Input
              id="monitor-nome"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Site institucional"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de verificação</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v as MonitorTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tipoLabels).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {precisaUrl && (
            <div className="space-y-2">
              <Label htmlFor="monitor-url">Endereço</Label>
              <Input
                id="monitor-url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://exemplo.com.br"
              />
            </div>
          )}

          {form.tipo === "keyword" && (
            <div className="space-y-2">
              <Label htmlFor="monitor-keyword">Palavra que deve aparecer na página</Label>
              <Input
                id="monitor-keyword"
                value={form.keyword}
                onChange={(e) => set("keyword", e.target.value)}
              />
            </div>
          )}

          {precisaHost && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monitor-host">Endereço ou domínio</Label>
                <Input
                  id="monitor-host"
                  value={form.hostname}
                  onChange={(e) => set("hostname", e.target.value)}
                  placeholder={form.tipo === "ping" ? "189.113.131.169" : "servidor.empresa.com.br"}
                />
              </div>
              {form.tipo === "ping" ? null : form.tipo === "tcp" ? (
                <div className="space-y-2">
                  <Label htmlFor="monitor-porta">Porta</Label>
                  <Input
                    id="monitor-porta"
                    inputMode="numeric"
                    value={form.porta}
                    onChange={(e) => set("porta", e.target.value)}
                    placeholder="3389"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Tipo de registro</Label>
                  <Select value={form.dns_tipo} onValueChange={(v) => set("dns_tipo", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["A", "AAAA", "CNAME", "MX", "TXT", "NS"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {form.tipo === "heartbeat" && (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Depois de salvar, copie o endereço de sinal na página do monitor e configure o
              servidor ou rotina para chamá-lo periodicamente. Use Frequência de pelo menos 120s
              se a tarefa no Windows repetir a cada 1 minuto.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="monitor-intervalo">Verificar a cada (s)</Label>
              <Input
                id="monitor-intervalo"
                inputMode="numeric"
                value={form.intervalo_segundos}
                onChange={(e) => set("intervalo_segundos", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monitor-timeout">Tempo limite (s)</Label>
              <Input
                id="monitor-timeout"
                inputMode="numeric"
                value={form.timeout_segundos}
                onChange={(e) => set("timeout_segundos", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monitor-falhas">Falhas p/ alertar</Label>
              <Input
                id="monitor-falhas"
                inputMode="numeric"
                value={form.falhas_para_alerta}
                onChange={(e) => set("falhas_para_alerta", e.target.value)}
              />
            </div>
          </div>

          {precisaUrl && (
            <div className="space-y-2">
              <Label htmlFor="monitor-status">Códigos aceitos</Label>
              <Input
                id="monitor-status"
                value={form.status_codes_aceitos}
                onChange={(e) => set("status_codes_aceitos", e.target.value)}
                placeholder="200-299"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="monitor-webhook">Webhook de alerta (opcional)</Label>
            <Input
              id="monitor-webhook"
              value={form.webhook_url}
              onChange={(e) => set("webhook_url", e.target.value)}
              placeholder="https://hooks.exemplo.com/..."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Mostrar na página de status pública</p>
              <p className="text-xs text-muted-foreground">
                Qualquer pessoa com o link vê o estado deste item.
              </p>
            </div>
            <Switch checked={form.publico} onCheckedChange={(v) => set("publico", v)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => salvar.mutate()} disabled={!valido || salvar.isPending}>
            {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {monitor ? "Salvar alterações" : "Criar monitor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
