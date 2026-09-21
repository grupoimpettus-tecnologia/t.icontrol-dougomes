import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type WorkspaceAccess = {
  workspace: Workspace;
  role: AppRole;
  ultimoAcesso: string | null;
};

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyWorkspaces() {
  const { user } = useAuth();
  const profile = useProfile();
  const isMaster = profile.data?.role_global === "master";

  return useQuery({
    queryKey: ["my-workspaces", user?.id, isMaster],
    enabled: !!user && profile.isSuccess,
    queryFn: async (): Promise<WorkspaceAccess[]> => {
      const { data: links, error: linkError } = await supabase
        .from("user_workspaces")
        .select("workspace_id, role_no_workspace, ultimo_acesso")
        .eq("profile_id", user!.id);
      if (linkError) throw linkError;

      const { data: workspaces, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("nome");
      if (error) throw error;

      const byId = new Map(links?.map((l) => [l.workspace_id, l]) ?? []);

      return (workspaces ?? [])
        .filter((w) => isMaster || byId.has(w.id))
        .map((w) => ({
          workspace: w,
          role: (isMaster ? "master" : byId.get(w.id)?.role_no_workspace ?? "viewer") as AppRole,
          ultimoAcesso: byId.get(w.id)?.ultimo_acesso ?? null,
        }));
    },
  });
}

export function useCurrentWorkspace() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const { data } = useMyWorkspaces();
  return data?.find((item) => item.workspace.id === workspaceId) ?? null;
}

export const roleLabels: Record<AppRole, string> = {
  master: "Master",
  admin: "Administrador",
  tecnico: "Técnico",
  viewer: "Visualizador",
};
