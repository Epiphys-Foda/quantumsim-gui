# 用 Tauri 已生成的高质量 PNG 直接打包 ICO
# 这样 ico 内每个尺寸的层都和独立 PNG 文件像素一致
$ErrorActionPreference = 'Stop'

$iconDir = 'C:\FodaOS\cauchy-gui\src-tauri\icons'

# 用 Tauri 生成的 PNG 文件 (这些已经验证有充足白色像素)
$pngFiles = @(
    @{size=16;  file='32x32.png'},  # 32x32 缩到 16x16 (Tauri 没生成 16x16.png)
    @{size=32;  file='32x32.png'},
    @{size=48;  file='64x64.png'},  # 64x64 缩到 48x48
    @{size=64;  file='64x64.png'},
    @{size=128; file='128x128.png'},
    @{size=256; file='128x128@2x.png'}
)

# 读取 PNG 字节
$pngBytes = @()
foreach ($entry in $pngFiles) {
    $path = Join-Path $iconDir $entry.file
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $pngBytes += ,@{size=$entry.size; bytes=$bytes}
}

# 写 ICO
$outPath = Join-Path $iconDir 'icon.ico'
$fs = [System.IO.File]::Create($outPath)
$bw = New-Object System.IO.BinaryWriter $fs

$bw.Write([uint16]0)                    # reserved
$bw.Write([uint16]1)                    # type = icon
$bw.Write([uint16]$pngBytes.Count)      # image count

$offset = 6 + 16 * $pngBytes.Count
foreach ($entry in $pngBytes) {
    $s = $entry.size
    $bytes = $entry.bytes
    $w = if ($s -eq 256) { [byte]0 } else { [byte]$s }
    $bw.Write([byte]$w)
    $bw.Write([byte]$w)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $bytes.Length
}
foreach ($entry in $pngBytes) {
    $bw.Write($entry.bytes)
}
$bw.Flush(); $bw.Dispose(); $fs.Dispose()

# 验证: 用 IconExtractor 风格读取 ico 中 32x32 层
Add-Type -AssemblyName System.Drawing
$ico = New-Object System.Drawing.Icon $outPath, 32, 32
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
Write-Host "icon.ico 32x32 layer: $w x $h, opaque: $total, white: $white"
$ico.Dispose(); $bmp.Dispose()

# 同时提取 ico 中的 32x32 PNG 数据单独保存验证
$icoBytes = [System.IO.File]::ReadAllBytes($outPath
)
$count = [BitConverter]::ToUInt16($icoBytes, 4)
Write-Host "ICO contains $count images"
for ($i = 0; $i -lt $count; $i++) {
    $base = 6 + 16 * $i
    $iw = $icoBytes[$base]
    if ($iw -eq 0) { $iw = 256 }
    $ilen = [BitConverter]::ToUInt32($icoBytes, $base + 8)
    $ioff = [BitConverter]::ToUInt32($icoBytes, $base + 12)
    Write-Host "  Image $i : ${iw}x${iw}, $ilen bytes at offset $ioff"
}

$fi = Get-Item $outPath
Write-Host "File size: $($fi.Length) bytes"
