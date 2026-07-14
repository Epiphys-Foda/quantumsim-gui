Add-Type -AssemblyName System.Drawing,System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bmp.Size)
$out = 'C:\FodaOS\cauchy-gui\gui_after_rebuild.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$gfx.Dispose(); $bmp.Dispose()
Write-Host "Saved: $out ($($screen.Width)x$($screen.Height))"
