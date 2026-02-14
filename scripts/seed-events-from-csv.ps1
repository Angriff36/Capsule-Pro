param(
  [string[]]$Files = @(
    "C:\Users\Ryan\Downloads\bev_150_and_cobbler_structured.csv",
    "C:\Users\Ryan\Downloads\invoice_5792_structured.csv",
    "C:\Users\Ryan\Downloads\prep_list_corporate - Copy - Copy.csv",
    "C:\Users\Ryan\Downloads\prep_list_corporate - Copy.csv",
    "C:\Users\Ryan\Downloads\prep_list_wedding - Copy - Copy.csv",
    "C:\Users\Ryan\Downloads\prep_list_wedding - Copy.csv"
  )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-DatabaseUrl {
  $envPath = "C:\Projects\convoy\apps\studio\.env.local"
  if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Missing env file: $envPath"
  }
  $line = Get-Content -LiteralPath $envPath | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1
  if (-not $line) {
    throw "DATABASE_URL not found in $envPath"
  }
  return $line.Split("=", 2)[1].Trim().Trim('"')
}

function Invoke-Db {
  param([string]$Sql)
  $result = $Sql | psql $env:DATABASE_URL -X -q -t -A -v ON_ERROR_STOP=1 -f -
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed for SQL: $Sql"
  }
  if ($null -eq $result) {
    return ""
  }
  $lines = @()
  if ($result -is [array]) {
    $lines = $result
  } else {
    $lines = @($result)
  }
  $line = $lines |
    Where-Object { $_ -and ($_ -notmatch "^(INSERT|UPDATE|DELETE) ") } |
    Select-Object -First 1
  if (-not $line) {
    return ""
  }
  return $line.Trim()
}

function Escape-Sql {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

function Parse-Number {
  param([string]$Value)
  $numberText = [regex]::Match($Value, "[0-9.]+").Value
  if (-not $numberText) {
    return $null
  }
  $parsed = 0.0
  if ([double]::TryParse($numberText, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
    return $parsed
  }
  return $null
}

function Parse-Servings {
  param([string]$Value)
  $servings = Parse-Number $Value
  if ($servings) {
    return [int][Math]::Round($servings)
  }
  return 1
}

$env:DATABASE_URL = Get-DatabaseUrl

$tenantRow = Invoke-Db 'SELECT id, slug, name FROM platform."Tenant" LIMIT 1;'
if (-not $tenantRow) {
  throw "No tenant found in platform.Tenant. Sign in once to create a tenant row."
}

$tenantParts = $tenantRow.Split("|")
$tenantId = $tenantParts[0].Trim()
$tenantSlug = $tenantParts[1].Trim()
$tenantName = $tenantParts[2].Trim()

$tenantIdSql = Escape-Sql $tenantId
$tenantSlugSql = Escape-Sql $tenantSlug
$tenantNameSql = Escape-Sql $tenantName

if (-not $tenantIdSql) {
  throw "Tenant ID is empty; cannot seed."
}

Invoke-Db @"
INSERT INTO platform.accounts (id, name, slug)
VALUES ('$tenantIdSql', '$tenantNameSql', '$tenantSlugSql')
ON CONFLICT (slug) DO NOTHING;
"@

$locationId = Invoke-Db "SELECT id FROM tenant.locations WHERE tenant_id = '$tenantIdSql' AND deleted_at IS NULL ORDER BY is_primary DESC, created_at ASC LIMIT 1;"
if (-not $locationId) {
  $locationId = Invoke-Db @"
INSERT INTO tenant.locations (tenant_id, name, is_primary, is_active)
VALUES ('$tenantIdSql', 'Main Kitchen', true, true)
RETURNING id;
"@
  if (-not $locationId) {
    $locationId = Invoke-Db "SELECT id FROM tenant.locations WHERE tenant_id = '$tenantIdSql' ORDER BY created_at DESC LIMIT 1;"
  }
}
if (-not $locationId) {
  throw "Failed to resolve location_id for tenant $tenantIdSql"
}
if (-not ($locationId -match "^[0-9a-fA-F-]{36}$")) {
  throw "Location ID is not a UUID: $locationId"
}

$poundUnitId = Invoke-Db "SELECT id FROM core.units WHERE code = 'lb' LIMIT 1;"

$recipeCache = @{}
$dishCache = @{}

function Get-RecipeId {
  param([string]$Name)
  if (-not $Name) {
    throw "Recipe name is required."
  }
  $key = $Name.ToLowerInvariant()
  if ($recipeCache.ContainsKey($key)) {
    return $recipeCache[$key]
  }
  $escapedName = Escape-Sql $Name
  $existing = Invoke-Db "SELECT id FROM tenant_kitchen.recipes WHERE tenant_id = '$tenantIdSql' AND name = '$escapedName' AND deleted_at IS NULL LIMIT 1;"
  if ($existing) {
    $recipeCache[$key] = $existing
    return $existing
  }
  $newId = [guid]::NewGuid().ToString()
  Invoke-Db "INSERT INTO tenant_kitchen.recipes (tenant_id, id, name, is_active) VALUES ('$tenantIdSql', '$newId', '$escapedName', true);"
  $recipeCache[$key] = $newId
  return $newId
}

function Get-DishId {
  param([string]$Name, [string]$RecipeId)
  if (-not $Name) {
    throw "Dish name is required."
  }
  if (-not $RecipeId) {
    throw "Recipe ID is required for dish '$Name'."
  }
  $key = $Name.ToLowerInvariant()
  if ($dishCache.ContainsKey($key)) {
    return $dishCache[$key]
  }
  $escapedName = Escape-Sql $Name
  $existing = Invoke-Db "SELECT id FROM tenant_kitchen.dishes WHERE tenant_id = '$tenantIdSql' AND name = '$escapedName' AND deleted_at IS NULL LIMIT 1;"
  if ($existing) {
    $dishCache[$key] = $existing
    return $existing
  }
  $newId = [guid]::NewGuid().ToString()
  Invoke-Db "INSERT INTO tenant_kitchen.dishes (tenant_id, id, recipe_id, name, is_active) VALUES ('$tenantIdSql', '$newId', '$RecipeId', '$escapedName', true);"
  $dishCache[$key] = $newId
  return $newId
}

function Insert-Event {
  param(
    [string]$Title,
    [datetime]$EventDate,
    [int]$GuestCount,
    [string]$Notes
  )
  $eventId = [guid]::NewGuid().ToString()
  $eventId = $eventId.Trim()
  if (-not ($eventId -match "^[0-9a-fA-F-]{36}$")) {
    throw "Generated event ID is invalid."
  }
  $titleSql = Escape-Sql $Title
  $notesSql = Escape-Sql $Notes
  $dateSql = $EventDate.ToString("yyyy-MM-dd")
  Invoke-Db @"
INSERT INTO tenant_events.events (
  tenant_id, id, title, event_type, event_date, guest_count, status, notes
)
VALUES (
  '$tenantIdSql',
  '$eventId',
  '$titleSql',
  'catering',
  '$dateSql',
  $GuestCount,
  'confirmed',
  '$notesSql'
);
"@
  return $eventId
}

function Insert-EventDish {
  param(
    [string]$EventId,
    [string]$DishId,
    [int]$Servings,
    [string]$Instructions
  )
  $eventIdValue = $EventId.Trim()
  $dishIdValue = $DishId.Trim()
  if (-not $DishId) {
    Write-Warning "Skipping event dish insert: missing dish_id for event $EventId"
    return
  }
  if (-not ($dishIdValue -match "^[0-9a-fA-F-]{36}$")) {
    throw "Dish ID is not a UUID: $DishId"
  }
  if (-not ($eventIdValue -match "^[0-9a-fA-F-]{36}$")) {
    throw "Event ID is not a UUID: $EventId"
  }
  $eventDishId = [guid]::NewGuid().ToString()
  $eventDishId = $eventDishId.Trim()
  $instructionsSql = Escape-Sql $Instructions
  Invoke-Db @"
INSERT INTO tenant_events.event_dishes (
  tenant_id, id, event_id, dish_id, quantity_servings, special_instructions
)
VALUES (
  '$tenantIdSql',
  '$eventDishId',
  '$eventIdValue',
  '$dishIdValue',
  $Servings,
  '$instructionsSql'
)
ON CONFLICT (tenant_id, event_id, dish_id) WHERE deleted_at IS NULL
DO UPDATE SET
  quantity_servings = GREATEST(event_dishes.quantity_servings, EXCLUDED.quantity_servings),
  special_instructions = COALESCE(event_dishes.special_instructions, EXCLUDED.special_instructions),
  updated_at = now();
"@
}

function Insert-PrepTask {
  param(
    [string]$EventId,
    [string]$DishId,
    [string]$Name,
    [double]$Quantity,
    [string]$Unit,
    [int]$Servings,
    [datetime]$StartBy,
    [datetime]$DueBy,
    [bool]$IsEventFinish,
    [string]$Notes
  )
  $eventIdValue = $EventId.Trim()
  $dishIdValue = $DishId.Trim()
  if (-not $DishId) {
    Write-Warning "Skipping prep task insert: missing dish_id for event $EventId"
    return
  }
  if (-not ($dishIdValue -match "^[0-9a-fA-F-]{36}$")) {
    throw "Dish ID is not a UUID: $DishId"
  }
  if (-not ($eventIdValue -match "^[0-9a-fA-F-]{36}$")) {
    throw "Event ID is not a UUID: $EventId"
  }
  $prepTaskId = [guid]::NewGuid().ToString()
  $prepTaskId = $prepTaskId.Trim()
  $nameSql = Escape-Sql $Name
  $notesSql = Escape-Sql $Notes
  $startSql = $StartBy.ToString("yyyy-MM-dd")
  $dueSql = $DueBy.ToString("yyyy-MM-dd")
  $unitIdValue = "NULL"
  if ($Unit -match "pound" -and $poundUnitId) {
    $unitIdValue = $poundUnitId
  }
  Invoke-Db @"
INSERT INTO tenant_kitchen.prep_tasks (
  tenant_id, id, event_id, dish_id, location_id, task_type, name,
  quantity_total, quantity_unit_id, servings_total, start_by_date, due_by_date,
  is_event_finish, status, priority, notes
)
VALUES (
  '$tenantIdSql',
  '$prepTaskId',
  '$eventIdValue',
  '$dishIdValue',
  '$locationId',
  'prep',
  '$nameSql',
  $Quantity,
  $unitIdValue,
  $Servings,
  '$startSql',
  '$dueSql',
  $IsEventFinish,
  'pending',
  5,
  '$notesSql'
);
"@
}

$today = Get-Date

foreach ($file in $Files) {
  if (-not (Test-Path -LiteralPath $file)) {
    Write-Warning "Missing file: $file"
    continue
  }

  $rows = Import-Csv -LiteralPath $file
  if ($rows.Count -eq 0) {
    Write-Warning "No rows in $file"
    continue
  }

  $headers = $rows[0].PSObject.Properties.Name
  $isPrepList = $headers -contains "list_id" -or $headers -contains "list_name"

  if ($isPrepList) {
    $groups = $rows | Group-Object -Property list_id
    foreach ($group in $groups) {
      $groupRows = $group.Group
      $listName = $groupRows[0].list_name
      $eventDate = if ($listName -match "wedding") { $today.AddDays(45) } else { $today.AddDays(14) }
      $guestCount = ($groupRows | Where-Object { $_.unit -match "serv" } | ForEach-Object { [int]($_.quantity) } | Measure-Object -Maximum).Maximum
      if (-not $guestCount) { $guestCount = 1 }
      $eventId = Insert-Event -Title $listName -EventDate $eventDate -GuestCount $guestCount -Notes "Seeded from $file"

      foreach ($row in $groupRows) {
        $dishName = if ($row.item_name) { $row.item_name } else { $row.recipe_name }
        if (-not $dishName) { continue }
        $recipeName = if ($row.recipe_name) { $row.recipe_name } else { $dishName }
        $quantity = Parse-Number $row.quantity
        if (-not $quantity) { $quantity = 1 }
        $unit = if ($null -ne $row.unit) { $row.unit.ToLowerInvariant() } else { "" }
        $servings = if ($unit -match "serv") { [int][Math]::Round($quantity) } else { 1 }
        $instructions = if ($null -ne $row.notes) { $row.notes } else { "" }
        $isEventFinish = (if ($null -ne $row.finish_location) { $row.finish_location } else { "" }) -match "event"

        $recipeId = Get-RecipeId -Name $recipeName
        $dishId = Get-DishId -Name $dishName -RecipeId $recipeId

        Insert-EventDish -EventId $eventId -DishId $dishId -Servings $servings -Instructions $instructions
        Insert-PrepTask -EventId $eventId -DishId $dishId -Name $dishName -Quantity $quantity -Unit $unit -Servings $servings -StartBy ($eventDate.AddDays(-2)) -DueBy $eventDate -IsEventFinish $isEventFinish -Notes $instructions
      }
    }
  } else {
    $fileLabel = [System.IO.Path]::GetFileNameWithoutExtension($file) -replace "[_-]+", " "
    $eventDate = $today.AddDays(10)
    $guestCount = ($rows | ForEach-Object { Parse-Servings $_.'Servings/Batch' } | Measure-Object -Maximum).Maximum
    if (-not $guestCount) { $guestCount = 1 }
    $eventId = Insert-Event -Title $fileLabel -EventDate $eventDate -GuestCount $guestCount -Notes "Seeded from $file"

    foreach ($row in $rows) {
      $dishName = $row.'Dish Name'
      if (-not $dishName) { continue }
      $quantityValue = Parse-Number $row.'Quantity/Unit'
      if (-not $quantityValue) { $quantityValue = 1 }
      $unitText = if ($null -ne $row.'Quantity/Unit') { $row.'Quantity/Unit'.ToLowerInvariant() } else { "" }
      $servings = Parse-Servings $row.'Servings/Batch'
      $instructions = if ($null -ne $row.'Special Instructions') { $row.'Special Instructions' } else { "" }
      $finishedAt = if ($null -ne $row.'Finished At') { $row.'Finished At'.ToLowerInvariant() } else { "" }
      $isEventFinish = $finishedAt -match "event" -or $finishedAt -match "drop"

      $recipeId = Get-RecipeId -Name $dishName
      $dishId = Get-DishId -Name $dishName -RecipeId $recipeId

      Insert-EventDish -EventId $eventId -DishId $dishId -Servings $servings -Instructions $instructions
      Insert-PrepTask -EventId $eventId -DishId $dishId -Name $dishName -Quantity $quantityValue -Unit $unitText -Servings $servings -StartBy ($eventDate.AddDays(-2)) -DueBy $eventDate -IsEventFinish $isEventFinish -Notes $instructions
    }
  }
}

Write-Host "Seed complete."
