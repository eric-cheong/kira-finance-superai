# ERP Close-Book Product Context

## Product One-Liner

Kira's ERP close-book feature is a dense operations workspace for finance teams to ingest invoices, reconcile suppliers and banks, resolve exceptions, and submit clean period-close data to ERP and LHDN without exporting bad records.

## UI Naming Rules

- Use the user-facing names: `Verified Bill`, `Bill Record`, `Invoice History`, and `Audit Trail`.
- Internal implementation may model a verified accounting event, but the UI must not show that internal name.
- Prefer status labels over vague states; every record should show exactly where it is in the close process.
- Use `LHDN` only for Malaysia e-invoice submission surfaces; use `ERP` for accounting-system submission surfaces.
- Use `Exception` for actionable blockers and `Warning` only for non-blocking review notes.
- Avoid playful, marketing, or assistant-style labels in the close-book UI; this is a high-density finance operations tool.

## Statuses

Use only these six Bill Record statuses:

1. `received` - document or transaction has entered the workspace.
2. `extracted` - key fields have been read and normalized.
3. `needs_review` - record has an exception or uncertainty needing human action.
4. `ready` - record has passed validation but is not yet approved.
5. `approved` - human approval has been recorded.
6. `exported` - record has been sent to ERP and/or packaged for LHDN evidence.

## Exception Types

Use only these six exception types:

1. `missing_tax_id` - supplier tax identity is absent or unusable.
2. `duplicate_risk` - likely duplicate supplier invoice or Bill Record.
3. `math_mismatch` - line totals, tax, subtotal, and invoice total do not reconcile.
4. `new_supplier` - supplier is not approved in the client supplier master.
5. `low_confidence` - critical extraction or matching confidence is below threshold.
6. `unreadable_scan` - source evidence cannot be reliably extracted.

## Never-Export Blockers

Never export or submit records with:

- Failed math checks.
- Unresolved duplicate risk.
- Missing supplier, invoice number, total, or currency.
- Critical confidence below threshold.
- Unresolved tax treatment or tax identity.
- Missing ERP vendor, AP, expense, tax, or LHDN classification mapping.
- Missing explicit approval when approval is required.

## Core Workflows

### Invoice Intake

Capture invoices from upload, inbox, or integration sources; extract required fields; normalize supplier, entity, tax, amount, date, and currency data; deduplicate; then move clean records toward matching or exception review.

### Supplier Reconciliation

Match invoices against supplier master data, purchase orders, historical payment terms, tax IDs, and ERP vendor records. Surface mismatches as exceptions with enough context for fast correction.

### Chase Intelligence

Prioritize unresolved supplier, invoice, and approval follow-ups by close risk, due date, amount, exception severity, and owner. The UI should make the next chase action obvious without hiding the underlying record detail.

### Bank Reconciliation

Match bank transactions to invoices, payments, suppliers, and ERP ledger entries. Unmatched, duplicate, or amount-mismatched transactions must remain blocked until resolved or approved.

### ERP/LHDN Submission

Submit only `Ready` records to ERP and, where applicable, LHDN. Show submission target, validation result, timestamp, response code, and retry state. Failed submissions return to `Exception` with the failure reason preserved.

### Audit Trail

Record every extraction result, match decision, manual edit, approval, submission attempt, exception change, and export action with actor, timestamp, before/after values, and source evidence.

## Intended UI Shape

The close-book UI should feel like a dense finance operations console, not a marketing dashboard. Prioritize sortable tables, persistent filters, compact status chips, exception queues, side-by-side evidence panels, inline validation, bulk actions with safeguards, and clear drill-down paths from period summary to individual record audit history.
