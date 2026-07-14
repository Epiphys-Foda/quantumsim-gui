Add-Type -AssemblyName System.Drawing
$files = @(
    'C:\FodaOS\cauchy-gui\src-tauri\icons\32x32.png',
    'C:\FodaOS\cauchy-gui\src-tauri\icons\64x64.png',
    'C:\FodaOS\cauchy-gui\src-tauri\icons\128x128.png',
    'C:\FodaOS\cauchy-gui\src-tauri\icons\128x128@2x.png'
)
foreach ($f in $files) {
    if (-not (Test-Path $f)) { Write-Host "$f : NOT FOUND"; continue }
    $img = [System.Drawing.Image]::FromFile($f)
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
    Write-Host "$([System.IO.Path]::GetFileName($f)): $w x $h, opaque: $total, white: $white ($pct%)"
    $img.Dispose(); $bmp.Dispose()
}
