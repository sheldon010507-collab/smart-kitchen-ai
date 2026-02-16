# Smart Kitchen AI - Render video
# Run from video-demo folder: .\render.ps1

Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Rendering SmartKitchenDemo..."
npx remotion render src/index.ts SmartKitchenDemo out/smart-kitchen-demo.mp4

if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Output: out/smart-kitchen-demo.mp4"
} else {
    exit $LASTEXITCODE
}
