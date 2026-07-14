# 彻底清除 Windows 图标缓存
Write-Host '=== Stopping explorer ==='
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host '=== Deleting icon cache ==='
$cacheFiles = @(
    "$env:LOCALAPPDATA\IconCache.db",
    "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache_*.db"
)
foreach ($f in $cacheFiles) {
    Get-ChildItem $f -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        Write-Host "Deleted: $($_.Name)"
    }
}

Write-Host '=== Restarting explorer ==='
Start-Process explorer
Start-Sleep -Seconds 2

Write-Host '=== Icon cache cleared ==='
Write-Host 'Check the exe icon now - it should show Psi symbol'
