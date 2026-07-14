$env:Path = 'C:\Users\11099\.cargo\bin;C:\Users\11099\.trae-cn\binaries\node\versions\24.17.0;' + $env:Path
Set-Location 'C:\FodaOS\cauchy-gui\src-tauri'

# 1. 杀掉 GUI
taskkill /F /IM quantumsim-gui.exe 2>&1 | Out-Null
Start-Sleep -Milliseconds 500

# 2. 清除 quantumsim-gui 构建缓存 (强制 build.rs 重新运行)
Write-Host '=== cargo clean -p quantumsim-gui ==='
cargo clean -p quantumsim-gui 2>&1 | Out-String | Write-Host

# 3. touch build.rs 确保触发
Set-ItemProperty -Path 'build.rs' -Name LastWriteTime -Value (Get-Date)

# 4. 重新构建 (跳过前端, 直接 cargo build)
Write-Host '=== cargo build --release ==='
cargo build --release 2>&1 | Select-String 'Finished|error|warning|Built|resource|icon' | Out-String | Write-Host
Write-Host '=== Exit code:' $LASTEXITCODE '==='

# 5. 验证 exe 时间戳
$exe = Get-Item 'target\release\quantumsim-gui.exe'
Write-Host "exe: $($exe.Length) bytes, $($exe.LastWriteTime)"
