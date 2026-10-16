import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new publish, open tabs may request old file chunks that no longer exist.
// Reload once to fetch the fresh version instead of showing a blank screen.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const chave = "ticontrol-reload-chunk";
    const ultimo = Number(sessionStorage.getItem(chave) ?? 0);
    if (Date.now() - ultimo > 10_000) {
      sessionStorage.setItem(chave, String(Date.now()));
      window.location.reload();
    }
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
