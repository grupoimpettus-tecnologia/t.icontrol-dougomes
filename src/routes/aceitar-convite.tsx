import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Search = { token?: string | undefined };

export const Route = createFileRoute("/aceitar-convite")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Aceitar convite — TIControl" },
      { name: "description", content: "Aceite seu convite de acesso ao TIControl." },
      { property: "og:title", content: "Aceitar convite — TIControl" },
      { property: "og:description", content: "Aceite seu convite de acesso ao TIControl." },
    ],
  }),
  component: AceitarConvite,
});

const mensagens: Record<string, string> = {
  convite_invalido: "Este convite não existe.",
  convite_ja_utilizado: "Este convite já foi utilizado.",
  convite_expirado: "Este convite expirou. Peça um novo.",
  email_diferente: "Entre com o mesmo e-mail que recebeu o convite.",
  nao_autenticado: "Faça login para aceitar o convite.",
};

function AceitarConvite() {
  const { token } = Route.useSearch();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<"processando" | "ok" | "erro">("processando");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setEstado("erro");
      setMensagem("Faça login com o e-mail convidado para continuar.");
      return;
    }
    if (!token) {
      setEstado("erro");
      setMensagem("Link de convite inválido.");
      return;
    }
    supabase.rpc("accept_invite", { _token: token }).then(({ data, error }) => {
      const resultado = data as { ok?: boolean; erro?: string } | null;
      if (error || !resultado?.ok) {
        setEstado("erro");
        setMensagem(mensagens[resultado?.erro ?? ""] ?? "Não foi possível aceitar o convite.");
        return;
      }
      setEstado("ok");
    });
  }, [loading, session, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Convite de acesso</CardTitle>
          <CardDescription>TIControl</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {estado === "processando" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando convite...
            </p>
          )}
          {estado === "ok" && (
            <>
              <p className="text-sm text-muted-foreground">
                Convite aceito! Seu acesso às empresas já está liberado.
              </p>
              <Button onClick={() => navigate({ to: "/selecionar-empresa" })}>
                Selecionar empresa
              </Button>
            </>
          )}
          {estado === "erro" && (
            <>
              <p className="text-sm text-destructive">{mensagem}</p>
              <Button variant="outline" onClick={() => navigate({ to: "/auth" })}>
                Ir para o login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
