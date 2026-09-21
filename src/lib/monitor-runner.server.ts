import type { Database } from "@/integrations/supabase/types";

export type Monitor = Database["public"]["Tables"]["monitors"]["Row"];

export type CheckResult = {
  ok: boolean;
  latencia_ms: number | null;
  status_code: number | null;
  mensagem: string;
};

function statusAceito(code: number, regra: string) {
  return regra
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .some((parte) => {
      const [ini, fim] = parte.split("-");
      const inicio = Number(ini);
      const final = fim ? Number(fim) : inicio;
      return code >= inicio && code <= final;
    });
}

async function checarHttp(monitor: Monitor, comKeyword: boolean): Promise<CheckResult> {
  const inicio = Date.now();
  try {
    const resposta = await fetch(monitor.url ?? "", {
      method: comKeyword ? "GET" : (monitor.metodo || "GET"),
      redirect: "follow",
      signal: AbortSignal.timeout((monitor.timeout_segundos || 15) * 1000),
    });
    const latencia = Date.now() - inicio;
    if (!statusAceito(resposta.status, monitor.status_codes_aceitos || "200-299")) {
      return {
        ok: false,
        latencia_ms: latencia,
        status_code: resposta.status,
        mensagem: `Resposta HTTP ${resposta.status}`,
      };
    }
    if (comKeyword) {
      const corpo = await resposta.text();
      const encontrou = corpo.includes(monitor.keyword ?? "");
      return {
        ok: encontrou,
        latencia_ms: latencia,
        status_code: resposta.status,
        mensagem: encontrou
          ? `Palavra-chave encontrada (${resposta.status})`
          : `Palavra-chave "${monitor.keyword}" não encontrada`,
      };
    }
    return {
      ok: true,
      latencia_ms: latencia,
      status_code: resposta.status,
      mensagem: `OK (${resposta.status})`,
    };
  } catch (erro) {
    return {
      ok: false,
      latencia_ms: Date.now() - inicio,
      status_code: null,
      mensagem: erro instanceof Error ? erro.message : "Falha na requisição",
    };
  }
}

async function checarDns(monitor: Monitor): Promise<CheckResult> {
  const inicio = Date.now();
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      monitor.hostname ?? "",
    )}&type=${monitor.dns_tipo || "A"}`;
    const resposta = await fetch(url, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout((monitor.timeout_segundos || 15) * 1000),
    });
    const dados = (await resposta.json()) as { Answer?: { data: string }[] };
    const latencia = Date.now() - inicio;
    const registros = dados.Answer?.map((a) => a.data) ?? [];
    return {
      ok: registros.length > 0,
      latencia_ms: latencia,
      status_code: null,
      mensagem: registros.length ? `Resolveu para ${registros.join(", ")}` : "Nenhum registro DNS",
    };
  } catch (erro) {
    return {
      ok: false,
      latencia_ms: Date.now() - inicio,
      status_code: null,
      mensagem: erro instanceof Error ? erro.message : "Falha na consulta DNS",
    };
  }
}

async function checarTcp(monitor: Monitor): Promise<CheckResult> {
  const inicio = Date.now();
  const timeout = (monitor.timeout_segundos || 15) * 1000;
  try {
    const net = await import("node:net");
    return await new Promise<CheckResult>((resolve) => {
      const socket = new net.Socket();
      const finalizar = (ok: boolean, mensagem: string) => {
        socket.destroy();
        resolve({ ok, latencia_ms: Date.now() - inicio, status_code: null, mensagem });
      };
      socket.setTimeout(timeout);
      socket.once("connect", () => finalizar(true, `Porta ${monitor.porta} aberta`));
      socket.once("timeout", () => finalizar(false, "Tempo limite de conexão"));
      socket.once("error", (erro: Error) => finalizar(false, erro.message));
      socket.connect(monitor.porta ?? 80, monitor.hostname ?? "");
    });
  } catch (erro) {
    return {
      ok: false,
      latencia_ms: Date.now() - inicio,
      status_code: null,
      mensagem: erro instanceof Error ? erro.message : "Falha na conexão TCP",
    };
  }
}

/** Ping ICMP via nós externos do check-host.net (o runtime de borda não envia ICMP). */
async function checarPing(monitor: Monitor): Promise<CheckResult> {
  const inicio = Date.now();
  const alvo = (monitor.hostname ?? "").trim();
  if (!alvo) {
    return { ok: false, latencia_ms: null, status_code: null, mensagem: "Endereço não informado" };
  }
  try {
    const criar = await fetch(
      `https://check-host.net/check-ping?host=${encodeURIComponent(alvo)}&max_nodes=1`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) },
    );
    const pedido = (await criar.json()) as { request_id?: string; error?: string };
    if (!pedido.request_id) {
      return {
        ok: false,
        latencia_ms: null,
        status_code: null,
        mensagem: pedido.error ?? "Serviço de ping indisponível",
      };
    }

    const limite = Date.now() + Math.min((monitor.timeout_segundos || 15) * 1000, 30000);
    let respostas: unknown[] | null = null;
    while (Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 3000));
      const resultado = await fetch(`https://check-host.net/check-result/${pedido.request_id}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      const dados = (await resultado.json()) as Record<string, unknown[] | null>;
      const primeiro = Object.values(dados)[0];
      if (primeiro) {
        respostas = (primeiro[0] as unknown[]) ?? [];
        break;
      }
    }

    if (!respostas) {
      return {
        ok: false,
        latencia_ms: Date.now() - inicio,
        status_code: null,
        mensagem: "Sem resposta do serviço de ping a tempo",
      };
    }

    const pacotes = respostas as [string, number?][];
    const okCount = pacotes.filter((p) => p?.[0] === "OK").length;
    const tempos = pacotes
      .filter((p) => p?.[0] === "OK" && typeof p[1] === "number")
      .map((p) => (p[1] as number) * 1000);
    const media = tempos.length
      ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
      : null;
    const perda = pacotes.length ? Math.round(((pacotes.length - okCount) / pacotes.length) * 100) : 100;

    return {
      ok: okCount > 0,
      latencia_ms: media,
      status_code: null,
      mensagem: okCount
        ? `Respondeu ${okCount}/${pacotes.length} pacotes${perda ? ` (${perda}% de perda)` : ""}`
        : "Sem resposta ao ping (100% de perda)",
    };
  } catch (erro) {
    return {
      ok: false,
      latencia_ms: Date.now() - inicio,
      status_code: null,
      mensagem: erro instanceof Error ? erro.message : "Falha ao executar ping",
    };
  }
}

function checarHeartbeat(monitor: Monitor): CheckResult {
  const limite = (monitor.intervalo_segundos || 300) * 1000;
  const ultimo = monitor.ultima_verificacao ? new Date(monitor.ultima_verificacao).getTime() : 0;
  const decorrido = Date.now() - ultimo;
  const ok = ultimo > 0 && decorrido <= limite;
  return {
    ok,
    latencia_ms: null,
    status_code: null,
    mensagem: ok
      ? "Sinal recebido dentro do prazo"
      : `Sem sinal há ${Math.round(decorrido / 1000)}s`,
  };
}

export async function executarCheck(monitor: Monitor): Promise<CheckResult> {
  switch (monitor.tipo) {
    case "http":
      return checarHttp(monitor, false);
    case "keyword":
      return checarHttp(monitor, true);
    case "dns":
      return checarDns(monitor);
    case "tcp":
      return checarTcp(monitor);
    case "heartbeat":
      return checarHeartbeat(monitor);
    default:
      return { ok: false, latencia_ms: null, status_code: null, mensagem: "Tipo não suportado" };
  }
}

/** Registra o resultado, aplica anti-flapping, abre/fecha incidentes e dispara webhook. */
export async function registrarResultado(monitor: Monitor, resultado: CheckResult) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const falhas = resultado.ok ? 0 : monitor.falhas_consecutivas + 1;
  const sucessos = resultado.ok ? monitor.sucessos_consecutivos + 1 : 0;
  const limite = Math.max(1, monitor.falhas_para_alerta);

  let novoStatus = monitor.status;
  if (resultado.ok) novoStatus = "ativo";
  else if (falhas >= limite) novoStatus = "fora";
  else if (monitor.status === "pendente") novoStatus = "pendente";

  await supabaseAdmin.from("monitor_checks").insert({
    monitor_id: monitor.id,
    workspace_id: monitor.workspace_id,
    ok: resultado.ok,
    latencia_ms: resultado.latencia_ms,
    status_code: resultado.status_code,
    mensagem: resultado.mensagem,
  });

  await supabaseAdmin
    .from("monitors")
    .update({
      status: novoStatus,
      ultima_latencia_ms: resultado.latencia_ms,
      ultima_mensagem: resultado.mensagem,
      ultima_verificacao: new Date().toISOString(),
      falhas_consecutivas: falhas,
      sucessos_consecutivos: sucessos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", monitor.id);

  const caiu = novoStatus === "fora" && monitor.status !== "fora";
  const voltou = novoStatus === "ativo" && monitor.status === "fora";

  if (caiu) {
    await supabaseAdmin.from("monitor_incidents").insert({
      monitor_id: monitor.id,
      workspace_id: monitor.workspace_id,
      causa: resultado.mensagem,
    });
  }

  if (voltou) {
    const { data: aberto } = await supabaseAdmin
      .from("monitor_incidents")
      .select("id, iniciado_em")
      .eq("monitor_id", monitor.id)
      .is("resolvido_em", null)
      .order("iniciado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aberto) {
      const duracao = Math.round((Date.now() - new Date(aberto.iniciado_em).getTime()) / 1000);
      await supabaseAdmin
        .from("monitor_incidents")
        .update({ resolvido_em: new Date().toISOString(), duracao_segundos: duracao })
        .eq("id", aberto.id);
    }
  }

  if ((caiu || voltou) && monitor.webhook_url) {
    try {
      await fetch(monitor.webhook_url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monitor: monitor.nome,
          status: novoStatus === "fora" ? "fora do ar" : "no ar",
          mensagem: resultado.mensagem,
          latencia_ms: resultado.latencia_ms,
          em: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // webhook opcional: falha não interrompe o monitoramento
    }
  }

  return { status: novoStatus, caiu, voltou };
}
