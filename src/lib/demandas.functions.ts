import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ROTULO_CLASSIFICACAO,
  ROTULO_COLUNA,
  ROTULO_ESCOPO,
  type ClassificacaoDemanda,
  type EscopoDemanda,
} from "@/lib/demandas";

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlParaTexto(html: string | null | undefined) {
  if (!html?.trim()) return "—";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim() || "—";
}

/** Remove scripts e handlers perigosos; mantém a formatação do editor. */
function htmlSeguroParaEmail(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function formatarDataBr(iso: string | null | undefined) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

function rotuloEscopo(escopo: string | null, nome: string | null) {
  if (!escopo) return "—";
  const base = ROTULO_ESCOPO[escopo as EscopoDemanda] ?? escopo;
  return nome?.trim() ? `${base}: ${nome.trim()}` : base;
}

function rotuloClassificacao(valor: string | null) {
  if (!valor) return "—";
  return ROTULO_CLASSIFICACAO[valor as ClassificacaoDemanda] ?? valor;
}

export const concluirEEnviarDemanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        demandaId: z.string().uuid(),
        emailDestino: z.string().email("E-mail inválido"),
        conclusaoHtml: z.string().min(1, "Informe as considerações de conclusão"),
      })
      .refine((valor) => htmlParaTexto(valor.conclusaoHtml) !== "—", {
        message: "Informe as considerações de conclusão",
        path: ["conclusaoHtml"],
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: demanda, error } = await db
      .from("demandas")
      .select(
        "id, workspace_id, nome, data_inicio, data_pedida, data_entrega, observacoes_html, escopo, escopo_nome, classificacao, solicitante_nome, responsavel_nome, status, created_at",
      )
      .eq("id", data.demandaId)
      .maybeSingle();
    if (error) throw error;
    if (!demanda) throw new Error("Demanda não encontrada");

    const { data: papel } = await context.supabase.rpc("workspace_role", {
      _user_id: context.userId,
      _workspace_id: demanda.workspace_id,
    });
    if (!papel || !["master", "admin", "tecnico"].includes(papel)) {
      throw new Error("Sem permissão para concluir a demanda");
    }

    const { smtpConfigurado, enviarEmailSmtp } = await import("@/lib/notifications.server");
    if (!smtpConfigurado()) {
      throw new Error("SMTP não configurado no servidor (DEFAULT_SMTP_HOST/USER/PASSWORD/FROM).");
    }

    const conclusaoHtml = htmlSeguroParaEmail(data.conclusaoHtml);
    const observacoesHtml = demanda.observacoes_html?.trim()
      ? htmlSeguroParaEmail(demanda.observacoes_html)
      : "<p>—</p>";

    const assunto = `[TI] Entrega Demanda - ${demanda.nome}`;
    const campos = [
      ["Nome", demanda.nome],
      ["Status", ROTULO_COLUNA.concluida],
      ["Escopo", rotuloEscopo(demanda.escopo, demanda.escopo_nome)],
      ["Classificação", rotuloClassificacao(demanda.classificacao)],
      ["Solicitante", demanda.solicitante_nome?.trim() || "—"],
      ["Responsável", demanda.responsavel_nome?.trim() || "—"],
      ["Início", formatarDataBr(demanda.data_inicio)],
      ["Data pedida", formatarDataBr(demanda.data_pedida)],
      ["Entrega", formatarDataBr(demanda.data_entrega)],
    ] as const;

    const texto =
      `Demanda concluída\n\n` +
      campos.map(([rotulo, valor]) => `${rotulo}: ${valor}`).join("\n") +
      `\n\n----------\nO que foi pedido (Observações)\n----------\n` +
      `${htmlParaTexto(demanda.observacoes_html)}\n\n` +
      `----------\nConclusão\n----------\n` +
      `${htmlParaTexto(conclusaoHtml)}`;

    const linhasHtml = campos
      .map(
        ([rotulo, valor]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">${escaparHtml(rotulo)}</td><td style="padding:6px 0;color:#0f172a;"><strong>${escaparHtml(valor)}</strong></td></tr>`,
      )
      .join("");

    const html =
      `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">` +
      `<p style="margin:0 0 16px;">A demanda <strong>${escaparHtml(demanda.nome)}</strong> foi concluída.</p>` +
      `<table style="border-collapse:collapse;margin:0 0 20px;">${linhasHtml}</table>` +
      `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />` +
      `<h2 style="margin:0 0 8px;font-size:15px;color:#0f172a;">O que foi pedido (Observações)</h2>` +
      `<div style="margin:0 0 20px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">${observacoesHtml}</div>` +
      `<h2 style="margin:0 0 8px;font-size:15px;color:#0f172a;">Conclusão</h2>` +
      `<div style="margin:0;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">${conclusaoHtml}</div>` +
      `</div>`;

    await enviarEmailSmtp({
      to: data.emailDestino.trim(),
      subject: assunto,
      text: texto,
      html,
    });

    const { error: erroStatus } = await db.from("demandas").update({ status: "concluida" }).eq("id", demanda.id);
    if (erroStatus) throw erroStatus;

    const { error: erroAtualizacao } = await db.from("demanda_atualizacoes").insert({
      demanda_id: demanda.id,
      workspace_id: demanda.workspace_id,
      autor_id: context.userId,
      texto_html: `<p><strong>Conclusão</strong></p>${conclusaoHtml}`,
    });
    if (erroAtualizacao) throw erroAtualizacao;

    return { ok: true as const, emailEnviado: true as const, assunto, destinatario: data.emailDestino.trim() };
  });
