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

/** Endereço estável do app, usado pelo agente instalado nas máquinas. */
export const URL_PUBLICA_PADRAO = "https://ticontroldg.lovable.app";

export function enderecoPublico() {
  if (typeof window === "undefined") return URL_PUBLICA_PADRAO;
  const origem = window.location.origin;
  // Origens do editor/preview não são acessíveis pelas máquinas monitoradas.
  return /lovableproject\.com|id-preview--|localhost/.test(origem) ? URL_PUBLICA_PADRAO : origem;
}

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
if errorlevel 1 (
  echo Falha ao copiar o agente. Confirme que os dois arquivos estao na mesma pasta.
  pause
  exit /b 1
)

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
echo Testando a comunicacao com o TIControl...
"%NODE%" "%DESTINO%\\ticontrol-agent.cjs" --once
if errorlevel 1 (
  echo.
  echo O agente foi instalado, mas o teste de comunicacao falhou.
  echo Consulte o erro acima ou o arquivo "%DESTINO%\\ticontrol-agent.log".
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$a = New-ScheduledTaskAction -Execute '%NODE%' -Argument '\"%DESTINO%\\ticontrol-agent.cjs\"' -WorkingDirectory '%DESTINO%'; $t = New-ScheduledTaskTrigger -AtStartup; $s = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries; Register-ScheduledTask -TaskName 'TIControl Agent' -Action $a -Trigger $t -Settings $s -User 'SYSTEM' -RunLevel Highest -Force | Out-Null; Start-ScheduledTask -TaskName 'TIControl Agent'"
if errorlevel 1 (
  echo Falha ao criar ou iniciar a tarefa do Windows.
  pause
  exit /b 1
)

echo.
echo Agente TIControl instalado, testado e iniciado.
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
 * Execução: node ticontrol-agent.cjs
 */
const si = require("systeminformation");
const osu = require("node-os-utils");
const fs = require("node:fs");
const path = require("node:path");

const ENDPOINT = ${JSON.stringify(endpoint)};
const TOKEN = ${JSON.stringify(token)};
const INTERVALO_MS = 60000;
const EXECUCAO_UNICA = process.argv.includes("--once");
const ARQUIVO_LOG = path.join(__dirname, "ticontrol-agent.log");

function registrar(...partes) {
  const linha = partes.map((parte) =>
    parte instanceof Error ? parte.stack || parte.message : String(parte)
  ).join(" ");
  const mensagem = "[" + new Date().toISOString() + "] " + linha;
  console.log(mensagem);
  try { fs.appendFileSync(ARQUIVO_LOG, mensagem + "\\n"); } catch {}
}

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
    if (!resposta.ok) {
      registrar("[TIControl] falha:", resposta.status, await resposta.text());
      return false;
    }
    registrar("[TIControl] sinal enviado");
    return true;
  } catch (erro) {
    registrar("[TIControl] erro ao enviar:", erro);
    return false;
  }
}

if (EXECUCAO_UNICA) {
  enviar().then((ok) => process.exit(ok ? 0 : 1));
} else {
  enviar();
  setInterval(enviar, INTERVALO_MS);
}
`;
}
