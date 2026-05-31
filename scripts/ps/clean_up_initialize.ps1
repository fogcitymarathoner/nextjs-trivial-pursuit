# Full cleanup for testing tsconfig changes
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow

# Next.js build output
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✓ Removed .next" -ForegroundColor Green
}

# TypeScript output (if you compile with tsc)
if (Test-Path dist) {
    Remove-Item -Recurse -Force dist
    Write-Host "✓ Removed dist" -ForegroundColor Green
}

if (Test-Path build) {
    Remove-Item -Recurse -Force build
    Write-Host "✓ Removed build" -ForegroundColor Green
}

# Tool caches
if (Test-Path node_modules/.cache) {
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "✓ Removed node_modules/.cache" -ForegroundColor Green
}

# Turbopack cache (if using Turbopack)
if (Test-Path .turbo) {
    Remove-Item -Recurse -Force .turbo
    Write-Host "✓ Removed .turbo" -ForegroundColor Green
}

# Next.js dev cache
if (Test-Path .next-dev) {
    Remove-Item -Recurse -Force .next-dev
    Write-Host "✓ Removed .next-dev" -ForegroundColor Green
}

Write-Host "`nCleanup complete! Ready to test tsconfig changes." -ForegroundColor Green
