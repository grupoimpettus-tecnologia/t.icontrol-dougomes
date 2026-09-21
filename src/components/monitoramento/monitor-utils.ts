import type { Database } from "@/integrations/supabase/types";

export type Monitor = Database["public"]["Tables"]["monitors"]["Row"];
export type MonitorCheck = Database["public"]["Tables"]["monitor_checks"]["Row"];
export type MonitorStatus = Database["public"]["Enums"]["monitor_status"];
export type MonitorTipo = Database["public"]["Enums"]["monitor_type"];

export const tipoLabels: Record<MonitorTipo, string> = {
  http: "Site / HTTP",
  keyword: "Palavra-chave",
  tcp: "Porta TCP",
  dns: "DNS",
  heartbeat: "Sinal de vida",
};

export const statusLabels: Record<MonitorStatus, string> = {
  pendente: "Aguardando",
  ativo: "No ar",
  fora: "Fora do ar",
  pausado: "Pausado",
};

export const statusClasses: Record<MonitorStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  ativo: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  fora: "bg-destructive/15 text-destructive",
  pausado: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function alvoDoMonitor(monitor: Monitor) {
  switch (monitor.tipo) {
    case "http":
    case "keyword":
      return monitor.url ?? "—";
    case "tcp":
      return `${monitor.hostname ?? "—"}:${monitor.porta ?? ""}`;
    case "dns":
      return `${monitor.hostname ?? "—"} (${monitor.dns_tipo ?? "A"})`;
    case "heartbeat":
      return "Recebe sinal externo";
    default:
      return "—";
  }
}

export function calcularUptime(checks: { ok: boolean }[]) {
  if (!checks.length) return null;
  const ok = checks.filter((c) => c.ok).length;
  return (ok / checks.length) * 100;
}

export function formatarDuracao(segundos: number | null) {
  if (segundos == null) return "—";
  if (segundos < 60) return `${segundos}s`;
  if (segundos < 3600) return `${Math.round(segundos / 60)} min`;
  const horas = Math.floor(segundos / 3600);
  const min = Math.round((segundos % 3600) / 60);
  return `${horas}h ${min}min`;
}

export function formatarIntervalo(segundos: number) {
  if (segundos < 60) return `${segundos}s`;
  if (segundos % 3600 === 0) return `${segundos / 3600}h`;
  return `${Math.round(segundos / 60)} min`;
}
