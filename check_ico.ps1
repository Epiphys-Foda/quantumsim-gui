Add-Type -AssemblyName System.Drawing
$icoPath = 'C:\FodaOS\cauchy-gui\src-tauri\icons\icon.ico'
$ico = New-Object System.Drawing.Icon $icoPath
$bmp = $ico.ToBitmap()
$w = $bmp.Width; $h = $bmp.Height
$white = 0; $purple = 0; $total = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -lt 50) { continue }
        $total++
        if ($p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200) { $white++ }
        if ($p.R -lt 100 -and $p.G -lt 100 -and $p.B -gt 100) { $purple++ }
    }
}
Write-Host "icon.ico: $w x $h"
Write-Host "total opaque: $total, white: $white, purple-ish: $purple"
$ico.Dispose(); $bmp.Dispose()

# Also check icon.png (Tauri also embeds this)
$png = [System.Drawing.Image]::FromFile('C:\FodaOS\cauchy-gui\src-tauri\icons\icon.png')
$bmp2 = New-Object System.Drawing.Bitmap $png
$w2 = $bmp2.Width; $h2 = $bmp2.Height
$white2 = 0; $total2 = 0
for ($y = 0; $y -lt $h2; $y++) {
    for ($x = 0; $x -lt $w2; $x++) {
        $p = $bmp2.GetPixel($x, $y)
        if ($p.A -lt 50) { continue }
        $total2++
        if ($p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200) { $white2++ }
    }
}
Write-Host "icon.png: $w2 x $h2"
Write-Host "total opaque: $total2, white: $white2"
$png.Dispose(); $bmp2.Dispose()
