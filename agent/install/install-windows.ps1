# Instala o agente TIControl como tarefa agendada (executa na inicialização).
# Execute como administrador na pasta do agente.

$pasta = (Get-Location).Path
$script = Join-Path $pasta "ticontrol-agent.js"
$node = (Get-Command node).Source

if (-not (Test-Path $script)) {
  Write-Error "ticontrol-agent.js não encontrado nesta pasta."
  exit 1
}

$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $pasta
$gatilho = New-ScheduledTaskTrigger -AtStartup
$config = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName "TIControl Agent" -Action $acao -Trigger $gatilho -Settings $config -User "SYSTEM" -RunLevel Highest -Force

Start-ScheduledTask -TaskName "TIControl Agent"
Write-Host "Agente TIControl instalado e iniciado."
