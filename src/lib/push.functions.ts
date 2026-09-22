import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const obterChavePush = createServerFn({ method: "GET" }).handler(async () => {
  const privada = process.env["VAPID_PRIVATE_KEY"];
  if (!privada) throw new Error("Notificações push não configuradas.");
  const { createECDH } = await import("node:crypto");
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(Buffer.from(privada, "base64url"));
  return { publicKey: ecdh.getPublicKey().toString("base64url") };
});

export const salvarAssinaturaPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((entrada) => z.object({ assinatura: z.string().min(10) }).parse(entrada))
  .handler(async ({ data, context }) => {
    const assinatura = JSON.parse(data.assinatura) as { endpoint?: string };
    if (!assinatura.endpoint) throw new Error("Assinatura inválida.");
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      { profile_id: context.userId, token: data.assinatura, updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const removerAssinaturasPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("push_subscriptions").delete().eq("profile_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });