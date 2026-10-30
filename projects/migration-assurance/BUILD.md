# Migration Assurance

Status: implemented browser comparator and Node.js CLI with synthetic samples and automated tests. The optional PnP export script is provided for a SharePoint Online sandbox and has not been executed against a tenant here.

## Problem

An owner cannot efficiently validate a release from a vague completion message. This utility compares mapped list/library inventory counts and produces a bounded exception list for investigation. It is inspired by Ganesh's reported investigation of a 138-source / 105-destination item gap; the included inventory files are synthetic.

## Run without Microsoft services

```bash
npm test
node projects/migration-assurance/cli.mjs projects/migration-assurance/source.sample.json projects/migration-assurance/destination.sample.json report.json
```

Exit codes: 0 = every mapped inventory matched (including an empty comparison), 1 = one or more exceptions, 2 = invalid input or a file error. A count match is never a migration sign-off. An empty comparison has no validation coverage.

The sample returns one match and three exceptions: documents mismatch (138 vs 105, gap 33), policies missing from destination, and an extra finance archive at destination. Export CSV in the browser or JSON through the CLI.

## JSON contract

```json
[
  {"siteKey":"it","listKey":"documents","itemCount":138}
]
```

- siteKey and listKey are non-empty logical identifiers shared by both exports, not literal URLs. They are trimmed and compared case-insensitively.
- itemCount is a non-negative safe integer. Strings, negative counts, duplicates and malformed arrays are rejected.
- A missing inventory is different from an inventory with zero items.
- Positive gap = fewer destination items; negative gap = more destination items. Either needs investigation.
- Duplicate logical keys fail the comparison so a row cannot silently overwrite another row.
- The browser limits each file to 2 MB and 10,000 rows. The core comparator enforces the row limit; choose sensible resource limits for larger CLI inputs.

## Optional SharePoint Online inventory

1. Obtain approved read access and an Entra app registration client ID for interactive PnP authentication. Use a supported PowerShell/PnP version from current PnP documentation.
2. Copy mapping.sample.json. Map logical list keys to the appropriate list identity on each side. Different titles or URLs can map to the same logical key.
3. Run the read-only export separately for each SharePoint Online site:

```powershell
./Export-Inventory.ps1 -SiteUrl https://YOURTENANT.sharepoint.com/sites/Sandbox -ClientId YOUR-APP-GUID -SiteKey it -MappingPath ./mapping.sample.json -OutputPath ./inventory.json
```

4. Repeat using destination mappings, or normalize a legacy-source report into the schema above. This PnP script is not a SharePoint 2016 exporter.
5. Capture source and destination during a controlled content freeze or comparable snapshot window. Record the timestamp, identity used, scope, mapping and permissions. ItemCount can include folders and system-related entries; do not mix a file-only export with a list ItemCount export.
6. Compare, investigate differences, rerun after remediation, and retain the review evidence. The script does not migrate, delete, alter permissions, or enumerate file contents.

## Interpretation and limitations

Matching counts can hide different documents, missing versions, incorrect metadata and broken access. Count differences can also reflect legitimate deletions, excluded content, folders, permissions visibility or changes between snapshots. Use consistent definitions and supplement this report with:

- Matched document IDs or mapped paths and sampled content checks.
- Version history and metadata checks relevant to the migration scope.
- Permission validation with intended and unintended users.
- Page, link, form and workflow testing.
- Owner UAT and recorded sign-off.

## Power Platform extension

The working utility is JavaScript. A future native version could write exceptions to a restricted SharePoint ValidationExceptions list and use Power Automate to notify owners with a UAT task. That integration is not implemented in this delivery and should not be claimed as deployed work.

## Evidence to capture

Record the input fixture, run command or browser steps, exact report, test results, interpretation, remediation decision and known limits. Never publish employer URLs, exports, user identities or access tokens in the public portfolio.

## References

- https://pnp.github.io/powershell/cmdlets/Get-PnPList.html
- https://pnp.github.io/powershell/articles/authentication.html
- https://pnp.github.io/powershell/articles/defaultclientid.html
