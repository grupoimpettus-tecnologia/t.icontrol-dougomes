import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  ChevronLeft,
  Cpu,
  KeyRound,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ElementType };

const modulos: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Geral",
    itens: [{ to: "/dashboard", label: "Dashboard de Infra", icon: LayoutDashboard }],
  },
  {
    titulo: "Infraestrutura",
    itens: [
      { to: "/infra/access-map", label: "Mapa de acessos", icon: KeyRound },
      { to: "/infra/services-assets", label: "Serviços & ativos", icon: Package },
      { to: "/infra/equipments", label: "Equipamentos", icon: Cpu },
      { to: "/infra/phone-lines", label: "Linhas Móveis", icon: Smartphone },
      { to: "/infra/phone-stock", label: "Estoque Celulares", icon: Smartphone },
      { to: "/infra/monitoring", label: "Monitoramento", icon: Activity },
    ],
  },
  {
    titulo: "Sistemas",
    itens: [{ to: "/pdv", label: "Sistema PDV", icon: Store }],
  },
];

const adminItens: Item[] = [
  { to: "/admin-global/empresas", label: "Empresas", icon: Building2 },
  { to: "/admin-global/usuarios", label: "Usuários", icon: ShieldCheck },
  { to: "/admin-global/convites", label: "Convites", icon: KeyRound },
  { to: "/admin-global/logs", label: "Logs", icon: History },
  { to: "/admin-global/metricas", label: "Métricas", icon: Activity },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar({
  collapsed,
  onToggle,
  isMaster,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  isMaster: boolean;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const grupos = isMaster
    ? [...modulos, { titulo: "Administração Global", itens: adminItens }]
    : modulos;

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">
            TI<span className="text-sidebar-primary">Control</span>
          </span>
        )}
        <button
          onClick={onToggle}
          className="hidden rounded-md p-1.5 hover:bg-sidebar-accent lg:block"
          aria-label="Recolher menu"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 pb-6">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            {!collapsed && (
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                {grupo.titulo}
              </p>
            )}
            <ul className="space-y-1">
              {grupo.itens.map((item) => {
                const ativo = pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        ativo
                          ? "bg-sidebar-primary/15 text-sidebar-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
