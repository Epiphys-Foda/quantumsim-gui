$env:Path = 'C:\Users\11099\.cargo\bin;C:\Users\11099\.trae-cn\binaries\node\versions\24.17.0;' + $env:Path
Set-Location 'C:\FodaOS\cauchy-gui'

# 1. 杀掉 GUI
taskkill /F /IM quantumsim-gui.exe 2>&1 | Out-Null
Start-Sleep -Milliseconds 500

# 2. 构建前端 (更新 dist/)
Write-Host '=== npm run build ==='
npm run build 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) { Write-Host 'FRONTEND BUILD FAILED'; exit 1 }

# 3. 清除 cargo 缓存 (确保图标+前端都重新嵌入)
Write-Host '=== cargo clean -p quantumsim-gui ==='
cargo clean -p quantumsim-gui 2>&1 | Out-String | Write-Host

# 4. 构建 Rust (嵌入新 dist/ + 新 icon.ico)
Write-Host '=== cargo build --release ==='
Set-Location 'C:\FodaOS\cauchy-gui\src-tauri'
cargo build --release 2>&1 | Select-String 'Finished|error|warning' | Out-String | Write-Host
Write-Host '=== Exit code:' $LASTEXITCODE '==='

# 5. 拷贝 DLL + 启动
Copy-Item 'C:\FodaOS\QuantumSim\target\release\quantum_sim.dll' 'target\release\quantum_sim.dll' -Force
$exe = Get-Item 'target\release\quantumsim-gui.exe'
Write-Host "exe: $($exe.Length) bytes, $($exe.LastWriteTime)"

Start-Process 'target\release\quantumsim-gui.exe' -WorkingDirectory 'target\release'
Start-Sleep 2
$p = Get-Process quantumsim-gui -ErrorAction SilentlyContinue
if ($p) { Write-Host "GUI started: PID $($p.Id)" } else { Write-Host "GUI failed" }
