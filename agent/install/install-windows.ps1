# Instala o agente TIControl como tarefa agendada (inicialização + cada minuto).
# Execute como administrador na pasta do agente.

$pasta = (Get-Location).Path
$script = Join-Path $pasta "ticontrol-agent.cjs"
$node = (Get-Command node).Source

if (-not (Test-Path $script)) {
  Write-Error "ticontrol-agent.cjs não encontrado nesta pasta."
  exit 1
}

$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$script`" --once" -WorkingDirectory $pasta
$inicializacao = New-ScheduledTaskTrigger -AtStartup
$recorrente = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName "TIControl Agent" -Action $acao -Trigger @($inicializacao, $recorrente) -Settings $config -User "SYSTEM" -RunLevel Highest -Force

Start-ScheduledTask -TaskName "TIControl Agent"
Start-Sleep -Seconds 5
$tarefa = Get-ScheduledTask -TaskName "TIControl Agent"
$info = Get-ScheduledTaskInfo -TaskName "TIControl Agent"
if ($tarefa.State -eq "Disabled") {
  Write-Error "A tarefa foi criada, mas está desativada."
  exit 1
}
Write-Host "Agente TIControl instalado. Estado: $($tarefa.State). Próxima execução: $($info.NextRunTime)."
