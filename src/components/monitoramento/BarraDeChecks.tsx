import { cn } from "@/lib/utils";

export function BarraDeChecks({
  checks,
  className,
}: {
  checks: { ok: boolean; criado_em: string; mensagem: string | null }[];
  className?: string;
}) {
  const ultimos = [...checks].slice(0, 40).reverse();

  if (!ultimos.length) {
    return <p className="text-xs text-muted-foreground">Ainda sem verificações.</p>;
  }

  return (
    <div className={cn("flex items-end gap-[3px]", className)}>
      {ultimos.map((check, i) => (
        <span
          key={`${check.criado_em}-${i}`}
          title={`${new Date(check.criado_em).toLocaleString("pt-BR")} — ${
            check.mensagem ?? (check.ok ? "OK" : "Falha")
          }`}
          className={cn(
            "h-6 w-[6px] rounded-sm",
            check.ok ? "bg-emerald-500" : "bg-destructive",
          )}
        />
      ))}
    </div>
  );
}
