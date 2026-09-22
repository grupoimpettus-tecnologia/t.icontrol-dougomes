import type { Database } from "@/integrations/supabase/types";

type Monitor = Database["public"]["Tables"]["monitors"]["Row"];
type Resultado = { mensagem: string; latencia_ms: number | null };

export async function enviarAlertasMonitor(monitor: Monitor, resultado: Resultado, evento: "indisponivel" | "recuperado") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: destinos }, { data: workspace }] = await Promise.all([
    supabaseAdmin.from("monitor_notification_recipients").select("canal, email, profile_id").eq("monitor_id", monitor.id),
    supabaseAdmin.from("workspaces").select("nome").eq("id", monitor.workspace_id).maybeSingle(),
  ]);
  if (!destinos?.length) return;

  const titulo = evento === "indisponivel" ? `Falha: ${monitor.nome}` : `Recuperado: ${monitor.nome}`;
  const corpo = `${monitor.nome} está ${evento === "indisponivel" ? "fora do ar" : "novamente no ar"}. ${resultado.mensagem}${resultado.latencia_ms == null ? "" : ` Latência: ${resultado.latencia_ms} ms.`}`;
  const emails = destinos.filter((item) => item.canal === "email" && item.email).map((item) => item.email as string);
  const perfis = destinos.filter((item) => item.canal === "push" && item.profile_id).map((item) => item.profile_id as string);

  if (emails.length) {
    let ultimoErro = "Falha no envio";
    let enviado = false;
    try {
      const nodemailer = await import("nodemailer");
      const configurada = Number(process.env["DEFAULT_SMTP_PORT"] ?? 587);
      const portas = Array.from(new Set([465, configurada, 587]));
      for (const porta of portas) {
        try {
          const transporte = nodemailer.createTransport({
            host: process.env["DEFAULT_SMTP_HOST"],
            port: porta,
            secure: porta === 465,
            requireTLS: porta !== 465,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            tls: { servername: process.env["DEFAULT_SMTP_HOST"] },
            auth: { user: process.env["DEFAULT_SMTP_USER"], pass: process.env["DEFAULT_SMTP_PASSWORD"] },
          });
          await transporte.sendMail({
            from: process.env["DEFAULT_SMTP_FROM"],
            to: emails,
            subject: `[TIControl] ${titulo}`,
            text: `${corpo}\nEmpresa: ${workspace?.nome ?? ""}`,
            html: `<h2>${titulo}</h2><p>${corpo}</p><p><strong>Empresa:</strong> ${workspace?.nome ?? ""}</p>`,
          });
          enviado = true;
          break;
        } catch (erro) {
          ultimoErro = `porta ${porta}: ${erro instanceof Error ? erro.message : "falha"}`;
        }
      }
    } catch (erro) {
      ultimoErro = erro instanceof Error ? erro.message : "Falha no envio";
    }
    await supabaseAdmin.from("notification_logs").insert(emails.map((email) => ({ monitor_id: monitor.id, workspace_id: monitor.workspace_id, canal: "email", destinatario: email, evento, enviado, mensagem: enviado ? corpo : ultimoErro })));
  }


  if (perfis.length) {
    const { data: assinaturas } = await supabaseAdmin.from("push_subscriptions").select("profile_id, token").in("profile_id", perfis);
    if (assinaturas?.length) {
      const webpush = await import("web-push");
      const privada = process.env["VAPID_PRIVATE_KEY"];
      if (privada) {
        const { createECDH } = await import("node:crypto");
        const ecdh = createECDH("prime256v1");
        ecdh.setPrivateKey(Buffer.from(privada, "base64url"));
        webpush.setVapidDetails("mailto:alertas@ticontrol.app", ecdh.getPublicKey().toString("base64url"), privada);
        await Promise.all(assinaturas.map(async (assinatura) => {
          try {
            await webpush.sendNotification(JSON.parse(assinatura.token), JSON.stringify({ title: titulo, body: corpo, url: `/infra/monitoring/${monitor.id}` }));
            await supabaseAdmin.from("notification_logs").insert({ monitor_id: monitor.id, workspace_id: monitor.workspace_id, canal: "push", destinatario: assinatura.profile_id, evento, enviado: true, mensagem: corpo });
          } catch (erro) {
            await supabaseAdmin.from("notification_logs").insert({ monitor_id: monitor.id, workspace_id: monitor.workspace_id, canal: "push", destinatario: assinatura.profile_id, evento, enviado: false, mensagem: erro instanceof Error ? erro.message : "Falha no envio" });
          }
        }));
      }
    }
  }
}