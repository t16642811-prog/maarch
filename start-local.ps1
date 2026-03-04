param(
    [string]$HostName = "localhost",
    [int]$Port = 8080,
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$CleanNodeModules
)

$ErrorActionPreference = "Stop"

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host "==> $Name" -ForegroundColor Cyan
    & $Action
}

Set-Location $PSScriptRoot

if ($CleanNodeModules -and (Test-Path "node_modules")) {
    Run-Step "Suppression de node_modules" {
        cmd /c rmdir /s /q node_modules
    }
}

if (-not $SkipInstall) {
    Run-Step "Installation des dependances npm (Cypress desactive)" {
        $env:CYPRESS_INSTALL_BINARY = "0"
        npm config set legacy-peer-deps true
        npm ci
    }
}

if (-not $SkipBuild) {
    Run-Step "Build Angular" {
        npm run build
    }
}

if (-not (Test-Path "dist/index.html")) {
    throw "dist/index.html introuvable. Lance le build avant de demarrer PHP."
}

Run-Step "Demarrage du serveur PHP sur http://$HostName`:$Port" {
    php -S "$HostName`:$Port" -t . router.php
}
