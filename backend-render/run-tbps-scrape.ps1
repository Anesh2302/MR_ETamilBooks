$token = Get-Content "$env:TEMP\vercel_token.txt" -Raw
$headers = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" }
$url = "https://mr-e-tamil-books.vercel.app/api/admin/tbps/scrape-page"

$startPage = 2
$endPage = 153
$totalImported = 30  # page 1 already done
$totalErrors = 0
$totalSkipped = 0

for ($page = $startPage; $page -le $endPage; $page++) {
    Write-Host "Page $page/$endPage..." -NoNewline
    $body = @{ page = $page } | ConvertTo-Json -Compress
    try {
        $r = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -TimeoutSec 300 -ErrorAction Stop
        $totalImported += $r.imported
        $totalSkipped += $r.skipped
        $totalErrors += $r.errors.Count
        Write-Host " $($r.imported) imported, $($r.skipped) skipped, $($r.errors.Count) errors"
        if ($r.errors.Count -gt 0) {
            $r.errors | ForEach-Object { Write-Host "    $_" }
        }
    } catch {
        Write-Host " FAILED: $_"
        $totalErrors++
    }
    # Small delay between pages
    Start-Sleep -Milliseconds 200
}

Write-Host "`n=== DONE ==="
Write-Host "Total imported: $totalImported"
Write-Host "Total skipped: $totalSkipped"
Write-Host "Total errors: $totalErrors"
