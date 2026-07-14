$env:Path = 'C:\Users\11099\.cargo\bin;C:\Users\11099\.trae-cn\binaries\node\versions\24.17.0;' + $env:Path
Set-Location 'C:\FodaOS\cauchy-gui'

# 1. 重新生成 source_icon.png (加粗 Ψ)
Write-Host '=== 1. Regenerate source_icon.png ==='
node gen_icon.cjs

# 2. 验证 source_icon.png 白色像素
Write-Host '=== 2. Verify source_icon.png ==='
node verify_icon.cjs

# 3. 用 tauri icon 重新生成全套图标
Write-Host '=== 3. Regenerate icon set ==='
npx tauri icon src-tauri/icons/source_icon.png -o src-tauri/icons 2>&1 | Select-String 'Created|icon|Error|Warning'

# 4. 检查 icon.ico 32x32 是否有 Ψ
Write-Host '=== 4. Check icon.ico 32x32 ==='
Add-Type -AssemblyName System.Drawing
$ico = New-Object System.Drawing.Icon 'C:\FodaOS\cauchy-gui\src-tauri\icons\icon.ico'
$bmp = $ico.ToBitmap()
$w = $bmp.Width; $h = $bmp.Height
$white = 0; $total = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -lt 50) { continue }
        $total++
        if ($p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200) { $white++ }
    }
}
Write-Host "icon.ico: $w x $h, opaque: $total, white: $white"
$ico.Dispose(); $bmp.Dispose()
