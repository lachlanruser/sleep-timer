# Generates the app icons (PNG) with System.Drawing - no downloads or design tools needed.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Hex($h) { [System.Drawing.ColorTranslator]::FromHtml($h) }

function Make-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Full-bleed cocoa background (iOS adds its own rounded corners; no transparency).
  $g.Clear((Hex '#241812'))

  # Soft warm halo behind the circle.
  $c = $size / 2.0
  $halo = New-Object System.Drawing.Drawing2D.GraphicsPath
  $hr = $size * 0.42
  $halo.AddEllipse($c - $hr, $c - $hr, 2 * $hr, 2 * $hr)
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $halo
  $pgb.CenterColor = [System.Drawing.Color]::FromArgb(70, 214, 160, 92)
  $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 36, 24, 18))
  $g.FillPath($pgb, $halo)

  # The pie: radius 0.30 keeps it inside the maskable safe zone (0.40).
  $r = $size * 0.30
  $rect = New-Object System.Drawing.RectangleF ([single]($c - $r)), ([single]($c - $r)), ([single](2 * $r)), ([single](2 * $r))
  $honey = New-Object System.Drawing.SolidBrush (Hex '#b98a54')
  $taupe = New-Object System.Drawing.SolidBrush (Hex '#4a372c')
  # GDI+ angles: 0 = 3 o'clock, clockwise. Three quarters done (joined), one to go.
  $g.FillPie($honey, $rect.X, $rect.Y, $rect.Width, $rect.Height, -90, 270)
  $g.FillPie($taupe, $rect.X, $rect.Y, $rect.Width, $rect.Height, 180, 90)

  # Dividers only around the unfinished quarter.
  $pen = New-Object System.Drawing.Pen (Hex '#241812'), ([single]([Math]::Max(2, $size * 0.012)))
  $g.DrawLine($pen, [single]$c, [single]$c, [single]($c - $r - 1), [single]$c)
  $g.DrawLine($pen, [single]$c, [single]$c, [single]$c, [single]($c - $r - 1))

  $path = Join-Path $outDir $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "wrote $path"
}

Make-Icon 180 'apple-touch-icon.png'
Make-Icon 192 'icon-192.png'
Make-Icon 512 'icon-512.png'
Make-Icon 32 'favicon-32.png'
