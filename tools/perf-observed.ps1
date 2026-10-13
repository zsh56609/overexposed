param([Parameter(Mandatory=$true)][string]$Name,[string]$SourceRoot='.',[string]$Browsers='chrome,firefox,webkit',[string]$Cases='',[string]$PaintProbe='',[string]$Rates='',[switch]$Profile)
$ErrorActionPreference='Stop'
# Read-only power observation. This never requests wakefulness or changes settings.
$filter=@{LogName='System';ProviderName='Microsoft-Windows-Kernel-Power';Id=42,88,506,507}
$initial=Get-WinEvent -FilterHashtable $filter -MaxEvents 1
$started=Get-Date
$arguments=@('tools/motion-active-perf.ts',"--name=$Name","--root=$SourceRoot","--browsers=$Browsers")
if($Cases){$arguments+="--case=$Cases"}
if($PaintProbe){$arguments+="--paint-probe=$PaintProbe"}
if($Rates){$arguments+="--rates=$Rates"}
if($Profile){$arguments+='--profile'}
$auditExitCode=1
try {
  & node @arguments
  $auditExitCode=$LASTEXITCODE
} finally {
  $finished=Get-Date
  $events=@(Get-WinEvent -FilterHashtable $filter -MaxEvents 100 | Where-Object {$_.TimeCreated -ge $started -and $_.TimeCreated -le $finished})
  $record=[ordered]@{
    startedAt=$started.ToUniversalTime().ToString('o')
    finishedAt=$finished.ToUniversalTime().ToString('o')
    sourceRoot=$SourceRoot
    initialEvent=@{id=$initial.Id;at=$initial.TimeCreated.ToUniversalTime().ToString('o')}
    events=@($events | ForEach-Object {@{id=$_.Id;at=$_.TimeCreated.ToUniversalTime().ToString('o')}})
    continuouslyAwake=($initial.Id -eq 507 -and @($events | Where-Object {$_.Id -in 42,88,506}).Count -eq 0)
    exitCode=$auditExitCode
    wakeRequestUsed=$false
  }
  $record | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 "docs/handoff/v1b-compare/$Name-power.json"
  Write-Output ('Power observation: '+($record | ConvertTo-Json -Depth 6 -Compress))
}
exit $auditExitCode
