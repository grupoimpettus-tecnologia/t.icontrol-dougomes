# Instala o agente TIControl como processo contínuo iniciado junto com o Windows.
# Execute como administrador na pasta do agente.

$pasta = (Get-Location).Path
$script = Join-Path $pasta "ticontrol-agent.cjs"
$node = (Get-Command node).Source

if (-not (Test-Path $script)) {
  Write-Error "ticontrol-agent.cjs não encontrado nesta pasta."
  exit 1
}

$tarefaExistente = Get-ScheduledTask -TaskName "TIControl Agent" -ErrorAction SilentlyContinue
if ($tarefaExistente) {
  Stop-ScheduledTask -TaskName "TIControl Agent" -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName "TIControl Agent" -Confirm:$false
}

$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $pasta
$inicializacao = New-ScheduledTaskTrigger -AtStartup
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName "TIControl Agent" -Action $acao -Trigger $inicializacao -Settings $config -User "SYSTEM" -RunLevel Highest -Force

Start-ScheduledTask -TaskName "TIControl Agent"
Start-Sleep -Seconds 5
$tarefa = Get-ScheduledTask -TaskName "TIControl Agent"
if ($tarefa.State -ne "Running") {
  Write-Error "A tarefa foi criada, mas não permaneceu em execução. Estado: $($tarefa.State)."
  exit 1
}
Write-Host "Agente TIControl instalado e rodando em segundo plano. Estado: $($tarefa.State)."
