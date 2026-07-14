Add-Type -AssemblyName System.Drawing
$png = 'C:\FodaOS\cauchy-gui\exe_icon_extracted.png'
$bmp = [System.Drawing.Bitmap]::FromFile($png)
$w = $bmp.Width; $h = $bmp.Height
$colors = @{}
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -lt 50) { continue }
        $key = "$($p.R),$($p.G),$($p.B)"
        if ($colors.ContainsKey($key)) { $colors[$key]++ } else { $colors[$key] = 1 }
    }
}
Write-Host "size: $w x $h"
Write-Host "unique colors: $($colors.Count)"
$top = $colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10
foreach ($e in $top) {
    Write-Host "  $($e.Key): $($e.Value)"
}
$bmp.Dispose()
