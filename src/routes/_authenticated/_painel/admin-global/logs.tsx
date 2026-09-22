import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportarMenu } from "@/components/ExportarMenu";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useWorkspaces";

export const Route = createFileRoute("/_authenticated/_painel/admin-global/logs")({
  head: () => ({ meta: [
    { title: "Logs de alterações | TIControl" },
    { name: "description", content: "Histórico completo das alterações realizadas no TIControl." },
    { property: "og:title", content: "Logs de alterações | TIControl" },
    { property: "og:description", content: "Histórico completo das alterações realizadas no TIControl." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Logs,
});

const ignorados = new Set(["updated_at", "created_at", "ultima_verificacao", "ultima_latencia_ms", "ultima_mensagem", "falhas_consecutivas", "sucessos_consecutivos"]);
function resumoAlteracao(antes: unknown, depois: unknown) {
  const a = (antes ?? {}) as Record<string, unknown>;
  const d = (depois ?? {}) as Record<string, unknown>;
  const chaves = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter((chave) => !ignorados.has(chave) && JSON.stringify(a[chave]) !== JSON.stringify(d[chave]));
  if (!chaves.length) return "Sem alteração de conteúdo";
  return chaves.slice(0, 4).map((chave) => `${chave.replaceAll("_", " ")}: ${String(a[chave] ?? "—")} → ${String(d[chave] ?? "—")}`).join(" · ");
}

function Logs() {
  const profile = useProfile();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  useEffect(() => { if (profile.isSuccess && profile.data?.role_global !== "master") navigate({ to: "/dashboard", replace: true }); }, [profile.isSuccess, profile.data, navigate]);
  const consulta = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const [{ data: logs, error }, { data: perfis }, { data: empresas }] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("id, nome"),
        supabase.from("workspaces").select("id, nome"),
      ]);
      if (error) throw error;
      const nomes = new Map((perfis ?? []).map((item) => [item.id, item.nome]));
      const empresasNomes = new Map((empresas ?? []).map((item) => [item.id, item.nome]));
      return (logs ?? []).map((log) => ({ ...log, usuario_nome: log.user_id ? nomes.get(log.user_id) : null, empresa_nome: log.workspace_id ? empresasNomes.get(log.workspace_id) : null }));
    },
  });
  const linhas = useMemo(() => (consulta.data ?? []).map((log) => ({
    ...log,
    data: new Date(log.created_at).toLocaleString("pt-BR"),
    usuario: log.usuario_nome ?? "Sistema",
    empresa: log.empresa_nome ?? "Global",
    alteracao: resumoAlteracao(log.dados_anteriores, log.dados_novos),
  })).filter((log) => JSON.stringify(log).toLowerCase().includes(busca.toLowerCase())), [consulta.data, busca]);
  const colunas = [
    { chave: "data", titulo: "Data e horário" }, { chave: "usuario", titulo: "Usuário" }, { chave: "empresa", titulo: "Empresa" },
    { chave: "modulo", titulo: "Módulo" }, { chave: "acao", titulo: "Ação" }, { chave: "item_nome", titulo: "Item" }, { chave: "alteracao", titulo: "Alteração" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Logs de alterações</h1><p className="mt-1 text-sm text-muted-foreground">Histórico de mudanças em todas as empresas e módulos.</p></div><ExportarMenu titulo="Logs de alterações" colunas={colunas} linhas={linhas} /></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" placeholder="Buscar nos logs..." /></div>
      <Card className="rounded-xl"><CardContent className="p-0"><div className="app-scrollbar overflow-x-auto"><Table><TableHeader><TableRow>{colunas.map((c) => <TableHead key={c.chave}>{c.titulo}</TableHead>)}</TableRow></TableHeader><TableBody>{linhas.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs">{log.data}</TableCell><TableCell>{log.usuario}</TableCell><TableCell>{log.empresa}</TableCell><TableCell>{log.modulo ?? log.entidade}</TableCell><TableCell>{log.acao}</TableCell><TableCell className="font-medium">{log.item_nome ?? log.entidade_id}</TableCell><TableCell className="min-w-80 text-xs text-muted-foreground">{log.alteracao}</TableCell></TableRow>)}{!linhas.length && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><History className="mx-auto mb-2 h-6 w-6" />Nenhum log encontrado.</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card>
    </div>
  );
}