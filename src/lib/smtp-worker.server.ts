// Minimal SMTP client over Cloudflare TCP sockets (STARTTLS / implicit TLS).
// nodemailer's TLS upgrade fails on the edge runtime ("TLS Handshake Failed"),
// so on the Worker we speak SMTP directly through `cloudflare:sockets`.

type Opcoes = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export function rodandoNoWorker() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

function b64(valor: string) {
  const bytes = new TextEncoder().encode(valor);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function enderecoDe(valor: string) {
  const m = valor.match(/<([^>]+)>/);
  return (m?.[1] ?? valor).trim();
}

function quebrar(b64txt: string) {
  return b64txt.replace(/.{1,76}/g, "$&\r\n");
}

export async function enviarViaSocket(o: Opcoes) {
  const modulo = "cloudflare:sockets";
  const { connect } = (await import(/* @vite-ignore */ modulo)) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connect: (addr: { hostname: string; port: number }, opts: any) => any;
  };
  const implicito = o.port === 465;
  let socket = connect(
    { hostname: o.host, port: o.port },
    { secureTransport: implicito ? "on" : "starttls", allowHalfOpen: false },
  );

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();
  let buffer = "";

  async function ler(): Promise<{ codigo: number; texto: string }> {
    for (;;) {
      const linhas = buffer.split("\r\n");
      for (let i = 0; i < linhas.length - 1; i++) {
        const l = linhas[i] ?? "";
        if (/^\d{3} /.test(l)) {
          const texto = linhas.slice(0, i + 1).join("\n");
          buffer = linhas.slice(i + 1).join("\r\n");
          return { codigo: Number(l.slice(0, 3)), texto };
        }
      }
      const { value, done } = await reader.read();
      if (done) throw new Error(`Conexão SMTP encerrada: ${buffer}`);
      buffer += dec.decode(value, { stream: true });
    }
  }

  async function cmd(linha: string, esperado: number[], rotulo = linha) {
    await writer.write(enc.encode(linha + "\r\n"));
    const r = await ler();
    if (!esperado.includes(r.codigo)) throw new Error(`SMTP ${rotulo.split(" ")[0]}: ${r.texto}`);
    return r;
  }

  try {
    const saudacao = await ler();
    if (saudacao.codigo !== 220) throw new Error(`SMTP: ${saudacao.texto}`);
    await cmd("EHLO ticontrol.app", [250]);

    if (!implicito) {
      await cmd("STARTTLS", [220]);
      reader.releaseLock();
      writer.releaseLock();
      socket = socket.startTls();
      reader = socket.readable.getReader();
      writer = socket.writable.getWriter();
      buffer = "";
      await cmd("EHLO ticontrol.app", [250]);
    }

    await cmd("AUTH LOGIN", [334]);
    await cmd(b64(o.user), [334], "AUTH user");
    await cmd(b64(o.pass), [235], "AUTH senha");

    await cmd(`MAIL FROM:<${enderecoDe(o.from)}>`, [250]);
    for (const dest of o.to) await cmd(`RCPT TO:<${enderecoDe(dest)}>`, [250, 251]);
    await cmd("DATA", [354]);

    const fronteira = `tic_${crypto.randomUUID()}`;
    const mensagem = [
      `From: ${o.from}`,
      `To: ${o.to.join(", ")}`,
      `Subject: =?UTF-8?B?${b64(o.subject)}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${enderecoDe(o.from).split("@")[1] ?? "ticontrol.app"}>`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${fronteira}"`,
      "",
      `--${fronteira}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      quebrar(b64(o.text)),
      `--${fronteira}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      quebrar(b64(o.html)),
      `--${fronteira}--`,
      "",
      ".",
    ].join("\r\n");
    await cmd(mensagem, [250], "DATA corpo");
    await writer.write(enc.encode("QUIT\r\n")).catch(() => {});
  } finally {
    try {
      await socket.close();
    } catch {
      /* ignore */
    }
  }
}
