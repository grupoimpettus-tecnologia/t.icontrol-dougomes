import { cn } from "@/lib/utils";
import { roleLabels, type AppRole } from "@/hooks/useWorkspaces";

const styles: Record<AppRole, string> = {
  master: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  admin: "bg-primary/15 text-primary border-primary/30",
  tecnico: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

export function RoleBadge({ role, className }: { role: AppRole; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[role],
        className,
      )}
    >
      {roleLabels[role]}
    </span>
  );
}
