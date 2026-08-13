# Bangermeter — compose clipboard screenshot onto a 1280x800 store canvas
#
# Caption numbers come from extension/weights.js via weights-export.js, never
# typed here — a hardcoded ratio on a store asset outlives the code that made it true.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$W = & node (Join-Path $PSScriptRoot "weights-export.js") | ConvertFrom-Json
if (-not $W -or -not $W.facts) { throw "weights-export.js produced no data - cannot build the screenshot" }

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

$shot = [System.Drawing.Image]::FromFile("D:\Twitter Tweet Scan\store-assets\clip-raw.png")

$bmp = New-Object System.Drawing.Bitmap(1280, 800, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear($CREAM)

# Left brand column
BoltBox $g 48 60 64 4 6
Txt $g "BANGERMETER" "Arial Black" 30 ([System.Drawing.FontStyle]::Regular) $BLACK 44 152
Txt $g "Every post scored with" "Arial" 18 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 210
Txt $g "X's own open-sourced" "Arial" 18 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 236
Txt $g "ranking algorithm." "Arial" 18 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 262

Txt $g "Real published weights." "Arial" 15 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 330
Txt $g "Every factor cited to code." "Arial" 15 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 354
Txt $g "Zero data collected." "Arial" 15 ([System.Drawing.FontStyle]::Bold) $GRAY1 48 378

# Caption comes from extension/weights.js; the chip is sized to the measured
# text so a longer caption can never overflow the box.
$capFont = New-Object System.Drawing.Font("Arial", 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$capW = [int]$g.MeasureString($W.facts.shortChipCaption, $capFont).Width
$capFont.Dispose()
$CHIP_X = 48; $CHIP_SHADOW = 5
$chipW = $capW + 36
NeoBox $g $CHIP_X 690 $chipW 42 $YELLOW 3 $CHIP_SHADOW
Txt $g $W.facts.shortChipCaption "Arial" 19 ([System.Drawing.FontStyle]::Bold) $BLACK 66 700

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

$bmp.Save("D:\Twitter Tweet Scan\store-assets\screenshot-1280x800.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $shot.Dispose()
"generated"
