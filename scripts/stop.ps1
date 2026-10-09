$ErrorActionPreference = 'Stop'
$loanRoot = Split-Path -Parent $PSScriptRoot
$loanPidFile = Join-Path $loanRoot '.data\server.pid'
$loanExpectedEntry = Join-Path $loanRoot 'server-dist\server\index.js'
if (Test-Path -LiteralPath $loanPidFile) {
  $loanServerPid = [int](Get-Content -LiteralPath $loanPidFile -Raw)
  $loanProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $loanServerPid" -ErrorAction SilentlyContinue
  if ($loanProcess -and $loanProcess.Name -eq 'node.exe' -and $loanProcess.CommandLine.Contains($loanExpectedEntry)) { Stop-Process -Id $loanServerPid }
  Remove-Item -LiteralPath $loanPidFile -Force
}
