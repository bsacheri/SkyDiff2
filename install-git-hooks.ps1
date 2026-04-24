param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gitDir = Join-Path $repoRoot ".git"
$hookDir = Join-Path $repoRoot ".githooks"

if (-not (Test-Path $gitDir)) {
  throw "No .git directory was found at $repoRoot."
}

if (-not (Test-Path $hookDir)) {
  throw "No .githooks directory was found at $hookDir."
}

$currentHooksPath = ""
try {
  $currentHooksPath = (git config --local --get core.hooksPath 2>$null).Trim()
} catch {
  $currentHooksPath = ""
}

if ($currentHooksPath -and $currentHooksPath -ne ".githooks" -and -not $Force) {
  throw "Git already uses core.hooksPath '$currentHooksPath'. Re-run with -Force if you want to replace it."
}

git config --local core.hooksPath .githooks
Write-Host "Configured Git hooks path to .githooks"
Write-Host "The pre-commit hook will bump and sync version files before each commit."
