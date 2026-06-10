import * as db from "@/lib/data/store";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Icon,
  KeyValue,
  PageHeader,
  Avatar,
} from "@/components/ui";
import { AutomationControls } from "@/components/settings-client";

export const metadata = { title: "Settings · Kira" };

const ROLE_VARIANT = {
  finance_admin: "brand",
  approver: "info",
  employee: "neutral",
  auditor: "warn",
} as const;

const CONNECTORS = [
  { name: "AutoCount", kind: "Accounting (local)", state: "connected" },
  { name: "Xero", kind: "Accounting (SG entity)", state: "connected" },
  { name: "SQL Account", kind: "Accounting (local)", state: "available" },
  { name: "LHDN MyInvois", kind: "E-invoicing (MY)", state: "connected" },
  { name: "Peppol / InvoiceNow", kind: "E-invoicing (SG)", state: "connected" },
  { name: "Maybank / CIMB / DBS", kind: "Transaction feed (CSV)", state: "connected" },
] as const;

export default function SettingsPage() {
  const org = db.ORG;
  const tp = org.taxProfile;

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Settings"
        description="Organisation, tax profile, connectors, team, and the automation controls that govern how much the agents do on their own."
        actions={
          <Button variant="outline" icon="spark" href="/onboarding">
            Re-run onboarding
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AutomationControls prefs={db.PREFERENCES} />

        <Card>
          <CardHeader title="Organisation & tax profile" icon="bank" />
          <KeyValue k="Legal name" v={org.legalName} />
          <KeyValue k="SSM no." v={org.ssmNo ?? "—"} />
          <KeyValue k="Industry" v={org.industry} />
          <KeyValue k="Base currency" v={tp.baseCurrency} />
          <KeyValue k="Tax model" v={`${tp.model.replace("_", " ")} · ${tp.model === "MY_SST" ? `${tp.sstRate}%` : `${tp.gstRate}%`}`} />
          <KeyValue k="SST reg. no." v={tp.registrationNo ?? "—"} />
          <KeyValue k="MyInvois phase" v={<Badge variant="brand">{tp.myInvoisPhase}</Badge>} />
          <KeyValue k="Financial year end" v={org.fiscalYearEnd} />
        </Card>

        <Card>
          <CardHeader title="Connectors" subtitle="Accounting write-back, e-invoicing, feeds" icon="transactions" />
          <div className="space-y-2.5">
            {CONNECTORS.map((c) => (
              <div key={c.name} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">{c.name}</div>
                  <div className="text-[12px] text-muted">{c.kind}</div>
                </div>
                <Badge variant={c.state === "connected" ? "pos" : "neutral"} dot>
                  {c.state}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-faint">
            <Icon name="spark" size={13} className="mt-0.5 shrink-0" />
            AutoCount & SQL Account are the local-connector moat global tools lack — validate demand before committing.
          </p>
        </Card>

        <Card>
          <CardHeader title="Team & roles" subtitle="RBAC" icon="approvals" />
          <div className="space-y-2.5">
            {db.USERS.map((u) => (
              <div key={u.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3.5 py-2.5">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-ink">{u.name}</div>
                  <div className="truncate text-[12px] text-muted">{u.title} · {u.email}</div>
                </div>
                <Badge variant={ROLE_VARIANT[u.role]}>{u.role.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Data residency & retention" subtitle="PDPA (MY + SG)" icon="lock" />
          <KeyValue k="Primary residency" v="Malaysia (ap-southeast)" />
          <KeyValue k="SG entity data" v="Singapore region" />
          <KeyValue k="Encryption" v="AES-256 at rest · TLS 1.2+ in transit" />
          <KeyValue k="Card data (PAN)" v={<Badge variant="pos">never stored</Badge>} />
          <KeyValue k="Audit log" v="Immutable · hash-chained" />
          <KeyValue k="Retention" v="7 years (tax) · configurable" />
        </Card>

        <Card>
          <CardHeader title="The line we never cross" icon="shield" />
          <div className="space-y-2.5 text-[12.5px] text-ink-2">
            {[
              "Never holds, moves, or stores customer money",
              "Never issues cards or e-money instruments",
              "Never places or settles trades",
              "Never sends raw financial data to an external LLM",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-surface-2/50 px-3 py-2">
                <Icon name="check" size={15} className="shrink-0 text-pos-fg" />
                {t}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            Orchestrate, never settle. Money movement is delegated to a licensed BaaS partner only in Phase 2, after the software layer has traction.
          </p>
        </Card>
      </div>
    </div>
  );
}
