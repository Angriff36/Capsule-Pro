param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"

Get-ChildItem "C:\Projects\convoy\supabase\neon-migrations\*.sql" |
  Sort-Object Name |
  ForEach-Object {
    Write-Host "Applying $($_.Name)"
    psql $DatabaseUrl -v ON_ERROR_STOP=1 -c "set statement_timeout = '10min';" -f $_.FullName
  }
