$exe = 'C:\FodaOS\cauchy-gui\src-tauri\target\release\quantumsim-gui.exe'
$workDir = 'C:\FodaOS\cauchy-gui\src-tauri\target\release'
Start-Process $exe -WorkingDirectory $workDir
Start-Sleep -Seconds 3
$p = Get-Process quantumsim-gui -ErrorAction SilentlyContinue
if ($p) {
    Write-Host "GUI started: PID $($p.Id), Title: $($p.MainWindowTitle)"
} else {
    Write-Host "GUI failed to start"
}
