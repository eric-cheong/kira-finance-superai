import * as db from "@/lib/data/store";
import { fmtDate, money } from "@/lib/format";
import type { EInvoice, EInvoiceState } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Icon,
  KeyValue,
  PageHeader,
  StatTile,
} from "@/components/ui";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export const metadata = { title: "E-invoicing · Kira" };

const STATE: Record<EInvoiceState, { label: string; variant: "pos" | "info" | "warn" | "neutral" | "crit" }> = {
  validated: { label: "validated", variant: "pos" },
  submitted: { label: "submitted", variant: "info" },
  queued: { label: "queued", variant: "warn" },
  draft: { label: "draft", variant: "neutral" },
  rejected: { label: "rejected", variant: "crit" },
  cancelled: { label: "cancelled", variant: "neutral" },
};

function Row({ e }: { e: EInvoice }) {
  const st = STATE[e.state];
  const needsAction = e.state === "queued" || e.state === "draft" || e.state === "rejected";
  return (
    <div className="px-5 py-4 hover:bg-surface-2/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={e.channel === "MyInvois" ? "brand" : "info"}>{e.channel}</Badge>
            <Badge variant="neutral">{e.direction}</Badge>
            <Badge variant={st.variant} dot>
              {st.label}
            </Badge>
          </div>
          <h3 className="mt-2 text-[14.5px] font-semibold text-ink">{e.counterparty}</h3>
          <p className="text-[12px] text-muted">
            {e.counterpartyId && <>TIN {e.counterpartyId} · </>}issued {fmtDate(e.issueDate)}
          </p>

          {e.uuid && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
              <Icon name="lock" size={12} className="text-faint" />
              <span className="tnum">{e.uuid}</span>
              {e.qrHint && <span className="rounded bg-surface-2 px-1.5 py-px text-[10px] text-faint">QR ✓</span>}
            </p>
          )}
          {e.validationResponse && (
            <p className="mt-1 text-[11.5px] italic text-pos-fg">{e.validationResponse}</p>
          )}
          {e.rejectionReason && (
            <p className="mt-1.5 flex items-start gap-1.5 rounded-md border border-crit-fg/20 bg-crit-bg px-2 py-1.5 text-[11.5px] text-crit-fg">
              <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
              {e.rejectionReason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="tnum text-[15px] font-semibold text-ink">{money(e.grossMinor, e.currency)}</span>
          <span className="tnum text-[11px] text-faint">
            net {money(e.netMinor, e.currency)} · tax {money(e.taxMinor, e.currency)}
          </span>
          {needsAction &&
            (e.state === "rejected" ? (
              <Button size="sm" variant="outline" icon="arrowRight" href="/approvals">
                Correct & resubmit
              </Button>
            ) : (
              <Button size="sm" variant="outline" icon="approvals" href="/approvals">
                Submit · needs approval
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const s = db.einvoiceStats();
  const list = [...db.EINVOICES].sort((a, b) => {
    const order: EInvoiceState[] = ["rejected", "queued", "draft", "submitted", "validated", "cancelled"];
    return order.indexOf(a.state) - order.indexOf(b.state);
  });
  const my = db.COUNTRY_CONFIGS.find((c) => c.country === "MY");
  const sg = db.COUNTRY_CONFIGS.find((c) => c.country === "SG");

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="E-invoicing compliance"
        description="Outbound and inbound e-invoices across LHDN MyInvois (Malaysia) and Peppol / InvoiceNow (Singapore). Submission is a tier-3 action requiring explicit approval; validation responses are stored for retention."
        badge={<Badge variant="brand" dot>MyInvois Phase 2</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Validated" value={s.validated} icon="check" tone="pos" />
        <StatTile label="Submitted" value={s.submitted} icon="arrowUpRight" tone="info" />
        <StatTile label="Queued" value={s.queued} icon="clock" tone="warn" />
        <StatTile label="Draft" value={s.draft} icon="doc" tone="neutral" />
        <StatTile label="Rejected" value={s.rejected} icon="alert" tone="crit" />
        <StatTile label="Total" value={s.total} icon="compliance" tone="neutral" />
      </div>

      <DisclaimerBanner variant="tax" />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card pad={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Invoice queue" subtitle="Ordered by action priority" icon="compliance" />
          </div>
          <div className="divide-y divide-border">
            {list.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </div>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Malaysia" subtitle="Country config · metadata" icon="bank" />
            <KeyValue k="Channel" v={my?.eInvoiceChannel ?? "Not configured"} />
            <KeyValue k="Schema" v={my?.eInvoiceSchema ?? "—"} />
            <KeyValue k="Regulator" v={my?.regulator ?? "—"} />
            <KeyValue k="Tax model" v="SST 8%" />
          </Card>
          <Card>
            <CardHeader title="Singapore" subtitle="Country config · metadata" icon="bank" />
            <KeyValue k="Channel" v={sg?.eInvoiceChannel ?? "Not configured"} />
            <KeyValue k="Schema" v={sg?.eInvoiceSchema ?? "—"} />
            <KeyValue k="Regulator" v={sg?.regulator ?? "—"} />
            <KeyValue k="Tax model" v="GST 9%" />
          </Card>
          <Card>
            <CardHeader title="Retention" icon="lock" />
            <p className="text-[12px] leading-relaxed text-muted">
              Every submission stores its validation response and UUID/QR. Documents are retained per LHDN/IRAS rules; the audit trail is immutable and hash-chained.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
