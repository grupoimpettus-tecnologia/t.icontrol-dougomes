import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useMyWorkspaces, useProfile } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export const Route = createFileRoute("/_authenticated/_painel")({
  component: PainelLayout,
});

function PainelLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useProfile();
  const empresas = useMyWorkspaces();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!empresas.isSuccess) return;
    const lista = empresas.data ?? [];
    if (lista.length === 0) {
      navigate({ to: "/selecionar-empresa", replace: true });
      return;
    }
    const valido = lista.some((item) => item.workspace.id === workspaceId);
    if (!valido) {
      if (lista.length === 1) setWorkspaceId(lista[0]!.workspace.id);
      else navigate({ to: "/selecionar-empresa", replace: true });
    }
  }, [empresas.isSuccess, empresas.data, workspaceId, navigate, setWorkspaceId]);

  const isMaster = profile.data?.role_global === "master";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          isMaster={!!isMaster}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 h-full">
            <AppSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              isMaster={!!isMaster}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
