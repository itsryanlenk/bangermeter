# Bangermeter — Chrome Web Store promo tile generator (neo-brutalist brand)
Add-Type -AssemblyName System.Drawing

$BLACK  = [System.Drawing.ColorTranslator]::FromHtml("#000000")
$WHITE  = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
$CREAM  = [System.Drawing.ColorTranslator]::FromHtml("#F5F0E6")
$YELLOW = [System.Drawing.ColorTranslator]::FromHtml("#FFEB3B")
$GREEN  = [System.Drawing.ColorTranslator]::FromHtml("#4CAF50")
$RED    = [System.Drawing.ColorTranslator]::FromHtml("#FF5252")
$GRAY1  = [System.Drawing.ColorTranslator]::FromHtml("#333333")
$GRAY2  = [System.Drawing.ColorTranslator]::FromHtml("#BBBBBB")
$GRAY3  = [System.Drawing.ColorTranslator]::FromHtml("#DDDDDD")

function B($c) { New-Object System.Drawing.SolidBrush($c) }

# Neo box: hard offset shadow, flat fill, thick black border
function NeoBox($g, $x, $y, $w, $h, $fillColor, $bw, $shadow) {
  if ($shadow -gt 0) { $g.FillRectangle((B $BLACK), $x + $shadow, $y + $shadow, $w, $h) }
  $g.FillRectangle((B $fillColor), $x, $y, $w, $h)
  $pen = New-Object System.Drawing.Pen($BLACK, $bw)
  $g.DrawRectangle($pen, ($x + $bw/2), ($y + $bw/2), ($w - $bw), ($h - $bw))
  $pen.Dispose()
}

# Brand bolt inside a yellow neo box
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

# Score chip (green/yellow bg, black text, black border)
function Chip($g, $text, $x, $y, $w, $h, $bg, $fontPx) {
  NeoBox $g $x $y $w $h $bg 2 2
  $font = New-Object System.Drawing.Font("Arial", $fontPx, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sz = $g.MeasureString($text, $font)
  $g.DrawString($text, $font, (B $BLACK), $x + ($w - $sz.Width)/2, $y + ($h - $sz.Height)/2 + 1)
  $font.Dispose()
}

# Fake tweet card with badge
function TweetCard($g, $x, $y, $w, $h, $scale) {
  NeoBox $g $x $y $w $h $WHITE 3 (6 * $scale)
  $p = 16 * $scale
  # avatar
  NeoBox $g ($x+$p) ($y+$p) (26*$scale) (26*$scale) $GRAY3 2 0
  # name + handle bars
  $g.FillRectangle((B $GRAY1), ($x+$p+34*$scale), ($y+$p+2*$scale), (90*$scale), (10*$scale))
  $g.FillRectangle((B $GRAY2), ($x+$p+132*$scale), ($y+$p+2*$scale), (60*$scale), (10*$scale))
  # text bars
  $g.FillRectangle((B $GRAY3), ($x+$p), ($y+$p+40*$scale), ($w - 2*$p), (11*$scale))
  $g.FillRectangle((B $GRAY3), ($x+$p), ($y+$p+58*$scale), (($w - 2*$p) * 0.85), (11*$scale))
  $g.FillRectangle((B $GRAY3), ($x+$p), ($y+$p+76*$scale), (($w - 2*$p) * 0.55), (11*$scale))
  # action row glyph stubs
  $ay = $y + $h - $p - 24*$scale
  $g.FillRectangle((B $GRAY2), ($x+$p), ($ay+6*$scale), (18*$scale), (10*$scale))
  $g.FillRectangle((B $GRAY2), ($x+$p+34*$scale), ($ay+6*$scale), (18*$scale), (10*$scale))
  $g.FillRectangle((B $GRAY2), ($x+$p+68*$scale), ($ay+6*$scale), (18*$scale), (10*$scale))
  # THE BADGE: bolt box + C/E chips, right-aligned in action row
  $chipH = 26 * $scale
  $boltS = 26 * $scale
  $cW = 46 * $scale
  $bx = $x + $w - $p - ($boltS + 6*$scale + $cW + 5*$scale + $cW)
  BoltBox $g $bx $ay $boltS 2 2
  Chip $g "C87" ($bx + $boltS + 6*$scale) $ay $cW $chipH $GREEN (14*$scale)
  Chip $g "E92" ($bx + $boltS + 6*$scale + $cW + 5*$scale) $ay $cW $chipH $GREEN (14*$scale)
}

function New-Canvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear($CREAM)
  return @($bmp, $g)
}

$outDir = "D:\Twitter Tweet Scan\store-assets"

# ── SMALL TILE 440x280 ─────────────────────────────────────────────────────
$c = New-Canvas 440 280; $bmp = $c[0]; $g = $c[1]

BoltBox $g 28 24 54 3 4
Txt $g "BANGERMETER" "Arial Black" 34 ([System.Drawing.FontStyle]::Regular) $BLACK 94 30
Txt $g "SCORE ANY TWEET. X'S OWN ALGORITHM." "Arial" 14 ([System.Drawing.FontStyle]::Bold) $BLACK 97 72

TweetCard $g 28 108 384 144 1.0

$bmp.Save("$outDir\promo-small-440x280.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# ── MARQUEE TILE 1400x560 ──────────────────────────────────────────────────
$c = New-Canvas 1400 560; $bmp = $c[0]; $g = $c[1]

# Left: brand block
BoltBox $g 70 62 96 5 8
Txt $g "BANGERMETER" "Arial Black" 66 ([System.Drawing.FontStyle]::Regular) $BLACK 186 74
Txt $g "SCORE ANY TWEET WITH" "Arial Black" 34 ([System.Drawing.FontStyle]::Regular) $BLACK 72 200
Txt $g "X'S OWN ALGORITHM." "Arial Black" 34 ([System.Drawing.FontStyle]::Regular) $BLACK 72 246
Txt $g "The open-sourced ranking formula. The last published weights." "Arial" 19 ([System.Drawing.FontStyle]::Bold) $GRAY1 72 316
Txt $g "Every factor cited to code. No folklore numbers." "Arial" 19 ([System.Drawing.FontStyle]::Bold) $GRAY1 72 344

# Yellow fact chip
NeoBox $g 72 400 464 46 $YELLOW 3 5
Txt $g "REPLY = 27x A LIKE. IT'S IN THE CODE." "Arial" 20 ([System.Drawing.FontStyle]::Bold) $BLACK 90 411

# Right: big tweet card + mini breakdown panel
TweetCard $g 820 56 500 250 1.35

# Mini panel: black header + contribution bars
NeoBox $g 820 340 500 160 $WHITE 3 8
$g.FillRectangle((B $BLACK), 820, 340, 500, 38)
$pen = New-Object System.Drawing.Pen($BLACK, 3)
$g.DrawRectangle($pen, 821.5, 341.5, 497, 157)
$pen.Dispose()
BoltBox $g 832 346 26 2 0
Txt $g "BANGERMETER" "Arial Black" 17 ([System.Drawing.FontStyle]::Regular) $WHITE 868 350

# contribution rows: label + colored bar
$rows = @(
  @("REPLIES", 13.5, 300, $GREEN),
  @("PROFILE CLICKS", 12.0, 268, $GREEN),
  @("LIKES", 0.5, 60, $GREEN),
  @("REPORTS", -369, 200, $RED)
)
$ry = 392
foreach ($r in $rows) {
  Txt $g $r[0] "Arial" 13 ([System.Drawing.FontStyle]::Bold) $BLACK 836 $ry
  $g.FillRectangle((B $r[3]), 960, $ry, $r[2], 14)
  $penB = New-Object System.Drawing.Pen($BLACK, 2)
  $g.DrawRectangle($penB, 960, $ry, $r[2], 14)
  $penB.Dispose()
  $wtxt = if ($r[1] -lt 0) { [string]$r[1] } else { "x" + $r[1] }
  Txt $g $wtxt "Arial" 12 ([System.Drawing.FontStyle]::Bold) $GRAY1 (966 + $r[2]) ($ry + 1)
  $ry += 26
}

$bmp.Save("$outDir\promo-marquee-1400x560.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

"generated"
