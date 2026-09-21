import { create } from "zustand";

const STORAGE_KEY = "ticontrol:workspace";

type WorkspaceState = {
  workspaceId: string | null;
  setWorkspaceId: (id: string | null) => void;
  hydrate: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaceId: null,
  setWorkspaceId: (id) => {
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    set({ workspaceId: id });
  },
  hydrate: () => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) set({ workspaceId: stored });
  },
}));
