Add-Type @"
using System;
using System.Runtime.InteropServices;
public class IconExtract {
    [DllImport("user32.dll", CharSet=CharSet.Auto)]
    public static extern IntPtr PrivateExtractIcons(string lpszFile, int nIconIndex, int cxIcon, int cyIcon, IntPtr[] phicon, int[] piconid, int nIcons, int flags);
    [DllImport("user32.dll")]
    public static extern bool DestroyIcon(IntPtr hIcon);
}
"@
Add-Type -AssemblyName System.Drawing

$exe = 'C:\FodaOS\cauchy-gui\src-tauri\target\release\quantumsim-gui.exe'

# 提取多个尺寸
foreach ($size in @(16, 32, 48, 256)) {
    $phicon = New-Object IntPtr[] 1
    $piconid = New-Object int[] 1
    $result = [IconExtract]::PrivateExtractIcons($exe, 0, $size, $size, $phicon, $piconid, 1, 0x80)
    if ($result -gt 0 -and $phicon[0] -ne [IntPtr]::Zero) {
        $ico = [System.Drawing.Icon]::FromHandle($phicon[0])
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
        $pct = if ($total -gt 0) { [math]::Round(100.0 * $white / $total, 1) } else { 0 }
        Write-Host "Size ${size}: ${w}x${h}, opaque=$total, white=$white ($pct%)"
        # 保存 32x32 用于肉眼检查
        if ($size -eq 32) {
            $bmp.Save("C:\FodaOS\cauchy-gui\exe_icon_${size}.png", [System.Drawing.Imaging.ImageFormat]::Png)
        }
        $ico.Dispose(); $bmp.Dispose()
        [IconExtract]::DestroyIcon($phicon[0]) | Out-Null
    } else {
        Write-Host "Size ${size}: extraction failed (result=$result)"
    }
}
