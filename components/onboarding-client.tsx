"use client";

import { useState } from "react";
import { Badge, Button, Card, Icon, type IconName } from "@/components/ui";
import { cn } from "@/components/ui/cn";

interface Step {
  key: string;
  title: string;
  icon: IconName;
  blurb: string;
}

const STEPS: Step[] = [
  { key: "org", title: "Organisation", icon: "bank", blurb: "Tell us who you are." },
  { key: "tax", title: "Tax profile", icon: "compliance", blurb: "GST/SST + e-invoicing." },
  { key: "accounting", title: "Accounting", icon: "transactions", blurb: "Where records sync." },
  { key: "feeds", title: "Transaction feeds", icon: "capture", blurb: "Import your spend." },
  { key: "policy", title: "Coding & approvals", icon: "approvals", blurb: "Defaults applied." },
  { key: "team", title: "Invite team", icon: "spark", blurb: "Roles & RBAC." },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

function Choice({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
        active ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span>
        <span className={cn("block text-[13px] font-medium", active ? "text-brand" : "text-ink")}>{label}</span>
        {sub && <span className="block text-[11.5px] text-muted">{sub}</span>}
      </span>
      {active && <Icon name="check" size={16} className="text-brand" />}
    </button>
  );
}

export function OnboardingWizard() {
  const [i, setI] = useState(0);
  const [country, setCountry] = useState<"MY" | "SG">("MY");
  const [accounting, setAccounting] = useState("AutoCount");
  const [done, setDone] = useState(false);

  const step = STEPS[i];
  const pct = Math.round(((i + 1) / STEPS.length) * 100);

  if (done) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="flex flex-col items-center gap-3 py-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pos-bg text-pos-fg">
            <Icon name="check" size={28} />
          </span>
          <h2 className="text-[18px] font-semibold text-ink">You&apos;re live</h2>
          <p className="max-w-sm text-[13px] text-muted">
            Kira imported your settings, applied a {country === "MY" ? "SST + MyInvois" : "GST + InvoiceNow"} tax profile,
            and connected {accounting}. The agents will run your first daily briefing tonight.
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="pos" dot>setup time: 18 min</Badge>
            <Badge variant="neutral">target: &lt; 1 day</Badge>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" icon="briefing" href="/">Go to briefing</Button>
            <Button variant="outline" href="/settings">Review settings</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Step rail */}
      <ol className="hidden lg:block">
        {STEPS.map((s, idx) => {
          const state = idx < i ? "done" : idx === i ? "active" : "todo";
          return (
            <li key={s.key} className="flex items-start gap-3 pb-4">
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold",
                  state === "done" && "border-pos-fg/30 bg-pos-bg text-pos-fg",
                  state === "active" && "border-brand bg-brand text-white",
                  state === "todo" && "border-border bg-surface text-faint",
                )}
              >
                {state === "done" ? <Icon name="check" size={14} /> : idx + 1}
              </span>
              <span>
                <span className={cn("block text-[13px] font-medium", state === "todo" ? "text-faint" : "text-ink")}>{s.title}</span>
                <span className="block text-[11.5px] text-muted">{s.blurb}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Step body */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
              <Icon name={step.icon} size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">{step.title}</h2>
              <p className="text-[12px] text-muted">Step {i + 1} of {STEPS.length}</p>
            </div>
          </div>
          <span className="tnum text-[12px] text-faint">{pct}%</span>
        </div>
        <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="min-h-[210px] space-y-4">
          {step.key === "org" && (
            <>
              <Field label="Legal name">
                <input className={inputCls} defaultValue="Kira Roasters Sdn Bhd" />
              </Field>
              <Field label="Country of incorporation">
                <div className="grid grid-cols-2 gap-2">
                  <Choice label="Malaysia" sub="SST · MyInvois" active={country === "MY"} onClick={() => setCountry("MY")} />
                  <Choice label="Singapore" sub="GST · InvoiceNow" active={country === "SG"} onClick={() => setCountry("SG")} />
                </div>
              </Field>
              <Field label="Industry">
                <input className={inputCls} defaultValue="F&B · Specialty Coffee" />
              </Field>
            </>
          )}

          {step.key === "tax" && (
            <>
              <Field label="Tax model">
                <input className={inputCls} readOnly value={country === "MY" ? "Malaysia SST — 8%" : "Singapore GST — 9%"} />
              </Field>
              <Field label={country === "MY" ? "MyInvois phase" : "InvoiceNow (Peppol)"}>
                <input className={inputCls} readOnly value={country === "MY" ? "Phase 2 (mandatory)" : "PINT-SG via access point"} />
              </Field>
              <Field label="Base currency">
                <input className={inputCls} readOnly value={country === "MY" ? "MYR" : "SGD"} />
              </Field>
              <p className="flex items-start gap-1.5 rounded-lg bg-surface-2/60 px-3 py-2 text-[11.5px] text-muted">
                <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
                Kira is software, not a tax agent. Codes and e-invoices are suggestions you confirm; validation responses are retained.
              </p>
            </>
          )}

          {step.key === "accounting" && (
            <Field label="Connect your accounting system (records sync here)">
              <div className="grid grid-cols-2 gap-2">
                {["AutoCount", "SQL Account", "Xero", "QuickBooks"].map((a) => (
                  <Choice
                    key={a}
                    label={a}
                    sub={a === "AutoCount" || a === "SQL Account" ? "local connector" : "via unified API"}
                    active={accounting === a}
                    onClick={() => setAccounting(a)}
                  />
                ))}
              </div>
            </Field>
          )}

          {step.key === "feeds" && (
            <>
              <Field label="Import transactions">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-2/40 px-4 py-7 text-center">
                  <Icon name="transactions" size={22} className="text-muted" />
                  <p className="text-[13px] font-medium text-ink">Drop a CSV from Maybank, CIMB, DBS…</p>
                  <p className="text-[11.5px] text-muted">Open-banking feeds connect in Phase 2 · we never store full card numbers</p>
                </div>
              </Field>
              <div className="flex flex-wrap gap-2">
                {["Maybank", "CIMB", "DBS", "OCBC", "UOB"].map((b) => (
                  <Badge key={b} variant="neutral" dot>{b}</Badge>
                ))}
              </div>
            </>
          )}

          {step.key === "policy" && (
            <>
              <p className="text-[13px] text-muted">Sensible defaults applied — adjust anytime in Settings.</p>
              <div className="space-y-2">
                {[
                  { k: "Chart of accounts", v: "10 accounts · F&B template" },
                  { k: "Tax codes", v: country === "MY" ? "SST-S8, SST-IMP, OUT…" : "GST-SR9, GST-ZR…" },
                  { k: "Cost centres", v: "Per outlet + Head Office" },
                  { k: "Approval policy", v: "> RM2,000 → finance · e-invoices → explicit" },
                  { k: "Automation threshold", v: "Auto-pass ≥ 85% confidence" },
                ].map((r) => (
                  <div key={r.k} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-[13px] text-ink">{r.k}</span>
                    <span className="text-[12px] text-muted">{r.v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step.key === "team" && (
            <>
              <p className="text-[13px] text-muted">Invite your team with role-based access.</p>
              <div className="space-y-2">
                {[
                  { n: "Amir Hafiz", r: "finance_admin" },
                  { n: "Lim Mei Ling", r: "approver" },
                  { n: "Wei Jian", r: "employee" },
                  { n: "Devi Menon", r: "auditor" },
                ].map((m) => (
                  <div key={m.n} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-[13px] text-ink">{m.n}</span>
                    <Badge variant="info">{m.r.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" disabled={i === 0} onClick={() => setI((n) => Math.max(0, n - 1))}>
            Back
          </Button>
          {i < STEPS.length - 1 ? (
            <Button variant="primary" iconRight="arrowRight" onClick={() => setI((n) => n + 1)}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" icon="check" onClick={() => setDone(true)}>
              Finish setup
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
