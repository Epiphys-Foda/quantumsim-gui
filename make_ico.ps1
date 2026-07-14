# 直接从 PNG 文件打包 ICO (Vista+ 支持 PNG 压缩)
# 这样 ico 内每个尺寸的层都是原始 PNG 数据, 不会经过缩小算法
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$iconDir = 'C:\FodaOS\cauchy-gui\src-tauri\icons'
$sizes = @(16, 24, 32, 48, 64, 128, 256)

# 先生成各尺寸 PNG (从 512x512 source_icon.png 高质量缩小)
$srcPath = Join-Path $iconDir 'source_icon.png'
$src = [System.Drawing.Image]::FromFile($srcPath)
$pngBytes = @{}  # size -> byte[]
foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $bmp.SetResolution(96, 96)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gfx.DrawImage($src, 0, 0, $s, $s)
    $gfx.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes[$s] = $ms.ToArray()
    $ms.Dispose(); $bmp.Dispose()
}
$src.Dispose()

# 写 ICO 文件
# Header: 6 bytes (reserved 2B=0, type 2B=1, count 2B)
# Each directory entry: 16 bytes
# Then PNG data
$outPath = Join-Path $iconDir 'icon.ico'
$fs = [System.IO.File]::Create($outPath)
$bw = New-Object System.IO.BinaryWriter $fs

# Header
$bw.Write([uint16]0)       # reserved
$bw.Write([uint16]1)       # type = icon
$bw.Write([uint16]$sizes.Count)  # image count

# 计算偏移: header(6) + entries(16 * count)
$offset = 6 + 16 * $sizes.Count

# Directory entries
foreach ($s in $sizes) {
    $bytes = $pngBytes[$s]
    $w = if ($s -eq 256) { [byte]0 } else { [byte]$s }
    $h = $w
    $bw.Write([byte]$w)                    # width
    $bw.Write([byte]$h)                    # height
    $bw.Write([byte]0)                     # color count (0 = 256+)
    $bw.Write([byte]0)                     # reserved
    $bw.Write([uint16]1)                   # planes
    $bw.Write([uint16]32)                  # bit count
    $bw.Write([uint32]$bytes.Length)       # bytes in resource
    $bw.Write([uint32]$offset)             # offset
    $offset += $bytes.Length
}

# Image data (PNG bytes)
foreach ($s in $sizes) {
    $bw.Write($pngBytes[$s])
}
$bw.Flush(); $bw.Dispose(); $fs.Dispose()

# 验证生成的 ico
$ico = New-Object System.Drawing.Icon $outPath
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
Write-Host "Generated icon.ico: $w x $h, opaque: $total, white: $white"
$ico.Dispose(); $bmp.Dispose()

$fi = Get-Item $outPath
Write-Host "File size: $($fi.Length) bytes"
