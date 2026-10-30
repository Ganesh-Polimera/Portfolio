#Requires -Modules PnP.PowerShell
<# Read-only inventory export for SharePoint Online. It does not connect to SharePoint 2016.
   Export legacy source counts with a separately supported tool, then normalize to the same JSON schema.
   Untested against a live tenant in this delivery. #>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][uri]$SiteUrl,
    [Parameter(Mandatory)][guid]$ClientId,
    [Parameter(Mandatory)][string]$SiteKey,
    [Parameter(Mandatory)][string]$MappingPath,
    [Parameter(Mandatory)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
if ($SiteUrl.Scheme -ne 'https' -or [string]::IsNullOrWhiteSpace($SiteKey)) { throw 'Use HTTPS and a non-empty logical site key.' }
# Mapping file: [{"listKey":"documents","listIdentity":"Shared Documents"}]
$mapping = @(Get-Content -LiteralPath $MappingPath -Raw | ConvertFrom-Json)
if ($mapping.Count -eq 0) { throw 'Provide at least one list mapping.' }
$keys = @{}
foreach ($m in $mapping) {
    if ([string]::IsNullOrWhiteSpace($m.listKey) -or [string]::IsNullOrWhiteSpace($m.listIdentity)) { throw 'Each mapping needs listKey and listIdentity.' }
    $key = $m.listKey.Trim().ToLowerInvariant()
    if ($keys.ContainsKey($key)) { throw "Duplicate listKey: $key" }
    $keys[$key] = $true
}
$connection = Connect-PnPOnline -Url $SiteUrl.AbsoluteUri -ClientId $ClientId -Interactive -ReturnConnection
try {
    $inventory = @(foreach ($m in $mapping) {
        $list = Get-PnPList -Identity $m.listIdentity -Includes ItemCount -Connection $connection
        if ($null -eq $list) { throw "List not found: $($m.listIdentity)" }
        [pscustomobject]@{ siteKey=$SiteKey.Trim().ToLowerInvariant(); listKey=$m.listKey.Trim().ToLowerInvariant(); itemCount=[long]$list.ItemCount }
    })
    ConvertTo-Json -InputObject $inventory -Depth 4 | Set-Content -LiteralPath $OutputPath -Encoding utf8NoBOM
    Write-Output "Exported $($inventory.Count) mapped inventories to $OutputPath"
} finally { Disconnect-PnPOnline -Connection $connection }
