# Bangermeter — build the Chrome Web Store upload package (runtime files only)
$ErrorActionPreference = "Stop"

# Nothing ships until every version claim in the repo agrees with the manifest.
& node (Join-Path $PSScriptRoot "check-versions.js")
if ($LASTEXITCODE -ne 0) { throw "version check failed - not packaging" }

# ...and until the tree being packaged is one you could point at afterwards.
$guard = Join-Path $PSScriptRoot "package-guard.js"
& node $guard --pre @args
if ($LASTEXITCODE -ne 0) { throw "package guard failed - not packaging" }

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
  "$ext\background.js",
  "$ext\welcome.html",
  "$ext\icons"
)
Compress-Archive -Path $items -DestinationPath $zip
"packaged: $zip (" + [math]::Round((Get-Item $zip).Length / 1KB, 1) + " KB)"

# Record which commit this artifact came from, then read the artifact back and
# prove it matches the repo. v0.9.4 reached the store carrying a number that had
# already been corrected, and answering "which commit is live?" afterwards meant
# diffing against an installed copy of the extension.
& node $guard --stamp $zip
if ($LASTEXITCODE -ne 0) { throw "could not stamp build provenance" }
& node $guard --verify $zip
if ($LASTEXITCODE -ne 0) { throw "package verification failed - do NOT upload this zip" }
