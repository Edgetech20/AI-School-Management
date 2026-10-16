param(
    [string]$Host = "localhost",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Password = "",
    [string]$Database = "attendance_db",
    [string]$BackupDir = "./backups",
    [int]$KeepDays = 14
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$file = Join-Path $BackupDir "$Database-$timestamp.sql"

if ([string]::IsNullOrEmpty($Password)) {
    & mysqldump -h $Host -P $Port -u $User $Database > $file
} else {
    & mysqldump -h $Host -P $Port -u $User "--password=$Password" $Database > $file
}

Get-ChildItem -Path $BackupDir -Filter "$Database-*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    Remove-Item -Force

Write-Host "Backup created: $file"
