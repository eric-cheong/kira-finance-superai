import {
  Amount,
  Badge,
  Bar,
  Button,
  Card,
  CardHeader,
  ConfidenceChip,
  Divider,
  FinanceTableControlsScript,
  Icon,
  KeyValue,
  PageHeader,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";
import type { IconName } from "@/components/ui/icons";
import type { ReactNode } from "react";
import { CloseMemoryPanel } from "@/components/close-memory-panel";
import { ErpCloseExportActions } from "@/components/erp-close-actions";
import { SponsorIntelligencePanel } from "@/components/sponsor-intelligence-panel";
import { state } from "@/lib/backend/state";
import { memoryProviderReadiness } from "@/lib/backend/provider-config";
import { fmtDate, fmtDateTime, money, relativeTo, shortId } from "@/lib/format";
import {
  criticalConfidence,
  describeExportBlockers,
  formatBillAmount,
  formatCloseBookStatus,
  formatExceptionType,
  getExportBlockers,
  getUnresolvedExceptions,
  getWorkflowDashboard,
  type CloseBookExceptionType,
  type CloseBookStatus,
  type ExportBlockReasonCode,
  type IntakeChannel,
  type SupplierStatementState,
  type VerifiedBillRecord,
} from "@/lib/erp-close";

export const metadata = { title: "ERP Close · Kira" };

type Tone = "neutral" | "pos" | "warn" | "crit" | "info" | "brand";
interface WorkflowCard {
  label: string;
  owner: string;
  icon: IconName;
  status: CloseBookStatus;
  count: number;
  detail: string;
}

const NOW = "2026-06-09T09:12:00+08:00";

// The page reads the mutable backend store; static prerender caches HTML
// against a stale snapshot and desyncs it from the fresh RSC payload.
export const dynamic = "force-dynamic";

const tableControlClass =
  "h-11 w-full rounded-lg border border-border bg-surface-2/65 px-3 text-[13px] text-ink outline-none transition placeholder:text-faint hover:border-border-strong focus:border-brand/50 sm:h-10";

function closeBookRecords() {
  return state.closeBookRecords;
}

function closeBookDashboard() {
  return getWorkflowDashboard(closeBookRecords());
}

function activeCloseBookClient() {
  return state.closeBookClients[0];
}

// Refreshed at the top of ErpClosePage on every render — a one-time module
// snapshot goes stale against the mutable store and desyncs render passes.
let records = closeBookRecords();
let dashboard = closeBookDashboard();
let activeClient = activeCloseBookClient();

const STATUS_TONE: Record<CloseBookStatus, Tone> = {
  received: "neutral",
  extracted: "info",
  needs_review: "warn",
  ready: "pos",
  approved: "brand",
  exported: "info",
};

const EXCEPTION_TONE: Record<CloseBookExceptionType, Tone> = {
  missing_tax_id: "crit",
  duplicate_risk: "crit",
  math_mismatch: "crit",
  new_supplier: "warn",
  low_confidence: "warn",
  unreadable_scan: "crit",
};

const CHANNEL_LABEL: Record<IntakeChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  upload: "Upload",
};

const STATEMENT_TONE: Record<SupplierStatementState, Tone> = {
  matched: "pos",
  variance: "warn",
  not_found: "crit",
};

const BLOCKER_COPY: Record<ExportBlockReasonCode, string> = {
  math_failed: "Correct invoice math",
  duplicate_unresolved: "Resolve duplicate risk",
  missing_required_field: "Add missing field",
  critical_confidence_low: "Review low-confidence fields",
  tax_treatment_unresolved: "Resolve tax treatment",
  erp_mapping_missing: "Complete ERP/LHDN mapping",
  approval_required: "Collect approval",
  already_exported: "Already exported",
};

function supplierFor(record: VerifiedBillRecord) {
  return state.closeBookSuppliers.find((supplier) => supplier.id === record.supplierId);
}

function clientFor(record: VerifiedBillRecord) {
  return state.closeBookClients.find((client) => client.id === record.clientId);
}

function recordOwner(record: VerifiedBillRecord) {
  return record.approval.approver ?? record.approval.requestedBy ?? "Close owner";
}

function workflowProgress(status: CloseBookStatus) {
  if (status === "exported") return 100;
  if (status === "approved") return 88;
  if (status === "ready") return 76;
  if (status === "needs_review") return 46;
  if (status === "extracted") return 32;
  return 18;
}

function totalValue(recordsToSum: readonly VerifiedBillRecord[]) {
  return recordsToSum.reduce((sum, record) => sum + (record.totalMinor ?? 0), 0);
}

function lineCount(label: string, value: number, tone: Tone = "neutral") {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-[11.5px] text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "crit" ? "bg-crit-fg" : tone === "warn" ? "bg-warn-fg" : tone === "pos" ? "bg-pos-fg" : tone === "info" ? "bg-info-fg" : tone === "brand" ? "bg-brand" : "bg-faint"}`} />
      {label}
      <span className="tnum font-semibold text-ink">{value}</span>
    </span>
  );
}

function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function StatusBadge({ status }: { status: CloseBookStatus }) {
  return (
    <Badge variant={STATUS_TONE[status]} dot>
      {formatCloseBookStatus(status)}
    </Badge>
  );
}

function WorkflowHub() {
  const supplierIssues = records.filter((record) => record.supplierStatementMatch?.state !== "matched").length;
  const bankIssues = records.filter((record) => record.bankMatch?.state !== "matched").length;
  const auditEvents = records.reduce((sum, record) => sum + record.auditTrail.length, 0);
  const workflows: WorkflowCard[] = [
    {
      label: "Invoice intake",
      owner: "Intake desk",
      icon: "capture",
      status: dashboard.statusCounts.received + dashboard.statusCounts.extracted > 0 ? "extracted" : "ready",
      count: dashboard.channelCounts.whatsapp + dashboard.channelCounts.email + dashboard.channelCounts.upload,
      detail: `${dashboard.channelCounts.whatsapp} WhatsApp · ${dashboard.channelCounts.email} email · ${dashboard.channelCounts.upload} upload`,
    },
    {
      label: "Supplier reconciliation",
      owner: "Supplier ops",
      icon: "search",
      status: supplierIssues > 0 ? "needs_review" : "ready",
      count: supplierIssues,
      detail: "Statement variances and missing supplier evidence",
    },
    {
      label: "Chase intelligence",
      owner: "Client service",
      icon: "bell",
      status: dashboard.approvalQueue.length > 0 ? "needs_review" : "ready",
      count: dashboard.approvalQueue.length,
      detail: "Approval, TIN, PDF, and supplier-master chases",
    },
    {
      label: "Bank reconciliation",
      owner: "Bank ops",
      icon: "bank",
      status: bankIssues > 0 ? "needs_review" : "ready",
      count: bankIssues,
      detail: "Suggested or unmatched bank evidence",
    },
    {
      label: "ERP/LHDN submission",
      owner: "Amir Hafiz",
      icon: "lock",
      status: dashboard.closeReadiness.blockedRecords > 0 ? "needs_review" : "ready",
      count: dashboard.readyForExport.length,
      detail: `${activeClient.erp} AP export plus MyInvois support pack`,
    },
    {
      label: "Audit Trail",
      owner: "Audit desk",
      icon: "audit",
      status: "exported",
      count: auditEvents,
      detail: "Hash-style event trail across Bill Records",
    },
  ];

  return (
    <Card pad={false}>
      <div className="border-b border-border px-5 pt-5">
        <CardHeader title="Workflow hub" subtitle="Close-book stages with owner, status, and remaining work" icon="spark" />
      </div>
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
        {workflows.map((workflow) => {
          const tone = STATUS_TONE[workflow.status];
          return (
            <div key={workflow.label} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon name={workflow.icon} size={15} className="text-faint" />
                    <span className="text-[13px] font-semibold text-ink">{workflow.label}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">{workflow.owner}</div>
                </div>
                <StatusBadge status={workflow.status} />
              </div>
              <p className="mt-3 min-h-8 text-[12px] leading-relaxed text-muted">{workflow.detail}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Bar value={workflowProgress(workflow.status)} tone={tone} />
                <span className="tnum shrink-0 text-[12px] font-semibold text-ink">{workflow.count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ExceptionQueue() {
  const blocked = dashboard.blockedRecords.filter(({ reasons }) =>
    reasons.some((reason) => reason.code !== "already_exported"),
  );

  return (
    <section>
      <SectionTitle
        title="Exception-first review queue"
        subtitle="Every blocked Bill Record shows exact export blockers, owner, evidence, confidence, and next action."
        right={<Badge variant="crit" dot>{blocked.length} blocked records</Badge>}
      />
      <div className="space-y-3">
        {blocked.map(({ record, reasons }) => {
          const unresolved = getUnresolvedExceptions(record);
          const firstReason = reasons.find((reason) => reason.code !== "already_exported") ?? reasons[0];
          const tone = unresolved.some((exception) => exception.severity === "critical") ? "crit" : "warn";
          return (
            <Card key={record.id} className={`border-l-4 ${tone === "crit" ? "border-l-crit-fg" : "border-l-warn-fg"}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={tone}>Export blocked</Badge>
                    <StatusBadge status={record.status} />
                    <span className="tnum text-[12px] text-faint">Bill Record {record.id}</span>
                    {record.invoiceNumber && <span className="tnum text-[12px] text-faint">{record.invoiceNumber}</span>}
                  </div>
                  <h3 className="mt-2 text-[14px] font-semibold text-ink">{record.supplierName ?? "Unknown supplier"}</h3>
                  <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-ink-2">
                    <span className="font-medium text-ink">Next action:</span> {BLOCKER_COPY[firstReason.code]}.
                    {" "}
                    {firstReason.message}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unresolved.map((exception) => (
                      <Badge key={`${record.id}-${exception.type}`} variant={EXCEPTION_TONE[exception.type]}>
                        {formatExceptionType(exception.type)}
                      </Badge>
                    ))}
                    {record.intake.filename && <Badge variant="neutral">{record.intake.filename}</Badge>}
                    <Badge variant="neutral">{CHANNEL_LABEL[record.intake.channel]}</Badge>
                  </div>
                </div>
                <div className="grid w-full shrink-0 gap-2 text-[12px] sm:grid-cols-2 lg:w-[320px] lg:grid-cols-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">Amount</span>
                    <Amount className="font-semibold text-ink">{formatBillAmount(record)}</Amount>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">Critical confidence</span>
                    <ConfidenceChip value={criticalConfidence(record)} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">Owner</span>
                    <span className="font-medium text-ink">{recordOwner(record)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">Received</span>
                    <span className="tnum text-ink">{fmtDateTime(record.intake.receivedAt)}</span>
                  </div>
                </div>
              </div>
              <Divider className="my-3" />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {reasons
                    .filter((reason) => reason.code !== "already_exported")
                    .slice(0, 3)
                    .map((reason) => (
                      <Badge key={`${record.id}-${reason.code}`} variant={reason.code === "approval_required" ? "warn" : "crit"}>
                        {BLOCKER_COPY[reason.code]}
                      </Badge>
                    ))}
                </div>
                <Button className="w-full sm:w-auto" variant="outline" size="sm" icon="arrowRight">
                  Open Bill Record
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function BillRegister() {
  return (
    <section data-finance-table data-storage-key="erp-close-bill-register" data-default-sort="date:desc">
      <FinanceTableControlsScript />
      <SectionTitle
        title="Verified Bills"
        subtitle="Table-first close queue with status, source, SST/TIN/MSIC, confidence, evidence, and ERP/LHDN gate."
        right={
          <div className="flex flex-wrap gap-1.5">
            {lineCount("Ready", dashboard.statusCounts.ready, "pos")}
            {lineCount("Approved", dashboard.statusCounts.approved, "brand")}
            {lineCount("Needs review", dashboard.statusCounts.needs_review, "warn")}
          </div>
        }
      />
      <div className="mb-3 grid gap-2 rounded-lg border border-border bg-surface px-3 py-3 lg:grid-cols-[minmax(220px,1fr)_150px_140px_150px_170px_auto]">
        <label className="relative min-w-0">
          <span className="sr-only">Search bill register</span>
          <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            data-finance-search
            className={`${tableControlClass} pl-9`}
            placeholder="Search supplier, bill, tax ID, owner"
            type="search"
          />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filter bill status</span>
          <select data-finance-filter="status" className={tableControlClass} defaultValue="all">
            <option value="all">All statuses</option>
            <option value="needs_review">Needs review</option>
            <option value="ready">Ready</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filter source</span>
          <select data-finance-filter="channel" className={tableControlClass} defaultValue="all">
            <option value="all">All sources</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="upload">Upload</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filter ERP gate</span>
          <select data-finance-filter="gate" className={tableControlClass} defaultValue="all">
            <option value="all">All gates</option>
            <option value="exportable">Exportable</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Sort bill register</span>
          <select data-finance-sort className={tableControlClass} defaultValue="date:desc">
            <option value="date:desc">Newest received</option>
            <option value="date:asc">Oldest received</option>
            <option value="amount:desc">Amount high</option>
            <option value="amount:asc">Amount low</option>
            <option value="confidence:asc">Lowest confidence</option>
            <option value="supplier:asc">Supplier A-Z</option>
            <option value="status:asc">Status</option>
          </select>
        </label>
        <button
          type="button"
          data-finance-reset
          className="btn-lift inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-[13px] font-medium text-ink shadow-card transition hover:border-border-strong hover:bg-surface-2/60 disabled:pointer-events-none disabled:opacity-50 sm:h-10 sm:min-h-10"
        >
          Reset
        </button>
        <div className="lg:col-span-6 flex items-center gap-2 text-[12px] text-muted">
          <span className="tnum font-semibold text-ink" data-finance-visible-count>{records.length}</span>
          <span>of</span>
          <span className="tnum">{records.length}</span>
          <span>Bill Records shown</span>
        </div>
      </div>
      <div className="space-y-3 md:hidden" data-finance-row-list>
        {records.map((record) => {
          const supplier = supplierFor(record);
          const blockers = getExportBlockers(record).filter((reason) => reason.code !== "already_exported");
          const client = clientFor(record);
          const gate = blockers.length === 0 ? "exportable" : "blocked";
          const search = [
            record.id,
            record.invoiceNumber ?? "",
            record.supplierName ?? "Unknown supplier",
            client?.tradingName ?? "Client",
            recordOwner(record),
            record.supplierTin ?? supplier?.tin ?? "",
            supplier?.msic ?? client?.msic ?? "",
            record.erpMapping?.taxCode ?? "",
            CHANNEL_LABEL[record.intake.channel],
            formatCloseBookStatus(record.status),
          ].join(" ");
          return (
            <Card
              key={`mobile-${record.id}`}
              className="space-y-3"
              data-finance-row
              data-row-id={record.id}
              data-search={search}
              data-status={record.status}
              data-channel={record.intake.channel}
              data-gate={gate}
              data-date={record.intake.receivedAt}
              data-amount={record.totalMinor ?? 0}
              data-confidence={criticalConfidence(record)}
              data-supplier={record.supplierName ?? "Unknown supplier"}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={record.status} />
                    <Badge variant={record.intake.channel === "whatsapp" ? "brand" : record.intake.channel === "email" ? "info" : "neutral"}>
                      {CHANNEL_LABEL[record.intake.channel]}
                    </Badge>
                  </div>
                  <h3 className="mt-2 truncate text-[14px] font-semibold text-ink">{record.supplierName ?? "Unknown supplier"}</h3>
                  <p className="mt-0.5 text-[12px] text-muted">
                    <span className="tnum">{record.id}</span> · {record.invoiceNumber ?? "missing invoice no."}
                  </p>
                </div>
                <Amount className="shrink-0 text-right text-[14px] font-semibold text-ink">{formatBillAmount(record)}</Amount>
              </div>
              <div className="grid gap-2 text-[12px]">
                <KeyValue k="Client / owner" v={`${client?.tradingName ?? "Client"} · ${recordOwner(record)}`} />
                <KeyValue k="Received" v={<span className="tnum">{fmtDate(record.intake.receivedAt)}</span>} />
                <KeyValue k="Tax identity" v={`TIN ${record.supplierTin ?? supplier?.tin ?? "missing"} · MSIC ${supplier?.msic ?? client?.msic ?? "missing"}`} />
                <KeyValue k="Confidence" v={<ConfidenceChip value={criticalConfidence(record)} showWord={false} />} />
                <KeyValue k="Bank score" v={<span className="tnum">{record.bankMatch?.score ?? 0}%</span>} />
              </div>
              <div className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                {blockers.length === 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="pos" dot>exportable</Badge>
                    <span className="text-[12px] text-muted">{record.erpMapping?.destination ?? client?.erp} ready</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Badge variant="crit" dot>{blockers.length} blockers</Badge>
                    <p className="text-[12px] leading-relaxed text-muted">{blockers[0]?.message}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <Card pad={false} className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Status</Th>
              <Th>Bill Record</Th>
              <Th>Supplier</Th>
              <Th>Source</Th>
              <Th>SST / TIN / MSIC</Th>
              <Th>Confidence</Th>
              <Th>ERP/LHDN Gate</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody data-finance-row-list>
            {records.map((record) => {
              const supplier = supplierFor(record);
              const blockers = getExportBlockers(record).filter((reason) => reason.code !== "already_exported");
              const client = clientFor(record);
              const gate = blockers.length === 0 ? "exportable" : "blocked";
              const search = [
                record.id,
                record.invoiceNumber ?? "",
                record.supplierName ?? "Unknown supplier",
                client?.tradingName ?? "Client",
                recordOwner(record),
                record.supplierTin ?? supplier?.tin ?? "",
                supplier?.msic ?? client?.msic ?? "",
                record.erpMapping?.taxCode ?? "",
                CHANNEL_LABEL[record.intake.channel],
                formatCloseBookStatus(record.status),
              ].join(" ");
              return (
                <tr
                  key={record.id}
                  className="transition hover:bg-surface-2/40"
                  data-finance-row
                  data-row-id={record.id}
                  data-search={search}
                  data-status={record.status}
                  data-channel={record.intake.channel}
                  data-gate={gate}
                  data-date={record.intake.receivedAt}
                  data-amount={record.totalMinor ?? 0}
                  data-confidence={criticalConfidence(record)}
                  data-supplier={record.supplierName ?? "Unknown supplier"}
                >
                  <Td>
                    <StatusBadge status={record.status} />
                  </Td>
                  <Td>
                    <div className="tnum font-semibold text-ink">{record.id}</div>
                    <div className="tnum text-[12px] text-faint">{record.invoiceNumber ?? "missing invoice no."}</div>
                  </Td>
                  <Td>
                    <div className="max-w-[220px] truncate font-medium text-ink">{record.supplierName ?? "Unknown supplier"}</div>
                    <div className="text-[12px] text-muted">{client?.tradingName ?? "Client"} · {recordOwner(record)}</div>
                  </Td>
                  <Td>
                    <Badge variant={record.intake.channel === "whatsapp" ? "brand" : record.intake.channel === "email" ? "info" : "neutral"}>
                      {CHANNEL_LABEL[record.intake.channel]}
                    </Badge>
                    <div className="mt-1 whitespace-nowrap text-[12px] text-faint">{fmtDate(record.intake.receivedAt)}</div>
                  </Td>
                  <Td>
                    <div className="space-y-0.5 text-[12px] text-muted">
                      <div>{record.erpMapping?.taxCode ?? "tax code missing"}</div>
                      <div>TIN {record.supplierTin ?? supplier?.tin ?? "missing"}</div>
                      <div>MSIC {supplier?.msic ?? client?.msic ?? "missing"}</div>
                    </div>
                  </Td>
                  <Td>
                    <ConfidenceChip value={criticalConfidence(record)} showWord={false} />
                    <div className="mt-1 text-[12px] text-faint">bank {record.bankMatch?.score ?? 0}%</div>
                  </Td>
                  <Td>
                    {blockers.length === 0 ? (
                      <Badge variant="pos" dot>exportable</Badge>
                    ) : (
                      <Badge variant="crit" dot>{blockers.length} blockers</Badge>
                    )}
                    <div className="mt-1 max-w-[220px] truncate text-[12px] text-muted">
                      {blockers[0]?.message ?? `${record.erpMapping?.destination ?? client?.erp} ready`}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <Amount className="font-semibold text-ink">{formatBillAmount(record)}</Amount>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      <div data-finance-empty hidden className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-[13px] text-muted">
        No Bill Records match the current controls.
      </div>
    </section>
  );
}

function SupplierReconciliation() {
  const rows = records.filter((record) => record.supplierStatementMatch);
  return (
    <section>
      <SectionTitle title="Supplier reconciliation" subtitle="Supplier statement tie-out against Bill Records and bank evidence." />
      <div className="space-y-3 md:hidden">
        {rows.map((record) => {
          const match = record.supplierStatementMatch!;
          const blockers = describeExportBlockers(record).filter((message) => !message.includes("already"));
          return (
            <Card key={`mobile-${record.id}-${match.statementId}`} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-semibold text-ink">{record.supplierName ?? "Unknown supplier"}</h3>
                  <p className="tnum mt-0.5 text-[12px] text-muted">{match.statementId} · {fmtDate(match.statementDate)}</p>
                </div>
                <Badge variant={STATEMENT_TONE[match.state]} dot>{match.state.replace("_", " ")}</Badge>
              </div>
              <div className="grid gap-2 text-[12px]">
                <KeyValue k="Variance" v={<span className="tnum">{money(match.varianceMinor, record.currency ?? "MYR", { sign: true })}</span>} />
                <KeyValue k="Matched invoices" v={match.matchedInvoiceRefs.join(", ") || "none"} />
              </div>
              <div className="rounded-lg border border-border bg-surface-2/45 px-3 py-2 text-[12px] leading-relaxed text-muted">
                {blockers[0] ?? match.note}
              </div>
            </Card>
          );
        })}
      </div>
      <Card pad={false} className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Supplier</Th>
              <Th>Statement</Th>
              <Th>Status</Th>
              <Th className="text-right">Variance</Th>
              <Th>Matched invoices</Th>
              <Th>Next action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => {
              const match = record.supplierStatementMatch!;
              const blockers = describeExportBlockers(record).filter((message) => !message.includes("already"));
              return (
                <tr key={`${record.id}-${match.statementId}`} className="transition hover:bg-surface-2/40">
                  <Td>
                    <div className="font-medium text-ink">{record.supplierName ?? "Unknown supplier"}</div>
                    <div className="tnum text-[12px] text-muted">{match.statementId}</div>
                  </Td>
                  <Td className="whitespace-nowrap tnum text-[12px] text-muted">{fmtDate(match.statementDate)}</Td>
                  <Td>
                    <Badge variant={STATEMENT_TONE[match.state]} dot>{match.state.replace("_", " ")}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <span className={`tnum font-semibold ${match.varianceMinor === 0 ? "text-pos-fg" : "text-warn-fg"}`}>
                      {money(match.varianceMinor, record.currency ?? "MYR", { sign: true })}
                    </span>
                  </Td>
                  <Td className="max-w-[220px] text-[12px] text-muted">{match.matchedInvoiceRefs.join(", ") || "none"}</Td>
                  <Td className="max-w-[320px] text-[12px] text-muted">{blockers[0] ?? match.note}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}

function ChaseIntelligence() {
  const chaseRecords = records.filter(
    (record) => record.approval.state === "pending" || getUnresolvedExceptions(record).length > 0,
  );
  return (
    <Card>
      <CardHeader title="Chase intelligence" subtitle="WhatsApp, email, and owner follow-ups" icon="bell" />
      <div className="space-y-3">
        {chaseRecords.slice(0, 5).map((record) => {
          const firstException = getUnresolvedExceptions(record)[0];
          return (
            <div key={`chase-${record.id}`} className="rounded-lg border border-border bg-surface-2/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">{record.supplierName ?? "Unknown supplier"}</div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {CHANNEL_LABEL[record.intake.channel]} · {relativeTo(record.intake.receivedAt, NOW)} · {recordOwner(record)}
                  </div>
                </div>
                <ConfidenceChip value={criticalConfidence(record)} showWord={false} />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
                {firstException?.message ?? record.approval.note ?? "Approval is pending before ERP/LHDN export."}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BankReconciliation() {
  const rows = records.filter((record) => record.bankMatch);
  return (
    <section>
      <SectionTitle title="Bank reconciliation" subtitle="Read-only bank evidence and match basis for each Bill Record." />
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.slice(0, 6).map((record) => {
          const match = record.bankMatch!;
          const tone = match.state === "matched" ? "pos" : match.state === "suggested" ? "warn" : "crit";
          return (
            <Card key={`bank-${record.id}`}>
              <CardHeader
                title={match.accountRef}
                subtitle={`${record.supplierName ?? "Unknown supplier"} · ${record.invoiceNumber ?? record.id}`}
                icon="bank"
                right={<Badge variant={tone}>{match.state}</Badge>}
              />
              <Bar value={match.score} tone={tone} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <KeyValue k="Score" v={<span className="tnum">{match.score}%</span>} />
                <KeyValue k="Amount" v={match.amountMinor ? money(match.amountMinor, match.currency ?? "MYR") : "missing"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {match.basis.slice(0, 3).map((basis) => (
                  <Badge key={`${record.id}-${basis}`} variant="neutral">{basis}</Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function SubmissionGate() {
  const gateRows = records
    .filter((record) => record.status !== "exported")
    .map((record) => ({ record, blockers: getExportBlockers(record) }));

  return (
    <Card>
      <CardHeader title="ERP & LHDN submission gate" subtitle="Approval-gated export with per-record block reasons" icon="lock" />
      <div className="space-y-3">
        {gateRows.slice(0, 6).map(({ record, blockers }) => {
          const activeBlockers = blockers.filter((blocker) => blocker.code !== "already_exported");
          return (
            <div key={`gate-${record.id}`} className="flex items-start gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
              <span className={`mt-1 h-2 w-2 rounded-full ${activeBlockers.length === 0 ? "bg-pos-fg" : "bg-crit-fg"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tnum text-[13px] font-semibold text-ink">{record.id}</span>
                  <Badge variant={activeBlockers.length === 0 ? "pos" : "crit"}>
                    {activeBlockers.length === 0 ? "exportable" : `${activeBlockers.length} blockers`}
                  </Badge>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">
                  {activeBlockers[0]?.message ?? `${record.erpMapping?.destination ?? "ERP"} and LHDN package checks passed.`}
                </p>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-ink">{recordOwner(record)}</span>
            </div>
          );
        })}
      </div>
      <Divider className="my-4" />
      <div className="grid gap-2 text-[12.5px]">
        <KeyValue k="ERP language" v="AP bills, vendor mapping, GL/tax codes" />
        <KeyValue k="LHDN language" v="TIN, SST, MSIC, MyInvois support pack" />
        <KeyValue k="Approval boundary" v="Explicit approval before export" />
      </div>
    </Card>
  );
}

function AuditTrail() {
  const entries = records
    .flatMap((record) => record.auditTrail.map((entry) => ({ record, entry })))
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at))
    .slice(0, 10);

  return (
    <section>
      <SectionTitle title="Audit Trail / Invoice History" subtitle="Recent close activity for Bill Records." />
      <div className="space-y-0 md:hidden">
        {entries.map(({ record, entry }, index) => (
          <div key={`mobile-${entry.id}`} className="relative pl-5">
            <span className="absolute left-1 top-4 h-2 w-2 rounded-full bg-brand/55" />
            {index < entries.length - 1 && <span className="absolute bottom-0 left-[7px] top-6 w-px bg-border" />}
            <Card className="mb-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <span className="tnum">{fmtDateTime(entry.at)}</span>
                <span aria-hidden>·</span>
                <span>{entry.actor}</span>
                <Badge variant="neutral">Bill {record.id}</Badge>
              </div>
              <h3 className="text-[13px] font-semibold text-ink">{entry.action}</h3>
              <p className="text-[12px] leading-relaxed text-muted">{entry.detail}</p>
              <div className="tnum text-[12px] text-faint">{shortId(entry.id, 12)}</div>
            </Card>
          </div>
        ))}
      </div>
      <Card pad={false} className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Time</Th>
              <Th>Actor</Th>
              <Th>Bill Record</Th>
              <Th>Action</Th>
              <Th>Detail</Th>
              <Th>Event</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ record, entry }) => (
              <tr key={entry.id} className="transition hover:bg-surface-2/40">
                <Td className="whitespace-nowrap tnum text-[12px] text-muted">{fmtDateTime(entry.at)}</Td>
                <Td className="whitespace-nowrap text-[12px] font-medium text-ink">{entry.actor}</Td>
                <Td className="whitespace-nowrap tnum text-[12px] text-ink">{record.id}</Td>
                <Td className="whitespace-nowrap text-[12px] text-info-fg">{entry.action}</Td>
                <Td className="max-w-[420px] text-[12px] text-muted">{entry.detail}</Td>
                <Td className="whitespace-nowrap tnum text-[12px] text-faint">{shortId(entry.id, 12)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}

export default function ErpClosePage() {
  records = closeBookRecords();
  dashboard = closeBookDashboard();
  activeClient = activeCloseBookClient();
  const readiness = dashboard.closeReadiness;
  const blockerCount = dashboard.blockedRecords.filter(({ reasons }) =>
    reasons.some((reason) => reason.code !== "already_exported"),
  ).length;
  const totalRegisterValue = totalValue(records);
  const readyValue = totalValue(dashboard.readyForExport);
  const readyRecordIds = dashboard.readyForExport.map((record) => record.id);
  const closeMemoryBills = records
    .filter((record) => record.clientId === activeClient.id)
    .map((record) => {
      const supplier = supplierFor(record);
      const client = clientFor(record);
      const supplierName = record.supplierName ?? supplier?.legalName ?? "Unknown supplier";
      return {
        id: record.id,
        supplierId: record.supplierId,
        supplierName,
        query: `${supplierName} ${record.erpMapping?.taxCode ?? ""} ${record.erpMapping?.expenseAccountCode ?? ""} ${record.erpMapping?.costCentre ?? ""} ${client?.closePeriod ?? ""}`,
      };
    });
  const closeIntelligenceSuppliers = Array.from(
    new Map(closeMemoryBills.map((bill) => [bill.supplierId ?? bill.supplierName, {
      supplierId: bill.supplierId,
      supplierName: bill.supplierName,
      query: bill.query,
    }])).values(),
  );
  const memoryReadiness = memoryProviderReadiness();

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="ERP Close"
        description="Month-end close operations for Verified Bills, supplier tie-out, bank matching, and ERP/LHDN readiness. Built for finance owners working exceptions first."
        badge={<Badge variant={blockerCount > 0 ? "warn" : "pos"} dot>{blockerCount} blockers</Badge>}
        actions={
          <ErpCloseExportActions
            disabled={readyRecordIds.length === 0}
            destination={activeClient.erp}
            readyRecordIds={readyRecordIds}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[280px_repeat(4,minmax(0,1fr))]">
        <Card className="col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="check" size={18} className="text-brand" />
              <span className="text-[13px] font-semibold uppercase tracking-wide text-faint">Close readiness</span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="tnum text-4xl font-semibold text-ink">{readiness.score}%</span>
              <Badge variant={blockerCount > 0 ? "warn" : "pos"}>{blockerCount > 0 ? "review required" : "ready"}</Badge>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              {activeClient.closePeriod} · {activeClient.tradingName} · {activeClient.erp}
            </p>
          </div>
        </Card>
        <StatTile label="Verified Bills" value={readiness.totalRecords} sub={`${money(totalRegisterValue, "MYR", { compact: true })} register value`} icon="check" tone="brand" />
        <StatTile label="Needs review" value={dashboard.statusCounts.needs_review} sub={`${readiness.unresolvedCriticalExceptions} critical exceptions`} icon="alert" tone="warn" />
        <StatTile label="Exportable" value={dashboard.readyForExport.length} sub={money(readyValue, "MYR", { compact: true })} icon="arrowUpRight" tone="pos" />
        <StatTile label="Exported" value={dashboard.statusCounts.exported} sub={money(readiness.exportedValueMinor, readiness.currency, { compact: true })} icon="compliance" tone="info" />
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4 md:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">ERP batch</div>
            <div className="tnum mt-0.5 text-[14px] font-semibold text-ink">AP-{activeClient.closePeriod}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">LHDN package</div>
            <div className="mt-1">
              <Badge variant={blockerCount > 0 ? "warn" : "pos"}>{blockerCount > 0 ? "held" : "ready"}</Badge>
            </div>
          </div>
          <KeyValue k="TIN / MSIC" v={<span className="tnum">{activeClient.tin} · {activeClient.msic}</span>} />
          <KeyValue k="Last refresh" v={<span className="tnum">{fmtDateTime(NOW)}</span>} />
        </div>
        <Divider className="my-4" />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={blockerCount > 0 ? "warn" : "pos"} dot>Bulk export guard</Badge>
              <span className="text-[12px] font-medium text-ink">{activeClient.erp} ready-bill batch</span>
            </div>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">
              Export action is held until blocked records are cleared; evidence packs remain available for review.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="pos">{readyRecordIds.length} ready</Badge>
            <Badge variant={blockerCount > 0 ? "crit" : "pos"}>{blockerCount} held</Badge>
            <Badge variant="neutral">{readyRecordIds.slice(0, 3).join(", ") || "no ready records"}</Badge>
          </div>
        </div>
      </Card>

      <WorkflowHub />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <ExceptionQueue />
          <BillRegister />
          <SupplierReconciliation />
          <BankReconciliation />
          <AuditTrail />
        </div>
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          <ChaseIntelligence />
          <CloseMemoryPanel
            clientId={activeClient.id}
            initialBills={closeMemoryBills}
            memoryConfigured={memoryReadiness.configured}
          />
          <SponsorIntelligencePanel
            clientId={activeClient.id}
            closePeriod={activeClient.closePeriod}
            suppliers={closeIntelligenceSuppliers}
          />
          <SubmissionGate />
          <Card>
            <CardHeader title="Close blockers" subtitle="Current command summary" icon="alert" />
            <ul className="space-y-2 text-[12.5px] text-muted">
              {readiness.blockers.slice(0, 5).map((blocker) => (
                <li key={`${blocker.recordId}-${blocker.code}`} className="flex items-start gap-2">
                  <Icon name="dot" size={10} className="mt-1 shrink-0 text-crit-fg" />
                  <span>
                    <span className="tnum font-medium text-ink">{blocker.recordId}</span> · {blocker.message}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
