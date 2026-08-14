# Bangermeter — render the social cards in store-assets/cards/ to 1600x900 PNGs.
#
# Headless Chrome rather than System.Drawing: these are real layouts (grids,
# wrapping, measured type) and hand-placing every box in GDI+ is how the promo
# tiles ended up with hardcoded numbers nobody could lint.
$ErrorActionPreference = "Stop"

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw "Chrome not found - needed to render the cards" }

$cards = Join-Path $PSScriptRoot "cards"
$profile = Join-Path $env:TEMP "bm-card-profile"

Get-ChildItem $cards -Filter "card-*.html" | Sort-Object Name | ForEach-Object {
    $out = Join-Path $cards ($_.BaseName + ".png")
    if (Test-Path $out) { Remove-Item -LiteralPath $out -Force }
    $url = "file:///" + ($_.FullName -replace '\\', '/')
    # Chrome reports success on stderr, and PS 5.1 turns native stderr into a
    # terminating ErrorRecord. Drop the preference for the call itself.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $chrome --headless=new --disable-gpu --no-first-run --no-default-browser-check `
        --user-data-dir="$profile" --hide-scrollbars --force-device-scale-factor=1 `
        --window-size=1600,900 --screenshot="$out" $url | Out-Null
    $ErrorActionPreference = $prev
    Start-Sleep -Milliseconds 900
    if (Test-Path $out) {
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile($out)
        "{0,-24} {1}x{2}  {3} KB" -f $_.BaseName, $img.Width, $img.Height, [math]::Round((Get-Item $out).Length/1KB,1)
        $img.Dispose()
    } else {
        Write-Warning "failed to render $($_.Name)"
    }
}
