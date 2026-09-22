# Agente de status — TIControl

O agente roda na máquina monitorada e envia um sinal (heartbeat) a cada 60 segundos para o
TIControl, com hostname, sistema operacional, CPU, memória, disco, IP e MAC.

## 1. Gerar o token

No TIControl, abra **Infraestrutura > Equipamentos**, clique no ícone de radar do equipamento e
use **Gerar token**. Copie o token (ele aparece só uma vez) e clique em **Baixar agente** —
o arquivo já vem com o token e o endereço configurados.

O download traz dois arquivos: `ticontrol-agent-<patrimônio>.cjs` (o agente) e
`instalar-ticontrol-<patrimônio>.bat` (instalador do Windows).

## 2. Instalar

Requisitos: Node.js 18 ou superior.

### Windows

Deixe os dois arquivos baixados na mesma pasta, clique com o botão direito no `.bat` e escolha
**Executar como administrador**. Ele instala as dependências, copia o agente para
`C:\ProgramData\TIControl\agente`, testa a comunicação, cria a tarefa de inicialização e inicia o
agente. Se o teste falhar, o diagnóstico fica salvo em
`C:\ProgramData\TIControl\agente\ticontrol-agent.log`.

> Nunca abra o arquivo `.cjs` com dois cliques: o Windows tenta executá-lo pelo Windows Script
> Host e mostra o erro "Caractere inválido".

### Linux (systemd)

```bash
sudo mkdir -p /opt/ticontrol-agent && cd /opt/ticontrol-agent
# copie o arquivo .cjs baixado como ticontrol-agent.cjs
sudo npm install systeminformation node-os-utils
node ticontrol-agent.cjs   # teste manual
```

Copie `install/ticontrol-agent.service` para `/etc/systemd/system/` e execute:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ticontrol-agent
sudo systemctl status ticontrol-agent
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
