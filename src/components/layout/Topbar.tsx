import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceSwitcher } from "@/components/empresa/WorkspaceSwitcher";
import { RoleBadge } from "@/components/empresa/RoleBadge";
import { useCurrentWorkspace, useProfile } from "@/hooks/useWorkspaces";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const profile = useProfile();
  const atual = useCurrentWorkspace();
  const { theme, toggle } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    setWorkspaceId(null);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu}>
          <Menu className="h-5 w-5" />
        </Button>
        <WorkspaceSwitcher />
        {atual && <RoleBadge role={atual.role} className="hidden sm:inline-flex" />}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">
              {profile.data?.nome || profile.data?.email || "Minha conta"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/selecionar-empresa" })}>
              Trocar de empresa
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/configuracoes" })}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={sair}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
