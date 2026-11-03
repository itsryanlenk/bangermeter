# Bangermeter — compose clipboard screenshot onto a 1280x800 store canvas
#
# Caption numbers come from extension/weights.js via weights-export.js, never
# typed here — a hardcoded ratio on a store asset outlives the code that made it true.
#
# -Lang ja builds the Japanese listing's screenshot from clip-raw.ja.png. Its
# captions come from screenshot-captions.ja.json: Windows PowerShell 5.1 reads a
# BOM-less .ps1 as ANSI, so no Japanese may appear in this file.
param([ValidateSet("en", "ja")][string]$Lang = "en")
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$W = & node (Join-Path $PSScriptRoot "weights-export.js") | ConvertFrom-Json
if (-not $W -or -not $W.facts) { throw "weights-export.js produced no data - cannot build the screenshot" }

$suffix = if ($Lang -eq "ja") { ".ja" } else { "" }
$bodyFont = "Arial"
$copy = @{
  headline = @("Every post scored with", "X's own open-sourced", "ranking algorithm.")
  points = @("Real published weights.", "Every factor cited to code.", "Zero data collected.")
  chip = $W.facts.shortChipCaption
}
if ($Lang -eq "ja") {
  $ja = Get-Content (Join-Path $PSScriptRoot "screenshot-captions.ja.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $copy = @{ headline = @($ja.headline); points = @($ja.points); chip = $ja.chip }
  # The brand fonts have no Japanese glyphs; use the first installed Japanese UI face.
  $installed = (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }
  $bodyFont = @("Yu Gothic UI", "Meiryo", "MS Gothic") | Where-Object { $installed -contains $_ } | Select-Object -First 1
  if (-not $bodyFont) { throw "no Japanese font installed (Yu Gothic UI, Meiryo or MS Gothic)" }
}

$BLACK  = [System.Drawing.ColorTranslator]::FromHtml("#000000")
$CREAM  = [System.Drawing.ColorTranslator]::FromHtml("#F5F0E6")
$YELLOW = [System.Drawing.ColorTranslator]::FromHtml("#FFEB3B")
$GRAY1  = [System.Drawing.ColorTranslator]::FromHtml("#333333")

function B($c) { New-Object System.Drawing.SolidBrush($c) }

function NeoBox($g, $x, $y, $w, $h, $fillColor, $bw, $shadow) {
  if ($shadow -gt 0) { $g.FillRectangle((B $BLACK), $x + $shadow, $y + $shadow, $w, $h) }
  $g.FillRectangle((B $fillColor), $x, $y, $w, $h)
  $pen = New-Object System.Drawing.Pen($BLACK, $bw)
  $g.DrawRectangle($pen, ($x + $bw/2), ($y + $bw/2), ($w - $bw), ($h - $bw))
  $pen.Dispose()
}

function BoltBox($g, $x, $y, $size, $bw, $shadow) {
  NeoBox $g $x $y $size $size $YELLOW $bw $shadow
  $s = ($size * 0.72) / 24.0
  $ox = $x + ($size - 24*$s) / 2.0
  $oy = $y + ($size - 24*$s) / 2.0
  $pts24 = @(@(13,2),@(4,14),@(10,14),@(9,22),@(18,10),@(12,10))
  $pts = $pts24 | ForEach-Object { New-Object System.Drawing.PointF(($ox + $_[0]*$s), ($oy + $_[1]*$s)) }
  $g.FillPolygon((B $BLACK), $pts)
}

function Txt($g, $text, $fontName, $sizePx, $style, $color, $x, $y) {
  $font = New-Object System.Drawing.Font($fontName, $sizePx, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString($text, $font, (B $color), $x, $y)
  $font.Dispose()
}

$shot = [System.Drawing.Image]::FromFile("D:\Twitter Tweet Scan\store-assets\clip-raw$suffix.png")

$bmp = New-Object System.Drawing.Bitmap(1280, 800, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear($CREAM)

# Left brand column
BoltBox $g 48 60 64 4 6
Txt $g "BANGERMETER" "Arial Black" 30 ([System.Drawing.FontStyle]::Regular) $BLACK 44 152
for ($i = 0; $i -lt 3; $i++) {
  Txt $g $copy.headline[$i] $bodyFont 18 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 (210 + 26 * $i)
}
for ($i = 0; $i -lt 3; $i++) {
  Txt $g $copy.points[$i] $bodyFont 15 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 (330 + 24 * $i)
}

# Caption comes from extension/weights.js (or the Japanese captions file); the
# chip is sized to the measured text so a longer caption can never overflow the box.
$capFont = New-Object System.Drawing.Font($bodyFont, 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$capW = [int]$g.MeasureString($copy.chip, $capFont).Width
$capFont.Dispose()
$CHIP_X = 48; $CHIP_SHADOW = 5
$chipW = $capW + 36
NeoBox $g $CHIP_X 690 $chipW 42 $YELLOW 3 $CHIP_SHADOW
Txt $g $copy.chip $bodyFont 19 ([System.Drawing.FontStyle]::Bold) $BLACK 66 700

# ── Place the capture so it can never collide with the left column ──────────
# Both the chip and the capture grow with their content (caption length, crop
# size), so a fixed x would eventually overlap — and did. Derive the boundary
# from what the left column actually occupies, including the chip's hard shadow,
# then scale the capture down if it cannot fit at native size.
$GUTTER = 36; $RIGHT_MARGIN = 28; $FRAME_SHADOW = 10
$leftEdge = [Math]::Max(370, $CHIP_X + $chipW + $CHIP_SHADOW) + $GUTTER
$availW = 1280 - $leftEdge - $RIGHT_MARGIN - $FRAME_SHADOW
$availH = 800 - 40 - $FRAME_SHADOW

$scale = [Math]::Min(1.0, [Math]::Min($availW / $shot.Width, $availH / $shot.Height))
$shotW = [int]($shot.Width * $scale)
$shotH = [int]($shot.Height * $scale)
$sx = [int]($leftEdge + ($availW - $shotW) / 2)
$sy = [int]((800 - $shotH) / 2)

if ($sx -lt ($CHIP_X + $chipW + $CHIP_SHADOW)) { throw "layout: capture would overlap the caption chip" }
Write-Host ("capture {0}x{1} -> {2}x{3} (scale {4:N2}) at x={5}, chip ends x={6}" -f `
  $shot.Width, $shot.Height, $shotW, $shotH, $scale, $sx, ($CHIP_X + $chipW + $CHIP_SHADOW))

$g.FillRectangle((B $BLACK), ($sx + $FRAME_SHADOW), ($sy + $FRAME_SHADOW), $shotW, $shotH)
$g.DrawImage($shot, $sx, $sy, $shotW, $shotH)
$pen = New-Object System.Drawing.Pen($BLACK, 3)
$g.DrawRectangle($pen, ($sx + 1.5), ($sy + 1.5), ($shotW - 3), ($shotH - 3))
$pen.Dispose()

$bmp.Save("D:\Twitter Tweet Scan\store-assets\screenshot-1280x800$suffix.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $shot.Dispose()
"generated"
