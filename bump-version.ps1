param(
  [ValidateSet("patch", "minor", "major", "sync")]
  [string]$Part = "patch",
  [string]$Version,
  [switch]$SkipTimestamp,
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packagePath = Join-Path $repoRoot "package.json"
$forecastCorePath = Join-Path $repoRoot "shared\forecast-core.js"
$versionJsonPath = Join-Path $repoRoot "version.json"
$serviceWorkerPath = Join-Path $repoRoot "sw.js"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8File {
  param(
    [string]$Path,
    [string]$Content
  )

  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Assert-SemVer {
  param([string]$Value)

  if (-not $Value -or $Value -notmatch '^\d+\.\d+\.\d+$') {
    throw "Expected a semantic version like 1.2.3 but received '$Value'."
  }
}

function Increment-Version {
  param(
    [string]$BaseVersion,
    [string]$VersionPart
  )

  Assert-SemVer $BaseVersion
  $segments = $BaseVersion.Split(".")
  $major = [int]$segments[0]
  $minor = [int]$segments[1]
  $patch = [int]$segments[2]

  switch ($VersionPart) {
    "major" {
      $major += 1
      $minor = 0
      $patch = 0
    }
    "minor" {
      $minor += 1
      $patch = 0
    }
    "patch" {
      $patch += 1
    }
    "sync" { }
    default {
      throw "Unsupported version part '$VersionPart'."
    }
  }

  return "$major.$minor.$patch"
}

$packageRaw = Get-Content -Raw $packagePath
$forecastCoreRaw = Get-Content -Raw $forecastCorePath

$packageVersionMatch = [regex]::Match($packageRaw, '"version"\s*:\s*"([^"]+)"')
$appVersionMatch = [regex]::Match($forecastCoreRaw, 'export const APP_VERSION = "([^"]+)"')

if (-not $packageVersionMatch.Success) {
  throw "Unable to find the package.json version field."
}

if (-not $appVersionMatch.Success) {
  throw "Unable to find APP_VERSION in shared/forecast-core.js."
}

$currentVersion = $appVersionMatch.Groups[1].Value
Assert-SemVer $currentVersion
Assert-SemVer $packageVersionMatch.Groups[1].Value

if ($CheckOnly) {
  $versionJsonRaw = if (Test-Path $versionJsonPath) { Get-Content -Raw $versionJsonPath } else { "{}" }
  $versionMeta = $versionJsonRaw | ConvertFrom-Json
  $swRaw = if (Test-Path $serviceWorkerPath) { Get-Content -Raw $serviceWorkerPath } else { "" }
  $failures = @()

  if ($packageVersionMatch.Groups[1].Value -ne $currentVersion) {
    $failures += "package.json version does not match shared/forecast-core.js APP_VERSION"
  }
  if ($versionMeta.version -ne $currentVersion) {
    $failures += "version.json version does not match shared/forecast-core.js APP_VERSION"
  }
  if ($swRaw -and $swRaw -notmatch [regex]::Escape('skydiff2-static-${APP_VERSION}')) {
    $failures += "sw.js static cache name does not derive from APP_VERSION"
  }
  if ($swRaw -and $swRaw -notmatch [regex]::Escape('skydiff2-data-${APP_VERSION}')) {
    $failures += "sw.js data cache name does not derive from APP_VERSION"
  }

  if ($failures.Count -gt 0) {
    throw "Version metadata is out of sync:`n - $($failures -join "`n - ")"
  }

  Write-Host "Version metadata is in sync."
  exit 0
}

$targetVersion = if ($Version) {
  Assert-SemVer $Version
  $Version
} else {
  Increment-Version -BaseVersion $currentVersion -VersionPart $Part
}

$timestamp = (Get-Date).ToUniversalTime().ToString("o")
$existingVersionMeta = $null
if (Test-Path $versionJsonPath) {
  $existingVersionMeta = Get-Content -Raw $versionJsonPath | ConvertFrom-Json
}

$updatedAtUtc = if ($SkipTimestamp -and $existingVersionMeta -and $existingVersionMeta.updatedAtUtc) {
  [string]$existingVersionMeta.updatedAtUtc
} else {
  $timestamp
}

$packageUpdated = [regex]::Replace(
  $packageRaw,
  '"version"\s*:\s*"[^"]+"',
  "`"version`": `"$targetVersion`"",
  1
)

$forecastCoreUpdated = [regex]::Replace(
  $forecastCoreRaw,
  'export const APP_VERSION = "[^"]+";',
  "export const APP_VERSION = `"$targetVersion`";",
  1
)

$versionMeta = [ordered]@{
  version = $targetVersion
  updatedAtUtc = $updatedAtUtc
  source = "bump-version.ps1"
}

$versionJsonUpdated = ($versionMeta | ConvertTo-Json) + [Environment]::NewLine

Write-Utf8File -Path $packagePath -Content $packageUpdated
Write-Utf8File -Path $forecastCorePath -Content $forecastCoreUpdated
Write-Utf8File -Path $versionJsonPath -Content $versionJsonUpdated

Write-Host "Version synced to $targetVersion"
Write-Host "Timestamp: $updatedAtUtc"
