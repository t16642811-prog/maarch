# Maarch backup script for Windows / PowerShell
# Backs up:
# - PostgreSQL database "maarch"
# - Application folder "C:\apps\maarch"
# - Docserver root "C:\Users\ANAM1406\Desktop\2025"

[CmdletBinding()]
param(
    [string]$BackupRoot = "C:\backup\maarch",
    [string]$PostgresBin = "C:\Program Files\PostgreSQL\17\bin",
    [string]$DbHost = "127.0.0.1",
    [string]$DbPort = "5432",
    [string]$DbName = "maarch",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "dev12345",
    [string]$AppPath = "C:\apps\maarch",
    [string]$DocserverPath = "C:\Users\ANAM1406\Desktop\2025",
    [int]$KeepDays = 14
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Assert-Path {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Label introuvable : $Path"
    }
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$targetRoot = Join-Path $BackupRoot $timestamp
$dbTarget = Join-Path $targetRoot "database"
$filesTarget = Join-Path $targetRoot "files"
$logsTarget = Join-Path $targetRoot "logs"

$pgDump = Join-Path $PostgresBin "pg_dump.exe"
$versionFile = Join-Path $targetRoot "backup-info.txt"

Assert-Path -Path $pgDump -Label "pg_dump"
Assert-Path -Path $AppPath -Label "Dossier application"
Assert-Path -Path $DocserverPath -Label "Dossier docserver"

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
New-Item -ItemType Directory -Force -Path $dbTarget | Out-Null
New-Item -ItemType Directory -Force -Path $filesTarget | Out-Null
New-Item -ItemType Directory -Force -Path $logsTarget | Out-Null

$dbBackupFile = Join-Path $dbTarget "$DbName.backup"
$appBackupPath = Join-Path $filesTarget "app"
$docserverBackupPath = Join-Path $filesTarget "docserver"
$robocopyAppLog = Join-Path $logsTarget "robocopy-app.log"
$robocopyDocLog = Join-Path $logsTarget "robocopy-docserver.log"

Write-Step "Export de la base PostgreSQL"
$env:PGPASSWORD = $DbPassword
& $pgDump `
    -h $DbHost `
    -p $DbPort `
    -U $DbUser `
    -d $DbName `
    -F c `
    -f $dbBackupFile

if (-not (Test-Path -LiteralPath $dbBackupFile)) {
    throw "Le dump PostgreSQL n'a pas ete cree : $dbBackupFile"
}

Write-Step "Copie de l'application"
New-Item -ItemType Directory -Force -Path $appBackupPath | Out-Null
$null = robocopy $AppPath $appBackupPath /E /R:1 /W:1 /XD "node_modules" ".git" /NFL /NDL /NP /LOG:$robocopyAppLog
$appRoboCode = $LASTEXITCODE
if ($appRoboCode -ge 8) {
    throw "Robocopy a echoue pour l'application. Code : $appRoboCode"
}

Write-Step "Copie du docserver"
New-Item -ItemType Directory -Force -Path $docserverBackupPath | Out-Null
$null = robocopy $DocserverPath $docserverBackupPath /E /R:1 /W:1 /NFL /NDL /NP /LOG:$robocopyDocLog
$docRoboCode = $LASTEXITCODE
if ($docRoboCode -ge 8) {
    throw "Robocopy a echoue pour le docserver. Code : $docRoboCode"
}

Write-Step "Ecriture du resume"
@(
    "Backup date : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    "Database host : $DbHost"
    "Database port : $DbPort"
    "Database name : $DbName"
    "Application path : $AppPath"
    "Docserver path : $DocserverPath"
    "Backup root : $targetRoot"
) | Set-Content -LiteralPath $versionFile -Encoding UTF8

Write-Step "Nettoyage des sauvegardes de plus de $KeepDays jours"
$limitDate = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -LiteralPath $BackupRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.CreationTime -lt $limitDate } |
    ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }

Write-Host ""
Write-Host "Sauvegarde terminee :" -ForegroundColor Green
Write-Host "  $targetRoot" -ForegroundColor Green
