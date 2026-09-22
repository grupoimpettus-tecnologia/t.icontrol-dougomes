/** Utilitários compartilhados do agente de status dos equipamentos. */

export const JANELA_OFFLINE_MS = 3 * 60 * 1000;

export type AgentStatus = "online" | "offline" | "manutencao" | "sem_agente";

export const agentStatusLabels: Record<AgentStatus, string> = {
  online: "Online",
  offline: "Offline",
  manutencao: "Em manutenção",
  sem_agente: "Sem agente",
};

export function situacaoAgente(item: {
  manutencao?: boolean | null;
  agent_token_hash?: string | null;
  ultimo_heartbeat?: string | null;
}): AgentStatus {
  if (item.manutencao) return "manutencao";
  if (!item.agent_token_hash) return "sem_agente";
  if (!item.ultimo_heartbeat) return "offline";
  return Date.now() - new Date(item.ultimo_heartbeat).getTime() <= JANELA_OFFLINE_MS
    ? "online"
    : "offline";
}

export const tiposEquipamento = [
  "Servidor",
  "Desktop",
  "Notebook",
  "Switch",
  "Roteador",
  "Firewall",
  "Impressora",
  "Access Point",
];

/** Instalador Windows: instala dependências, cria tarefa na inicialização e inicia o agente. */
export function gerarInstaladorWindows(nomeArquivo: string) {
  return `@echo off
setlocal
title Instalador do Agente TIControl

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js 18 ou superior em https://nodejs.org e execute novamente.
  pause
  exit /b 1
)

set "DESTINO=%ProgramData%\\TIControl\\agente"
if not exist "%DESTINO%" mkdir "%DESTINO%"
copy /Y "%~dp0${nomeArquivo}" "%DESTINO%\\ticontrol-agent.cjs" >nul

pushd "%DESTINO%"
echo Instalando dependencias...
call npm install --no-audit --no-fund --silent systeminformation node-os-utils
if errorlevel 1 (
  echo Falha ao instalar as dependencias.
  popd
  pause
  exit /b 1
)
popd

for /f "delims=" %%N in ('where node') do set "NODE=%%N"
schtasks /Create /TN "TIControl Agent" /TR "\\"%NODE%\\" \\"%DESTINO%\\ticontrol-agent.cjs\\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F >nul
schtasks /Run /TN "TIControl Agent" >nul

echo.
echo Agente TIControl instalado e iniciado.
pause
`;
}

/** Script do agente já configurado com o token do equipamento. */
export function gerarScriptAgente(token: string, endpoint: string, nome: string) {
  return `#!/usr/bin/env node
/**
 * Agente de status do TIControl — ${nome}
 * Envia um sinal a cada 60 segundos com os dados da máquina.
 *
 * Requisitos: Node.js 18+ e as dependências:
 *   npm install systeminformation node-os-utils
 *
 * Execução: node ticontrol-agent.js
 */
const si = require("systeminformation");
const osu = require("node-os-utils");

const ENDPOINT = ${JSON.stringify(endpoint)};
const TOKEN = ${JSON.stringify(token)};
const INTERVALO_MS = 60000;

async function coletar() {
  const [os, cpu, mem, fs, net, tempo] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.mem(),
    si.fsSize(),
    si.networkInterfaces(),
    si.time(),
  ]);
  const principal = (Array.isArray(net) ? net : [net]).find((i) => !i.internal && i.ip4) || {};
  const disco = (fs || [])[0] || {};
  const usoCpu = await osu.cpu.usage().catch(() => null);

  return {
    hostname: os.hostname,
    sistema_operacional: \`\${os.distro} \${os.release}\`.trim(),
    cpu: \`\${cpu.manufacturer} \${cpu.brand}\`.trim(),
    memoria: \`\${Math.round(mem.total / 1024 / 1024 / 1024)} GB\`,
    disco: disco.size ? \`\${Math.round(disco.size / 1024 / 1024 / 1024)} GB\` : null,
    ip: principal.ip4 || null,
    mac: principal.mac || null,
    metricas: {
      cpu_percent: usoCpu,
      memoria_percent: mem.total ? Math.round((mem.active / mem.total) * 100) : null,
      disco_percent: disco.use != null ? Math.round(disco.use) : null,
      uptime_segundos: tempo.uptime,
    },
  };
}

async function enviar() {
  try {
    const corpo = await coletar();
    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
      body: JSON.stringify(corpo),
    });
    if (!resposta.ok) console.error("[TIControl] falha:", resposta.status, await resposta.text());
    else console.log("[TIControl] sinal enviado", new Date().toISOString());
  } catch (erro) {
    console.error("[TIControl] erro ao enviar:", erro.message);
  }
}

enviar();
setInterval(enviar, INTERVALO_MS);
`;
}
