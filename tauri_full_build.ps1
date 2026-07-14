$env:Path = 'C:\Users\11099\.cargo\bin;C:\Users\11099\.trae-cn\binaries\node\versions\24.17.0;' + $env:Path
Set-Location 'C:\FodaOS\cauchy-gui'

# 1. 杀掉 GUI
taskkill /F /IM quantumsim-gui.exe 2>&1 | Out-Null
Start-Sleep -Milliseconds 500

# 2. 清除 cargo 缓存 (在 src-tauri 目录)
Write-Host '=== cargo clean ==='
Set-Location 'C:\FodaOS\cauchy-gui\src-tauri'
cargo clean -p quantumsim-gui 2>&1 | Out-String | Write-Host

# 3. 用 tauri build 完整构建 (前端+后端+图标, 跳过安装包打包)
Write-Host '=== npm run tauri build -- --no-bundle ==='
Set-Location 'C:\FodaOS\cauchy-gui'
npm run tauri build -- --no-bundle 2>&1 | Out-String | Write-Host
Write-Host '=== Exit code:' $LASTEXITCODE '==='

# 4. 验证 exe
$exe = Get-Item 'src-tauri\target\release\quantumsim-gui.exe'
Write-Host "exe: $($exe.Length) bytes, $($exe.LastWriteTime)"

# 5. 拷贝 DLL + 启动
Copy-Item 'C:\FodaOS\QuantumSim\target\release\quantum_sim.dll' 'src-tauri\target\release\quantum_sim.dll' -Force
Start-Process 'src-tauri\target\release\quantumsim-gui.exe' -WorkingDirectory 'src-tauri\target\release'
Start-Sleep 3
$p = Get-Process quantumsim-gui -ErrorAction SilentlyContinue
if ($p) { Write-Host "GUI started: PID $($p.Id), Title: $($p.MainWindowTitle)" } else { Write-Host "GUI failed" }
