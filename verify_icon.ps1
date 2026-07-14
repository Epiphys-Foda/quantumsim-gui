Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\FodaOS\cauchy-gui\src-tauri\icons\source_icon.png')
$bmp = New-Object System.Drawing.Bitmap($img)
$w = $bmp.Width
$h = $bmp.Height
$white = 0
$total = 0
for ($y = 0; $y -lt $h; $y += 4) {
    for ($x = 0; $x -lt $w; $x += 4) {
        $p = $bmp.GetPixel($x, $y)
        $total++
        if ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240) { $white++ }
    }
}
Write-Host "size: $w x $h"
Write-Host "sampled: $total, white: $white"
$img.Dispose()
