import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FASES_MICRO_FRANQUEADO, type PassoMicroFranqueado } from "@/data/micro-franqueado";

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlParaTexto(html: string | null | undefined) {
  if (!html?.trim()) return "";
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
    .trim();
}

function montarDetalhePassoTexto(passo: PassoMicroFranqueado, evidencia?: string | null) {
  const linhas: string[] = [
    `${passo.codigo} ${passo.titulo}`,
    "",
    passo.tiIntro ?? "T.I da Franqueadora:",
  ];
  if (passo.tiTexto) linhas.push(passo.tiTexto);
  if (passo.tiItens?.length) {
    for (const item of passo.tiItens) linhas.push(`- ${item}`);
  }
  if (passo.entregavel) {
    linhas.push("", `Entregável: ${passo.entregavel}`);
  }
  if (passo.pontoAtencao) {
    linhas.push("", `Ponto de atenção: ${passo.pontoAtencao}`);
  }
  const evidenciaTexto = htmlParaTexto(evidencia);
  if (evidenciaTexto) {
    linhas.push("", "Evidência registrada:", evidenciaTexto);
  }
  return linhas.join("\n");
}

function montarDetalhePassoHtml(passo: PassoMicroFranqueado, evidencia?: string | null) {
  const partes: string[] = [
    `<h3 style="margin:18px 0 8px;font-size:15px;color:#0f172a;">${escaparHtml(passo.codigo)} ${escaparHtml(passo.titulo)}</h3>`,
    `<p style="margin:0 0 6px;font-weight:600;">${escaparHtml(passo.tiIntro ?? "T.I da Franqueadora:")}</p>`,
  ];
  if (passo.tiTexto) {
    partes.push(`<p style="margin:0 0 8px;color:#475569;">${escaparHtml(passo.tiTexto)}</p>`);
  }
  if (passo.tiItens?.length) {
    partes.push("<ul style=\"margin:0 0 8px;padding-left:18px;color:#475569;\">");
    for (const item of passo.tiItens) {
      partes.push(`<li style="margin-bottom:4px;">${escaparHtml(item)}</li>`);
    }
    partes.push("</ul>");
  }
  if (passo.entregavel) {
    partes.push(
      `<p style="margin:8px 0 0;"><strong style="color:#0891b2;">Entregável:</strong> ${escaparHtml(passo.entregavel)}</p>`,
    );
  }
  if (passo.pontoAtencao) {
    partes.push(
      `<p style="margin:8px 0 0;"><strong style="color:#b45309;">Ponto de atenção:</strong> ${escaparHtml(passo.pontoAtencao)}</p>`,
    );
  }
  const evidenciaTexto = htmlParaTexto(evidencia);
  if (evidenciaTexto) {
    partes.push(
      `<div style="margin-top:10px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">`,
      `<p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Evidência registrada</p>`,
      `<p style="margin:0;color:#334155;white-space:pre-wrap;">${escaparHtml(evidenciaTexto)}</p>`,
      `</div>`,
    );
  }
  return partes.join("");
}

export const enviarConfirmacaoImplantacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        lojaId: z.string().uuid(),
        faseId: z.enum(["nova-loja", "pos"]),
        emailLoja: z.string().email("E-mail da loja inválido"),
        emailArea: z.string().email("E-mail da área inválido"),
        emailTi: z.string().email("E-mail do time de T.I. inválido"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: loja, error } = await db
      .from("pdv_lojas")
      .select("id, nome, marca, cnpj, status, workspace_id")
      .eq("id", data.lojaId)
      .maybeSingle();
    if (error) throw error;
    if (!loja) throw new Error("Loja não encontrada");

    const { data: papel } = await context.supabase.rpc("workspace_role", {
      _user_id: context.userId,
      _workspace_id: loja.workspace_id,
    });
    if (!papel || !["master", "admin", "tecnico"].includes(papel)) {
      throw new Error("Sem permissão para enviar confirmação");
    }

    const fase = FASES_MICRO_FRANQUEADO.find((f) => f.id === data.faseId);
    if (!fase) throw new Error("Fase não encontrada");

    const { data: etapas, error: erroEtapas } = await db
      .from("pdv_loja_etapas")
      .select("etapa_id, concluida, evidencia_html")
      .eq("loja_id", loja.id);
    if (erroEtapas) throw erroEtapas;

    const evidenciaPorEtapa = new Map<string, string | null>(
      ((etapas ?? []) as { etapa_id: string; evidencia_html: string | null }[]).map((e) => [
        e.etapa_id,
        e.evidencia_html,
      ]),
    );
    const concluidas = new Set(
      ((etapas ?? []) as { etapa_id: string; concluida: boolean }[])
        .filter((e) => e.concluida)
        .map((e) => e.etapa_id),
    );

    const { smtpConfigurado, enviarEmailSmtp } = await import("@/lib/notifications.server");
    if (!smtpConfigurado()) {
      throw new Error("SMTP não configurado no servidor (DEFAULT_SMTP_HOST/USER/PASSWORD/FROM).");
    }

    const destinatarios = Array.from(
      new Set([data.emailLoja.trim(), data.emailArea.trim(), data.emailTi.trim()]),
    );
    const assunto = `[TIControl] Entrega Implantação de loja - ${loja.nome}`;

    const intro =
      "Oi pessoal, tudo bem?\n\n" +
      "A loja está implantada, segue todo resumo que foi seguido por parte de T.I da franqueadora e em conjunto com o t.i da loja para realizar a entrega:";

    const cabecalhoLoja = [
      `Loja: ${loja.nome}`,
      `Marca: ${loja.marca}`,
      `CNPJ: ${loja.cnpj}`,
      `Fase: ${fase.codigo}. ${fase.titulo} — ${fase.subtitulo}`,
    ].join("\n");

    const checklistTexto = fase.passos
      .map((passo) => {
        const status = concluidas.has(passo.id) ? "Concluída" : "Pendente";
        return (
          `${montarDetalhePassoTexto(passo, evidenciaPorEtapa.get(passo.id))}\n` +
          `Status no checklist: ${status}`
        );
      })
      .join("\n\n------------------------------\n\n");

    const texto = `${intro}\n\n${cabecalhoLoja}\n\n${checklistTexto}`;

    const checklistHtml = fase.passos
      .map((passo) => {
        const status = concluidas.has(passo.id) ? "Concluída" : "Pendente";
        return (
          `<div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">` +
          montarDetalhePassoHtml(passo, evidenciaPorEtapa.get(passo.id)) +
          `<p style="margin:10px 0 0;font-size:13px;"><strong>Status no checklist:</strong> ${escaparHtml(status)}</p>` +
          `</div>`
        );
      })
      .join("");

    const html =
      `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">` +
      `<p>Oi pessoal, tudo bem?</p>` +
      `<p>A loja está implantada, segue todo resumo que foi seguido por parte de T.I da franqueadora e em conjunto com o t.i da loja para realizar a entrega:</p>` +
      `<p><strong>Loja:</strong> ${escaparHtml(loja.nome)}<br/>` +
      `<strong>Marca:</strong> ${escaparHtml(loja.marca)}<br/>` +
      `<strong>CNPJ:</strong> ${escaparHtml(loja.cnpj)}<br/>` +
      `<strong>Fase:</strong> ${escaparHtml(`${fase.codigo}. ${fase.titulo} — ${fase.subtitulo}`)}</p>` +
      `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />` +
      checklistHtml +
      `</div>`;

    await enviarEmailSmtp({
      to: destinatarios,
      subject: assunto,
      text: texto,
      html,
    });

    return { ok: true, destinatarios, assunto };
  });

const EMAIL_TESTE_PADRAO = "ti@grupoimpettus.com.br";

/** Envia um e-mail de demonstração da confirmação de implantação (fase Nova Loja). */
export const enviarTesteConfirmacaoImplantacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email().default(EMAIL_TESTE_PADRAO),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { smtpConfigurado, enviarEmailSmtp } = await import("@/lib/notifications.server");
    if (!smtpConfigurado()) {
      throw new Error("SMTP não configurado no servidor (DEFAULT_SMTP_HOST/USER/PASSWORD/FROM).");
    }

    const fase = FASES_MICRO_FRANQUEADO.find((f) => f.id === "nova-loja");
    if (!fase) throw new Error("Fase não encontrada");

    const lojaDemo = {
      nome: "Loja Teste — Espetto Carioca",
      marca: "Espetto Carioca",
      cnpj: "53.011.112/0001-04",
    };

    const evidenciasDemo = new Map<string, string | null>([
      [
        "nl-1",
        "Conta criada: lojateste@espettocarioca.com.br. Credenciais enviadas ao consultor e manual de primeiros passos compartilhado.",
      ],
      [
        "nl-2",
        "Cartilha de Hardware entregue em PDF com lista de fornecedores homologados.",
      ],
    ]);

    const destinatario = data.email.trim() || EMAIL_TESTE_PADRAO;
    const assunto = `[TIControl] Entrega Implantação de loja - ${lojaDemo.nome}`;

    const intro =
      "Oi pessoal, tudo bem?\n\n" +
      "A loja está implantada, segue todo resumo que foi seguido por parte de T.I da franqueadora e em conjunto com o t.i da loja para realizar a entrega:";

    const cabecalhoLoja = [
      `Loja: ${lojaDemo.nome}`,
      `Marca: ${lojaDemo.marca}`,
      `CNPJ: ${lojaDemo.cnpj}`,
      `Fase: ${fase.codigo}. ${fase.titulo} — ${fase.subtitulo}`,
      "",
      "(Este é um e-mail de TESTE da jornada de confirmação de implantação.)",
    ].join("\n");

    const checklistTexto = fase.passos
      .map((passo) => {
        const status = evidenciasDemo.has(passo.id) ? "Concluída" : "Pendente";
        return (
          `${montarDetalhePassoTexto(passo, evidenciasDemo.get(passo.id))}\n` +
          `Status no checklist: ${status}`
        );
      })
      .join("\n\n------------------------------\n\n");

    const texto = `${intro}\n\n${cabecalhoLoja}\n\n${checklistTexto}`;

    const checklistHtml = fase.passos
      .map((passo) => {
        const status = evidenciasDemo.has(passo.id) ? "Concluída" : "Pendente";
        return (
          `<div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">` +
          montarDetalhePassoHtml(passo, evidenciasDemo.get(passo.id)) +
          `<p style="margin:10px 0 0;font-size:13px;"><strong>Status no checklist:</strong> ${escaparHtml(status)}</p>` +
          `</div>`
        );
      })
      .join("");

    const html =
      `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">` +
      `<p style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;">E-MAIL DE TESTE</p>` +
      `<p>Oi pessoal, tudo bem?</p>` +
      `<p>A loja está implantada, segue todo resumo que foi seguido por parte de T.I da franqueadora e em conjunto com o t.i da loja para realizar a entrega:</p>` +
      `<p><strong>Loja:</strong> ${escaparHtml(lojaDemo.nome)}<br/>` +
      `<strong>Marca:</strong> ${escaparHtml(lojaDemo.marca)}<br/>` +
      `<strong>CNPJ:</strong> ${escaparHtml(lojaDemo.cnpj)}<br/>` +
      `<strong>Fase:</strong> ${escaparHtml(`${fase.codigo}. ${fase.titulo} — ${fase.subtitulo}`)}</p>` +
      `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />` +
      checklistHtml +
      `</div>`;

    await enviarEmailSmtp({
      to: destinatario,
      subject: assunto,
      text: texto,
      html,
    });

    return { ok: true, destinatarios: [destinatario], assunto };
  });
