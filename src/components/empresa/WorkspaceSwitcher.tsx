import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/empresa/RoleBadge";
import { useCurrentWorkspace, useMyWorkspaces, useProfile } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function WorkspaceSwitcher() {
  const { data: empresas = [] } = useMyWorkspaces();
  const atual = useCurrentWorkspace();
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const profile = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMaster = profile.data?.role_global === "master";

  function trocar(id: string) {
    setWorkspaceId(id);
    queryClient.clear();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="max-w-[240px] justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{atual?.workspace.nome ?? "Selecionar empresa"}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Empresas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {empresas.map((item) => (
          <DropdownMenuItem
            key={item.workspace.id}
            onSelect={() => trocar(item.workspace.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              {atual?.workspace.id === item.workspace.id ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <span className="h-4 w-4" />
              )}
              <span className="truncate">{item.workspace.nome}</span>
            </span>
            <RoleBadge role={item.role} />
          </DropdownMenuItem>
        ))}
        {isMaster && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/admin-global/empresas" })}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar nova empresa
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
