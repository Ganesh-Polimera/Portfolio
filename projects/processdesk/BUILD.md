# ProcessDesk: native Power Platform build

Status: working JavaScript browser prototype plus Power Platform implementation assets. No native Power Apps application or cloud flow was deployed or tested by this delivery. These files are not a solution ZIP and cannot be imported as a solution. The top-level ZIP contains website source and build guidance.

## Business problem and MVP

Replace unstructured improvement and service-request emails with guided intake, deterministic reviewer routing, an approval record, and an explicit exception path. The browser prototype demonstrates the lifecycle. The native MVP uses a Canvas app, SharePoint lists, Power Automate Approvals, and outcome email. Teams notifications are an optional extension after the MVP passes UAT.

## Prerequisites

- A non-production Microsoft 365 site and a Power Platform maker environment you are authorized to use.
- Power Apps, SharePoint, Power Automate, Approvals and Outlook access appropriate to your plan and organization policy. Confirm licensing in your tenant; do not assume a free developer entitlement or production rights.
- An approved flow owner connection and three test reviewer identities or mailboxes.
- For the optional schema script: PowerShell and PnP.PowerShell versions supported by the current PnP documentation, plus your own Entra app registration client ID and delegated consent.
- Synthetic requests only. Keep the sandbox owner-only during schema provisioning.

## Data and authorization design

| List | Purpose | Write access | Read access |
| --- | --- | --- | --- |
| RequestIntake | Title, Category, Priority, BusinessNeed, system Author/Created | Requesters add their own items | Requesters read their own items; operations reads all |
| WorkflowState | Immutable request snapshot, trusted reviewer, approval ID, authoritative status, timestamps, error | Flow owner / trusted operations only | Trusted operations only |

1. Start with a dedicated site with no broad Members or Visitors access. Run `Provision-Lists.ps1 -SiteUrl https://YOURTENANT.sharepoint.com/sites/ProcessDeskSandbox -ClientId YOUR-APP-GUID -WhatIf`, review, then run without `-WhatIf`.
2. Before sharing anything, inspect both list permission pages. Break list inheritance for WorkflowState and retain only site owners and the flow identity/trusted operations group. Remove requester, broad member, and visitor grants. Site administrators retain administrative access.
3. On RequestIntake, grant the requester group only the permissions it needs. In advanced settings enable reading only items created by the user and restrict editing to owned items (or disallow editing after submission using a tested permission configuration). Do not give requesters Design, Manage Lists, or site-owner rights, which can bypass item restrictions.
4. Test permissions directly in SharePoint with two non-admin accounts. Hiding controls and filtering a gallery do not provide data security.
5. Share the requester app and its RequestIntake data access separately. Do not connect WorkflowState to the requester app. Outcomes are emailed in this MVP. A future requester status portal needs a separately tested server authorization design.

SharePoint has no general column-level authorization. Keeping authoritative decisions in a separate restricted list avoids treating a requester-editable Status column as a security boundary. Direct edits to intake do not change the snapshot used by an active approval; a changed request is a new submission.

## Canvas app

1. Create a blank responsive Canvas app named ProcessDesk. Connect only RequestIntake.
2. Add an Edit form named frmRequest. Select Title, Category, Priority and BusinessNeed; keep generated choice data cards so SharePoint choice types are handled correctly.
3. Add btnSubmit and a gallery galMyRequests. Copy individual property formulas from Canvas-Formulas.powerfx; the entire file is not a single formula.
4. Add a confirmation label using varRequestId. Provide a plain explanation that the result arrives by email.
5. Check tab order, required fields, form errors, mobile layout and delegation warnings. The gallery is not intended as an aggregate KPI source.
6. Save, publish, share with a non-admin test group, then test with each identity. The browser prototype’s reviewer controls are intentionally absent from the requester app.

## Cloud flow A: intake and approval

Build this inside a solution where supported. Use connection references and environment variables for the site URL, list names, reviewer emails and operations notification mailbox. Do not embed secrets in source. Action names below are descriptive; choose the corresponding current connector actions in the designer.

1. Trigger: SharePoint **When an item is created** on RequestIntake. Do not use created-or-modified. Take requester identity from system Created By Email, never a typed email field.
2. Validate Title, BusinessNeed and Category. A Switch maps Access, Collaboration and Automation to trusted reviewer addresses from configuration. The request never supplies an approver. Unknown categories go to an operations exception notification and terminate without an approval.
3. Compose RequestKey from the configured site/list identity plus the item ID, for example `sandbox-intake-42`. Create a WorkflowState row with RequestKey, RequestId, snapshot JSON, requester, reviewer, Status=Created and `workflow()?['run']?['name']` as RunId. RequestKey must enforce uniqueness. Retain the returned WorkflowState item ID for all later updates.
4. Treat a confirmed unique-key collision as a duplicate delivery: look up the existing RequestKey and stop without creating a second approval. If the create failed for any other reason, fail and alert operations. Do not ignore all errors as duplicates. A pre-check alone cannot prevent concurrent duplicates.
5. In a Try scope, **Create an approval**, type Approve/Reject – First to respond. Use the validated reviewer, title, request snapshot and link to the relevant item. Save the returned approval ID immediately in WorkflowState and set Status=ApprovalPending and DueUtc=`addDays(utcNow(), 7)`.
6. **Wait for an approval** with that approval ID. Set the action timeout to `P7D`. Default connector retries are acceptable for transient reads; do not blindly replay Create approval after an ambiguous failure. If an approval was created but its ID could not be persisted, route to NeedsReview and investigate the run manually.
7. On successful completion, branch on the exact Outcome (`Approve` / `Reject`). Update the same WorkflowState item with Approved or Rejected, UTC decision time and response comment. Send an outcome email to the system requester email. Keep user input in plain text; escape it if assembling HTML.
8. Catch scope: configure run-after for failure and timeout of Try. Update WorkflowState to NeedsReview when possible, write a concise ErrorSummary, include the stored approval ID and run ID in an operations alert, and do not mark the business request Approved or Rejected. Handle catch-write failures with an independent notification path.
9. On timeout, have an operator cancel or reconcile any outstanding approval in the approval center using the recorded ID. A timed-out waiting flow does not by itself establish that an approval has been canceled. Record the reconciliation before closing the exception.
10. Finally: record a completion or exception event in your operations log. A successful email is not the business decision; persist the decision first so a notification failure does not lose it.

Allow parallel intake runs so one seven-day approval does not block the queue. The unique RequestKey protects idempotent intake. Keep intentional resubmission separate: create a new RequestIntake item and request key. Error recovery must reconcile an existing approval rather than automatically starting a duplicate.

### Useful expressions

```text
Run ID: workflow()?['run']?['name']
Due date: addDays(utcNow(), 7)
Decision timestamp: utcNow()
Request key, with a fixed unique sandbox prefix:
concat('sandbox-intake-', string(triggerBody()?['ID']))
```

## Cloud flow B: reminder sweep (optional)

Run daily. Query WorkflowState for ApprovalPending rows, with pagination and an indexed Status / DueUtc strategy appropriate to scale. Notify operations of due items; use the request key and a stored reminder timestamp to avoid repeated daily spam. This flow never creates an approval and never approves on an owner’s behalf. Recheck current state immediately before sending; a decision may have arrived since the query. It must not overwrite a terminal decision.

## UAT and acceptance

| Scenario | Expected result |
| --- | --- |
| Blank title / missing need | Form or flow validation stops the request |
| Each of three categories | Exactly the configured reviewer is selected |
| Requester edits a reviewer field in a crafted payload | No such field is trusted; reviewer comes from configuration |
| Two requester accounts | Each can read only their authorized intake items; neither can read WorkflowState |
| Approve / Reject | One authoritative result and an outcome email |
| Duplicate trigger delivery | Unique RequestKey prevents a second approval |
| Reviewer never responds | Seven-day timeout; NeedsReview, operations alert, manual approval reconciliation |
| Notification failure after a decision | Decision remains recorded; alert/retry notification separately |
| Failure after approval creation | Existing approval is reconciled, not recreated automatically |
| Mobile and keyboard use | Form, validation and confirmation remain usable |

## Release and evidence

Record environment, app version, flow version, connection owner, UAT tester/date/results, unresolved issues and rollback plan. Export the genuine unmanaged development solution only after a native build exists; export a managed solution for a tested downstream deployment if your ALM process calls for it. Store sanitized screenshots and run-history evidence without tokens or personal data.

## Optional AI-assisted triage, not implemented

After the deterministic MVP passes UAT, evaluate a human-reviewed category suggestion using an approved AI Builder or Copilot Studio capability. Provide only synthetic/redacted request text, allow the user to accept or override, measure agreement against labeled test data, and retain deterministic routing and human approval. AI never grants access or approves a request. Check DLP, licenses, environment policy and provider data handling first. This delivery makes no live AI calls and includes no AI performance claims.

## Microsoft and PnP references (checked 29 October 2026)

- https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/working-with-forms
- https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview
- https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/share-app
- https://learn.microsoft.com/en-us/power-automate/modern-approvals
- https://learn.microsoft.com/en-us/power-automate/approvals-known-issues
- https://learn.microsoft.com/en-us/power-automate/limits-and-config
- https://pnp.github.io/powershell/cmdlets/Add-PnPField.html
- https://pnp.github.io/powershell/articles/defaultclientid.html

Microsoft documents a 30-day overall cloud-flow run duration and a 28-day approval-wait known issue. This MVP deliberately uses a seven-day wait. Long-running approvals require a different persisted, event-based design; do not extend the waiting action indefinitely.
