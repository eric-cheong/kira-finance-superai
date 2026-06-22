import { Badge, Card } from "@/components/ui";
import { InboxWorkflowButton } from "@/components/inbox-workflow-button";
import { state } from "@/lib/backend/state";
import { formatBillAmount } from "@/lib/erp-close";

export const metadata = { title: "Invoice Inbox · Kira" };

const CHANNEL_VARIANT = {
  email: "info",
  whatsapp: "brand",
  upload: "neutral",
} as const;

export default function InboxPage() {
  const sourceDocuments = state.sourceDocuments;
  const bills = state.closeBookRecords.filter((record) => record.id.startsWith("bill_live"));
  const replayCount = state.webhookEvents.reduce((sum, event) => sum + event.replayCount, 0);

  return (
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Source docs</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{sourceDocuments.length}</p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Email</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{sourceDocuments.filter((doc) => doc.channel === "email").length}</p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">WhatsApp</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{sourceDocuments.filter((doc) => doc.channel === "whatsapp").length}</p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Webhook replays</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{replayCount}</p>
          </Card>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-brand">Live local demo</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Invoice Inbox</h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
                This queue is powered by real local webhook intake, local document storage, idempotency, and the local invoice state machine. It does not need Supabase metadata yet.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[12px] text-muted">
              Local storage: <span className="font-semibold text-ink">.kira-data/documents</span>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-[13px]">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-faint">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Bill</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted">
                      No live invoices yet. Start ngrok, point Postmark or Meta WhatsApp at the webhook, then send a test document.
                    </td>
                  </tr>
                )}
                {bills.map((bill) => {
                  const doc = sourceDocuments.find((item) => item.id === bill.intake.id);
                  return (
                    <tr key={bill.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{bill.intake.filename ?? bill.intake.subject ?? bill.id}</div>
                        <div className="mt-1 max-w-[280px] truncate text-[12px] text-faint">{doc?.sha256 ?? bill.intake.storageRef}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={CHANNEL_VARIANT[bill.intake.channel]}>{bill.intake.channel}</Badge>
                        <div className="mt-1 text-[12px] text-muted">{bill.intake.from}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{bill.id}</div>
                        <div className="text-[12px] text-muted">{bill.supplierName ?? "Pending supplier"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={bill.status === "needs_review" ? "warn" : bill.status === "ready" ? "pos" : "neutral"}>{bill.status}</Badge>
                        {bill.exceptions.length > 0 && <div className="mt-1 text-[12px] text-crit-fg">{bill.exceptions[0].message}</div>}
                      </td>
                      <td className="px-4 py-3 text-ink">{formatBillAmount(bill)}</td>
                      <td className="px-4 py-3"><InboxWorkflowButton billId={bill.id} status={bill.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
  );
}
