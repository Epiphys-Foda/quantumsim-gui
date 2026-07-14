$env:Path = 'C:\Users\11099\.cargo\bin;C:\Users\11099\.trae-cn\binaries\node\versions\24.17.0;' + $env:Path
Set-Location 'C:\FodaOS\cauchy-gui'

# Kill any running GUI process
taskkill /F /IM quantumsim-gui.exe 2>$null
Start-Sleep -Milliseconds 500

Write-Host '=== Build Tauri (release) ==='
npm run tauri build 2>&1 | Out-String | Write-Host
Write-Host '=== Exit code:' $LASTEXITCODE '==='
