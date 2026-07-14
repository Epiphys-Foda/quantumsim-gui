Add-Type -AssemblyName System.Drawing
$exe = 'C:\FodaOS\cauchy-gui\src-tauri\target\release\quantumsim-gui.exe'

# 用 ExtractAssociatedIcon 提取
$ico = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
$bmp = $ico.ToBitmap()
$w = $bmp.Width; $h = $bmp.Height
$white = 0; $total = 0
$colors = @{}
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -lt 50) { continue }
        $total++
        if ($p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200) { $white++ }
        $key = "$($p.R),$($p.G),$($p.B)"
        if ($colors.ContainsKey($key)) { $colors[$key]++ } else { $colors[$key] = 1 }
    }
}
Write-Host "ExtractAssociatedIcon: $w x $h, opaque=$total, white=$white"
Write-Host "Unique colors: $($colors.Count)"
$top = $colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5
foreach ($e in $top) { Write-Host "  $($e.Key): $($e.Value)" }

# 保存提取的图标
$bmp.Save('C:\FodaOS\cauchy-gui\new_exe_icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$ico.Dispose(); $bmp.Dispose()

# 也检查 exe 时间戳
$fi = Get-Item $exe
Write-Host "exe: $($fi.Length) bytes, $($fi.LastWriteTime)"
