import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Parâmetro authorization_id ausente");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    if (data && "redirect_url" in data) throw redirect({ href: data.redirect_url });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center px-4 text-sm text-muted-foreground">
      Não foi possível carregar esta autorização: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as { client?: { name?: string } } | undefined;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nomeCliente = details?.client?.name ?? "o aplicativo";

  async function decidir(aprovar: boolean) {
    setBusy(true);
    setErro(null);
    const { data, error } = aprovar
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setErro(error.message);
      return;
    }
    const destino = data && "redirect_url" in data ? data.redirect_url : undefined;
    if (!destino) {
      setBusy(false);
      setErro("O servidor de autorização não retornou um destino de redirecionamento.");
      return;
    }
    window.location.href = destino;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md rounded-xl">
        <CardHeader>
          <CardTitle>Conectar {nomeCliente} à sua conta</CardTitle>
          <CardDescription>
            {nomeCliente} poderá consultar os dados do TIControl com as suas permissões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => decidir(true)}>
              Aprovar
            </Button>
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decidir(false)}>
              Recusar
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
