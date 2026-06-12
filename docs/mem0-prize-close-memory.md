# Mem0 Prize: Close Memory Hackathon Brief

## Prize Target

**Mem0 Prize: Best Memory-Powered Build**

Use Mem0 to create a workflow that remembers useful context over time, such as customer history, sales relationships, or team knowledge.

For Kira, the strongest prize angle is **Close Memory**: in the ERP month-end close workflow, Kira remembers how each supplier was coded, which exceptions were resolved, and who approved them. On the next close, it recalls that context to suggest coding, unblock repetitive exceptions, and prove that month two is faster than month one.

This is a better story than generic assistant memory because close-book work is naturally repetitive across periods. The memory has obvious business value, visible before/after impact, and a clean demo loop.

## Winning Demo Moment

A bill from a known supplier arrives in `needs_review`.

1. The user clicks **Recall context**.
2. Mem0 returns prior close decisions for that client and supplier:
   - Expense account `5010`
   - Tax treatment `SST-EX`
   - Cost centre `LG-KL`
   - Approved by Amir in prior closes
3. Kira shows relevance scores and a **Powered by Mem0** provenance badge.
4. The user clicks **Apply suggested coding**.
5. The ERP mapping is pre-filled, blockers drop, and the bill can proceed.
6. On approval or export, Kira writes a new memory back to Mem0.

The demo line:

> Month one teaches Kira. Month two closes faster because Kira remembers.

## Claude Opus Recommendation, Cleaned

This section is a cleaned version of the user-provided Claude Opus recommendation. Copy artifacts and line wrapping have been normalized, but the technical decisions and implementation sequence are preserved.

### Confirmed Decisions

- Primary backend: Mem0 hosted Platform via the `mem0ai` SDK, using real `add`, `search`, and `getAll` calls.
- Deterministic fallback: local JSON memory store so demos and tests do not break without hosted Mem0.
- Product angle: ERP close memory.
- Scope: `user_id = clientId`; metadata includes supplier, supplier ID, ERP mapping, tax treatment, approver, close period, and memory kind.
- Demo objective: recall supplier close context, apply coding, then write new memory back after approval/export.

### File And Change Map

#### `package.json`

- Add dependency: `mem0ai`.
- Add dev dependency: `tsx`.
- Add script: `seed:mem0` running `tsx scripts/seed-mem0.ts`.

#### `next.config.mjs`

- Add `transpilePackages: ["mem0ai"]`.
- This mitigates build issues from the ESM-only Mem0 SDK.

#### `lib/backend/provider-config.ts`

Mirror the existing offline-first provider readiness pattern.

Add:

- `hasMem0Key()`
- `mem0OrgId()`
- `mem0ProjectId()`
- `memoryProviderReadiness()`

`memoryProviderReadiness()` should return:

```ts
{
  configured: boolean;
  mode: "mem0-platform" | "local-store";
  orgId?: string;
  projectId?: string;
  fallbackReason?: string;
}
```

Also add a `memory` block to the object returned by `providerStatus()` so `/api/providers` and UI surfaces can show memory provenance.

Environment variables:

- `MEM0_API_KEY`, required for hosted Mem0.
- `MEM0_ORG_ID`, optional.
- `MEM0_PROJECT_ID`, optional.

#### `lib/backend/memory.ts`

Create the Mem0 wrapper, local fallback, and seed helper.

Requirements:

- First line: `import "server-only";`
- Lazy-load `mem0ai` only when configured.
- Cache a module-level Mem0 client.
- Use `MemoryClient` from the hosted Platform SDK, not OSS imports.
- Store local fallback data in `.kira-data/close-memory.json`.
- Re-derive the `.kira-data` path with `path.join(process.cwd(), ".kira-data")`; do not import private state-store paths.
- Wrap all Mem0 calls in `try/catch`.
- Writes are best-effort and must never throw to close-book callers.
- On Mem0 failure, fall back to the deterministic local store.

Public API:

```ts
type CloseDecisionInput = {
  clientId: string;
  supplierId?: string;
  supplierName?: string;
  closePeriod?: string;
  kind: "approval" | "export" | "exception_resolution";
  billId: string;
  erpMapping?: ErpMapping;
  taxTreatment?: string;
  approver?: string;
  exceptionsResolved?: string[];
  note?: string;
};

type CloseMemory = {
  id: string;
  text: string;
  score: number;
  metadata: {
    supplierId?: string;
    supplierName?: string;
    kind?: string;
    closePeriod?: string;
    taxTreatment?: string;
    approver?: string;
  };
  suggestedMapping?: Partial<ErpMapping>;
  source: "mem0" | "local";
};

async function rememberCloseDecision(
  input: CloseDecisionInput,
): Promise<{ written: boolean; source: "mem0" | "local" }>;

async function recallSupplierContext(args: {
  clientId: string;
  supplierId?: string;
  query: string;
  limit?: number;
}): Promise<{ memories: CloseMemory[]; source: "mem0" | "local" }>;

async function listClientMemories(
  clientId: string,
): Promise<{ memories: CloseMemory[]; source: "mem0" | "local" }>;

async function seedCloseMemories(): Promise<{
  written: number;
  source: "mem0" | "local";
}>;
```

Hosted Mem0 calls:

- Write:

```ts
client.add(
  [{ role: "user", content: memorySentence(input) }],
  { user_id: clientId, metadata },
);
```

- Recall:

```ts
client.search(query, {
  user_id: clientId,
  filters: supplierId ? { AND: [{ supplierId }] } : undefined,
  top_k: limit ?? 5,
});
```

- List:

```ts
client.getAll({ user_id: clientId });
```

Store exact structured coding in `metadata.erpMapping` so **Apply suggested coding** does not need to re-parse text with an LLM.

Local fallback recall should use deterministic token-overlap relevance. Scores should be stable for tests and demos.

#### `lib/backend/services.ts`

Wire close-memory writes without changing synchronous service function signatures.

Add a private helper, for example `recordCloseMemory(...)`, that:

- Looks up supplier and client context from close-book state.
- Builds `CloseDecisionInput`.
- Calls `void rememberCloseDecision(...).catch(() => {})`.
- Never blocks approval or export on memory success.

Hook points:

- In `approveCloseBookBill`, after the successful audit log block and before return, call `recordCloseMemory(record, "approval")`.
- In `exportReadyBills`, inside the successful export branch for each selected record, call `recordCloseMemory(record, "export")`.

#### `app/api/erp-close/memory/recall/route.ts`

Create a dynamic POST route:

- Parse JSON with existing HTTP helpers.
- Validate `clientId` as a string.
- Call `recallSupplierContext({ clientId, supplierId, query, limit })`.
- Return with `Cache-Control: no-store`.

Use existing helpers from `lib/backend/http.ts`, including `ok`, `readJson`, and `ApiError`.

#### `app/api/erp-close/memory/route.ts`

Create a dynamic GET route:

- Read `clientId` from the query string.
- Return `400` through `ApiError` when missing.
- Call `listClientMemories(clientId)`.
- Return with `Cache-Control: no-store`.

#### `components/close-memory-panel.tsx`

Create a client component using existing primitives only:

- `Card`
- `CardHeader`
- `Badge`
- `ConfidenceChip`
- `Button`
- `Notice`
- `EmptyState`
- `Icon` with `name="bookOpen"`

Props:

```ts
{
  clientId: string;
  initialBills: Array<{
    id: string;
    supplierId?: string;
    supplierName: string;
    query: string;
  }>;
  memoryConfigured: boolean;
}
```

Behavior:

- Supplier/bill selector.
- **Recall context** button calls `POST /api/erp-close/memory/recall`.
- Render returned memories with score chips.
- Show provenance:
  - `Powered by Mem0` when source is `mem0`.
  - `Local memory` when source is `local`.
- If `suggestedMapping` is present, show **Apply suggested coding**.
- Applying coding calls the existing bill update route with `{ erpMapping: suggestedMapping }`.
- On success, call `router.refresh()` and show a positive notice.
- Show empty/offline states with `EmptyState`.

#### `app/erp-close/page.tsx`

Add the memory panel to the existing sticky sidebar above `SubmissionGate`.

Requirements:

- Import `CloseMemoryPanel`.
- Import `memoryProviderReadiness`.
- Build `initialBills` from existing close-book records.
- Use existing helper patterns for supplier and client lookups.
- Suggested query shape:

```ts
`${record.supplierName} ${record.erpMapping?.taxCode ?? ""} ${client?.closePeriod ?? ""}`
```

Pass:

```tsx
<CloseMemoryPanel
  clientId={activeClient.id}
  initialBills={bills}
  memoryConfigured={memoryProviderReadiness().configured}
/>
```

#### `scripts/seed-mem0.ts`

Create a thin runner:

```ts
const result = await seedCloseMemories();
console.log(result);
process.exit(0);
```

Seed memories should live inside `seedCloseMemories()`, not the script.

Seed set should be grounded in close-book supplier fixtures:

- `client_laman + sup_beras`: expense `5010`, `SST-EX`, AutoCount.
- `client_laman + sup_cooltech`: expense `6070`, `SST-S8`, AutoCount.
- `client_laman + sup_meta`: expense `6040`, imported-service handling, AutoCount.
- `client_batik + sup_cooltech`: expense `6070`, SQL Account.
- `client_batik + sup_meta`: expense `6040`, imported-service handling.
- Exception-resolution memory for `sup_beras`: `missing_tax_id` resolved with TIN.
- Exception-resolution memory for `sup_meta`: `new_supplier` and imported-service treatment confirmed.

#### `DEMO.md`

Add a new demo act:

- **Kira remembers the last close**
- Show recall, apply suggested coding, approve/export write-back.
- Call out the `Powered by Mem0` badge.
- Show that the same supplier is faster in the next close.

### Verification Checklist

1. Install dependencies.
2. Run `npm run typecheck`.
3. Run `npm run lint`.
4. Hosted path:
   - Set `MEM0_API_KEY`.
   - Optionally set `MEM0_ORG_ID` and `MEM0_PROJECT_ID`.
   - Run `npm run seed:mem0`.
   - Confirm result source is `mem0`.
   - Go to `/erp-close`.
   - Select a known supplier.
   - Click **Recall context**.
   - Confirm memories render with confidence scores.
   - Click **Apply suggested coding**.
   - Confirm ERP mapping blockers drop.
   - Approve or export a bill.
   - Recall again and confirm write-back.
   - Check `GET /api/erp-close/memory?clientId=...`.
5. Offline path:
   - Unset or invalidate `MEM0_API_KEY`.
   - Run the seed script.
   - Confirm result source is `local`.
   - Confirm recall still works from `.kira-data/close-memory.json`.
   - Confirm approval/export never fails because of memory errors.

## Codex Co-founder Notes

### What Makes This Prize-Worthy

The strongest version of this feature is not "an AI assistant with memory." It is **operational memory inside a repetitive accounting control workflow**.

The judge should see:

- Kira remembers a real prior business decision.
- The memory is scoped to the right customer/client.
- The recalled memory changes the workflow outcome.
- The user can inspect provenance and relevance.
- A new memory is written back after the workflow completes.

That makes Mem0 central to the product experience, not a hidden backend detail.

### Keep The Scope Tight

For the hackathon, keep Close Memory focused on four remembered facts:

- Supplier coding.
- Tax treatment.
- Exception resolution.
- Approver history.

Do not expand into generic chat history, broad document memory, or all ERP settings during the prize build. Those are useful later, but they dilute the demo. The prize story is won when a known supplier moves from review to ready faster because Kira remembered the last close.

### Demo Script Priority

The demo should spend most of its time on one supplier.

Recommended sequence:

1. Show the bill blocked or incomplete.
2. Click **Recall context**.
3. Show Mem0 result, score, and exact prior close detail.
4. Apply coding.
5. Watch the blocker disappear.
6. Approve/export.
7. Recall again to prove write-back.

Avoid presenting memory as a background automation only. The judge needs to see the recall and write-back loop.

### Product Positioning

Position this as:

> Kira is the accounting close workspace that learns the client's operating memory month by month.

That is more specific and defensible than "AI accounting platform with memory." It also maps tightly to the prize language: customer history, team knowledge, useful context over time.

### Implementation Discipline

Build this as an additive layer over the existing ERP close flow.

- Do not rewrite the close-book state model for the hackathon.
- Do not make Mem0 a hard dependency for approval/export.
- Keep local fallback deterministic.
- Keep exact ERP mappings in structured metadata.
- Keep displayed UI labels operational and finance-native.

The fallback is not just a developer convenience. It protects the live demo. If hosted Mem0 credentials, network, or SDK behavior fail during judging, Kira should still show the same memory workflow with `Local memory` provenance.

### What To Avoid

- Do not rely on an LLM to extract account codes back out of memory text.
- Do not make the user type a chat prompt to use the feature.
- Do not hide Mem0; show `Powered by Mem0` when hosted recall is active.
- Do not overbuild dashboards before the core recall/apply/write-back loop is excellent.
- Do not let memory suggestions bypass existing approval and exception controls.

### Build Order I Would Use

1. Local fallback store and seed data.
2. Recall API route.
3. Sidebar memory panel.
4. Apply suggested coding.
5. Approval/export write-back.
6. Hosted Mem0 integration.
7. Demo script update.

This order gives an end-to-end demo early, then upgrades the backend to hosted Mem0 without changing the visible flow.

### Success Criteria

The feature is hackathon-ready when a judge can understand this in under 30 seconds:

> Kira remembers how this client handled this supplier last month, applies that memory to this month's bill, and records the new decision for next month.

Everything else should support that moment.
