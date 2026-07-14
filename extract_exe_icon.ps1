Add-Type -AssemblyName System.Drawing
$exe = 'C:\FodaOS\cauchy-gui\src-tauri\target\release\quantumsim-gui.exe'
$ico = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
if ($ico -eq $null) { Write-Host 'No icon'; exit 1 }
$bmp = $ico.ToBitmap()
$w = $bmp.Width; $h = $bmp.Height
$white = 0; $total = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        $total++
        if ($p.A -gt 100 -and $p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200) { $white++ }
    }
}
Write-Host "exe icon size: $w x $h"
Write-Host "total pixels: $total, white-ish: $white"
$out = 'C:\FodaOS\cauchy-gui\exe_icon_extracted.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$ico.Dispose(); $bmp.Dispose()
Write-Host "Saved: $out"
