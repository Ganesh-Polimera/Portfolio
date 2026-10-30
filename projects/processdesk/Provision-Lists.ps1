#Requires -Modules PnP.PowerShell
<# Creates schemas on an existing dedicated sandbox site. It does not grant end-user access.
   Before sharing, complete the permission setup in BUILD.md. The site should be owner-only.
   Test with your installed PnP version; this script has not been run against a tenant here. #>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][uri]$SiteUrl,
    [Parameter(Mandatory)][guid]$ClientId
)
$ErrorActionPreference = 'Stop'
if ($SiteUrl.Scheme -ne 'https') { throw 'Use an HTTPS SharePoint site URL.' }
if (-not $PSCmdlet.ShouldProcess($SiteUrl.AbsoluteUri, 'Create ProcessDesk sandbox list schemas')) { return }
$connection = Connect-PnPOnline -Url $SiteUrl.AbsoluteUri -ClientId $ClientId -Interactive -ReturnConnection
$schemas = @{
    RequestIntake = @(
        @{ Name='Category'; Type='Choice'; Choices=@('Access','Collaboration','Automation') },
        @{ Name='Priority'; Type='Choice'; Choices=@('Normal','High') },
        @{ Name='BusinessNeed'; Type='Note' }
    )
    WorkflowState = @(
        @{ Name='RequestKey'; Type='Text' },
        @{ Name='RequestId'; Type='Number' },
        @{ Name='RequesterEmail'; Type='Text' },
        @{ Name='RequestSnapshot'; Type='Note' },
        @{ Name='ReviewerEmail'; Type='Text' },
        @{ Name='ApprovalId'; Type='Text' },
        @{ Name='Status'; Type='Choice'; Choices=@('Created','ApprovalPending','Approved','Rejected','NeedsReview') },
        @{ Name='DueUtc'; Type='DateTime' },
        @{ Name='DecisionUtc'; Type='DateTime' },
        @{ Name='DecisionComment'; Type='Note' },
        @{ Name='RunId'; Type='Text' },
        @{ Name='ErrorSummary'; Type='Note' }
    )
}
try {
    foreach ($name in $schemas.Keys) {
        $list = Get-PnPList -Connection $connection | Where-Object Title -eq $name
        if (-not $list) { New-PnPList -Title $name -Template GenericList -Connection $connection | Out-Null }
        $fields = @(Get-PnPField -List $name -Connection $connection)
        foreach ($field in $schemas[$name]) {
            if ($fields.InternalName -notcontains $field.Name) {
                $params = @{List=$name; DisplayName=$field.Name; InternalName=$field.Name; Type=$field.Type; AddToDefaultView=$true; Connection=$connection}
                if ($field.ContainsKey('Choices')) { $params.Choices = $field.Choices }
                Add-PnPField @params | Out-Null
            }
        }
    }
    Set-PnPField -List WorkflowState -Identity RequestKey -Values @{Indexed=$true; EnforceUniqueValues=$true} -Connection $connection
    Set-PnPField -List RequestIntake -Identity Category -Values @{Required=$true} -Connection $connection
    Set-PnPField -List RequestIntake -Identity BusinessNeed -Values @{Required=$true} -Connection $connection
    Write-Output 'Schemas ready. Before sharing, restrict WorkflowState and configure RequestIntake item-level access as documented in BUILD.md.'
} finally { Disconnect-PnPOnline -Connection $connection }
