$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $root 'assets\installerSidebar.bmp'
$width = 164
$height = 314

$bitmap = New-Object Drawing.Bitmap($width, $height, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias

$bounds = New-Object Drawing.Rectangle(0, 0, $width, $height)
$background = New-Object Drawing.Drawing2D.LinearGradientBrush(
  $bounds,
  [Drawing.Color]::FromArgb(20, 24, 23),
  [Drawing.Color]::FromArgb(44, 57, 51),
  45
)
$graphics.FillRectangle($background, $bounds)
$background.Dispose()

$accentBounds = New-Object Drawing.Rectangle(0, 0, $width, 118)
$accent = New-Object Drawing.Drawing2D.LinearGradientBrush(
  $accentBounds,
  [Drawing.Color]::FromArgb(88, 199, 178),
  [Drawing.Color]::FromArgb(199, 122, 45),
  35
)
$graphics.FillRectangle($accent, $accentBounds)
$accent.Dispose()

$overlay = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(145, 16, 23, 22))
$graphics.FillRectangle($overlay, 0, 76, $width, 238)
$overlay.Dispose()

$linePen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(90, 244, 240, 232), 1)
for ($i = 0; $i -lt 7; $i += 1) {
  $y = 132 + ($i * 22)
  $graphics.DrawLine($linePen, 18, $y, 145, $y + 42)
}
$linePen.Dispose()

$tileBounds = New-Object Drawing.Rectangle(22, 30, 58, 58)
$tile = New-Object Drawing.Drawing2D.LinearGradientBrush(
  $tileBounds,
  [Drawing.Color]::FromArgb(244, 240, 232),
  [Drawing.Color]::FromArgb(88, 199, 178),
  45
)
$graphics.FillRectangle($tile, $tileBounds)
$tile.Dispose()

$fontLogo = New-Object Drawing.Font('Segoe UI', 24, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$fontTitle = New-Object Drawing.Font('Segoe UI', 15, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$fontSmall = New-Object Drawing.Font('Segoe UI', 10, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$white = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(244, 240, 232))
$muted = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(198, 190, 178))

$graphics.DrawString('M', $fontLogo, $white, 39, 43)
$graphics.DrawString('Markdown', $fontTitle, $white, 18, 156)
$graphics.DrawString('Workspace', $fontTitle, $white, 18, 176)
$graphics.DrawString('Notes and', $fontSmall, $muted, 18, 207)
$graphics.DrawString('Markdown files', $fontSmall, $muted, 18, 222)

$dot = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(88, 199, 178))
$graphics.FillEllipse($dot, 18, 268, 8, 8)
$graphics.FillEllipse($dot, 35, 268, 8, 8)
$graphics.FillEllipse($dot, 52, 268, 8, 8)
$dot.Dispose()

$white.Dispose()
$muted.Dispose()
$fontLogo.Dispose()
$fontTitle.Dispose()
$fontSmall.Dispose()

$bitmap.Save($outputPath, [Drawing.Imaging.ImageFormat]::Bmp)
$graphics.Dispose()
$bitmap.Dispose()
