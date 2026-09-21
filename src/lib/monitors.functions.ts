import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Executa a verificação de um monitor sob demanda, respeitando o acesso do usuário. */
export const verificarAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ monitorId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: permitido, error } = await context.supabase
      .from("monitors")
      .select("id")
      .eq("id", data.monitorId)
      .maybeSingle();
    if (error) throw error;
    if (!permitido) throw new Error("Monitor não encontrado");

    const { executarCheck, registrarResultado } = await import("@/lib/monitor-runner.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: monitor } = await supabaseAdmin
      .from("monitors")
      .select("*")
      .eq("id", data.monitorId)
      .single();

    const resultado = await executarCheck(monitor!);
    const info = await registrarResultado(monitor!, resultado);
    return { ...resultado, status: info.status };
  });
