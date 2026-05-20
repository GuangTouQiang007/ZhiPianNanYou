Add-Content -Path ".claude/hooks/hook-output.log" -Value "$(Get-Date): Hook triggered - running type check"
npx tsc --noEmit 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Add-Content -Path ".claude/hooks/hook-output.log" -Value "$(Get-Date): OK - Type check passed"
} else {
    Add-Content -Path ".claude/hooks/hook-output.log" -Value "$(Get-Date): FAIL - Type check failed"
    exit 1
}
