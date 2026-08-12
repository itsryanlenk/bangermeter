# Bangermeter — build the Chrome Web Store upload package (runtime files only)
$ext = "D:\Twitter Tweet Scan\extension"
$distDir = "D:\Twitter Tweet Scan\dist"
New-Item -ItemType Directory -Force $distDir | Out-Null

$manifest = Get-Content -Raw -Encoding UTF8 "$ext\manifest.json" | ConvertFrom-Json
$version = $manifest.version
$zip = "$distDir\bangermeter-$version.zip"
if (Test-Path $zip) { [System.IO.File]::Delete($zip) }

$items = @(
  "$ext\manifest.json",
  "$ext\weights.js",
  "$ext\scoring.js",
  "$ext\content.js",
  "$ext\styles.css",
  "$ext\popup.html",
  "$ext\popup.js",
  "$ext\icons"
)
Compress-Archive -Path $items -DestinationPath $zip
"packaged: $zip (" + [math]::Round((Get-Item $zip).Length / 1KB, 1) + " KB)"
