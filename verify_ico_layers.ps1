# 提取 ICO 中 32x32 层的 PNG 数据, 保存为独立 PNG 检查
$icoPath = 'C:\FodaOS\cauchy-gui\src-tauri\icons\icon.ico'
$icoBytes = [System.IO.File]::ReadAllBytes($icoPath)
$count = [BitConverter]::ToUInt16($icoBytes, 4)

Add-Type -AssemblyName System.Drawing

for ($i = 0; $i -lt $count; $i++) {
    $base = 6 + 16 * $i
    $iw = $icoBytes[$base]
    if ($iw -eq 0) { $iw = 256 }
    $ilen = [BitConverter]::ToUInt32($icoBytes, $base + 8)
    $ioff = [BitConverter]::ToUInt32($icoBytes, $base + 12)

    # 提取 PNG 数据
    $pngData = New-Object byte[] $ilen
    [Array]::Copy($icoBytes, $ioff, $pngData, 0, $ilen)

    # 保存为临时 PNG
    $tmpPng = "C:\FodaOS\cauchy-gui\ico_layer_${iw}.png"
    [System.IO.File]::WriteAllBytes($tmpPng, $pngData)

    # 检查像素
    $img = [System.Drawing.Image]::FromFile($tmpPng)
    $bmp = New-Object System.Drawing.Bitmap $img
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
    $pct = if ($total -gt 0) { [math]::Round(100.0 * $white / $total, 1) } else { 0 }
    Write-Host "ICO layer ${iw}x${iw}: actual ${w}x${h}, opaque=$total, white=$white ($pct%)"
    $img.Dispose(); $bmp.Dispose()
}
