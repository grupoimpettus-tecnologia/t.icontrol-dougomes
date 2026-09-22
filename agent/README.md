# Agente de status — TIControl

O agente roda na máquina monitorada e envia um sinal (heartbeat) a cada 60 segundos para o
TIControl, com hostname, sistema operacional, CPU, memória, disco, IP e MAC.

## 1. Gerar o token

No TIControl, abra **Infraestrutura > Equipamentos**, clique no ícone de radar do equipamento e
use **Gerar token**. Copie o token (ele aparece só uma vez) e clique em **Baixar agente** —
o arquivo já vem com o token e o endereço configurados.

## 2. Instalar

Requisitos: Node.js 18 ou superior.

```bash
mkdir -p /opt/ticontrol-agent && cd /opt/ticontrol-agent
# copie ticontrol-agent.js (baixado no TIControl) e package.json para esta pasta
npm install
node ticontrol-agent.js   # teste manual
```

## 3. Manter rodando

### Linux (systemd)

Copie `install/ticontrol-agent.service` para `/etc/systemd/system/` e execute:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ticontrol-agent
sudo systemctl status ticontrol-agent
```

### Windows (Task Scheduler)

Execute o PowerShell como administrador na pasta do agente:

```powershell
.\install\install-windows.ps1
```

### macOS (launchd)

```bash
cp install/com.ticontrol.agent.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ticontrol.agent.plist
```

## Status no painel

- **Online**: sinal recebido nos últimos 3 minutos.
- **Offline**: sem sinal há mais de 3 minutos.
- **Em manutenção**: marcado manualmente no painel (não muda com os sinais).
- **Sem agente**: nenhum token gerado para o equipamento.

## Renovar ou revogar o token

Gere um novo token no painel: o token anterior deixa de funcionar imediatamente. Baixe o agente
novamente e substitua o arquivo na máquina.
