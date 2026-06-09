import * as db from "@/lib/data/store";
import { fmtDate } from "@/lib/format";
import { money } from "@/lib/format";
import type { DocStatus } from "@/lib/types";
import { Badge, Card, CardHeader, ConfidenceChip, PageHeader } from "@/components/ui";
import { Thumb } from "@/components/thumb";
import { CaptureBox } from "@/components/capture-client";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

const STATUS: Record<DocStatus, { label: string; variant: "pos" | "warn" | "neutral" | "crit" }> = {
  confirmed: { label: "confirmed", variant: "pos" },
  needs_review: { label: "needs review", variant: "warn" },
  extracted: { label: "extracted", variant: "neutral" },
  rejected: { label: "rejected", variant: "crit" },
};

export const metadata = { title: "Capture · Kira" };

export default function CapturePage() {
  const rs = db.receiptStats();
  const inbox = [...db.RECEIPTS].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Capture"
        description="Snap a receipt or forward a supplier invoice. Document AI extracts the fields, suggests a GST/SST code, and auto-matches to the bank line. Low-confidence items wait for you."
        actions={
          <div className="flex gap-2">
            <Badge variant="pos">{rs.confirmed} confirmed</Badge>
            <Badge variant="warn">{rs.review} in review</Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <CaptureBox />
          <DisclaimerBanner variant="tax" />
        </div>

        <Card pad={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Inbox" subtitle={`${inbox.length} captured documents`} icon="capture" />
          </div>
          <div className="divide-y divide-border">
            {inbox.map((r) => {
              const acc = db.account(r.suggestedAccount);
              const tc = db.taxCode(r.suggestedTaxCode);
              const st = STATUS[r.status];
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/40">
                  <Thumb hint={r.thumbHint} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-ink">{r.supplier}</span>
                      <Badge variant="neutral">{r.kind}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {r.docNo} · {fmtDate(r.docDate)} · via {r.capturedVia}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {acc && <Badge variant="neutral">{acc.code} · {acc.name.split(" — ")[0]}</Badge>}
                      {tc && (
                        <Badge variant={tc.rate > 0 ? "info" : "neutral"}>
                          {tc.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="tnum text-[13.5px] font-semibold text-ink">{money(r.totalMinor, r.currency)}</span>
                    <ConfidenceChip value={r.ocrConfidence} showWord={false} />
                    <Badge variant={st.variant} dot>
                      {st.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
