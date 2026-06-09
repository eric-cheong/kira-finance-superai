"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalRequest } from "@/lib/types";
import { money } from "@/lib/format";
import { Badge, Button, Card, ConfidenceChip, Icon, TierBadge } from "@/components/ui";
import { cn } from "@/components/ui/cn";

type Decision = "open" | "approved" | "rejected";

export function ApprovalQueue({ initial }: { initial: ApprovalRequest[] }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, Decision>>(
    Object.fromEntries(initial.map((a) => [a.id, a.state])),
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const counts = {
    open: Object.values(decisions).filter((d) => d === "open").length,
    approved: Object.values(decisions).filter((d) => d === "approved").length,
    rejected: Object.values(decisions).filter((d) => d === "rejected").length,
  };

  async function decide(id: string, d: Decision, confirm = false) {
    setPending(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const response = await fetch(`/api/approvals/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: d, confirm }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Approval update failed.");
      }
      setDecisions((prev) => ({ ...prev, [id]: payload.data.approval.state }));
      setConfirming(null);
      router.refresh();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [id]: error instanceof Error ? error.message : "Approval update failed.",
      }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warn" dot>
          {counts.open} open
        </Badge>
        <Badge variant="pos">{counts.approved} approved</Badge>
        <Badge variant="crit">{counts.rejected} rejected</Badge>
        <span className="ml-auto text-[12px] text-muted">
          On timeout or ambiguity the default is <span className="font-medium text-ink-2">no action</span>.
        </span>
      </div>

      <div className="space-y-3">
        {initial.map((a) => {
          const d = decisions[a.id];
          const requiresExtraConfirm = !a.reversible || a.tier >= 4;
          return (
            <Card key={a.id} className={cn("transition-colors", d !== "open" && "opacity-75")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TierBadge tier={a.tier} />
                    <Badge variant={a.reversible ? "neutral" : "crit"}>
                      {a.reversible ? "reversible" : "irreversible"}
                    </Badge>
                    {a.linkedKind && <Badge variant="info">{a.linkedKind}</Badge>}
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold text-ink">{a.title}</h3>
                  <p className="mt-0.5 text-[13px] text-muted">{a.subject}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
                    {a.amountMinor != null && a.currency && (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="bank" size={14} className="text-faint" />
                        <span className="tnum font-medium text-ink">{money(a.amountMinor, a.currency)}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="spark" size={14} className="text-faint" /> Raised by {a.raisedBy}
                    </span>
                    <ConfidenceChip value={a.confidence} />
                  </div>

                  <ul className="mt-3 space-y-1">
                    {a.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-2">
                        <Icon name="check" size={13} className="mt-0.5 shrink-0 text-pos-fg" />
                        {e}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="font-medium text-faint">Routing:</span>
                    {a.steps.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-ink-2">
                        {i + 1}. {s.approverName ?? s.role} <span className="text-faint">({s.role})</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:w-40">
                  {d === "open" ? (
                    confirming === a.id ? (
                      <div className="rounded-lg border border-error/25 bg-error/5 p-2.5">
                        <p className="text-[12px] font-medium leading-snug text-error">
                          {a.reversible
                            ? "Tier-4 action. Confirm before changing this approval state."
                            : "Irreversible action. This cannot be undone after approval."}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" disabled={pending === a.id} onClick={() => setConfirming(null)} className="w-full">
                            Cancel
                          </Button>
                          <Button variant="danger" size="sm" disabled={pending === a.id} onClick={() => decide(a.id, "approved", true)} className="w-full">
                            {pending === a.id ? "Saving" : "Confirm"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="primary"
                          icon="check"
                          disabled={pending === a.id}
                          onClick={() => (requiresExtraConfirm ? setConfirming(a.id) : decide(a.id, "approved"))}
                          className="w-full"
                        >
                          {pending === a.id ? "Saving" : "Approve"}
                        </Button>
                        <Button variant="danger" disabled={pending === a.id} onClick={() => decide(a.id, "rejected")} className="w-full">
                          Reject
                        </Button>
                        <p className="text-center text-[11px] text-faint">
                          {requiresExtraConfirm ? "Extra confirmation required" : "Explicit sign-off required"}
                        </p>
                      </>
                    )
                  ) : (
                    <div
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center",
                        d === "approved" ? "border-pos-fg/20 bg-pos-bg text-pos-fg" : "border-crit-fg/20 bg-crit-bg text-crit-fg",
                      )}
                    >
                      <Icon name={d === "approved" ? "check" : "alert"} size={18} />
                      <span className="text-[13px] font-semibold capitalize">{d}</span>
                      {(a.reversible || d === "rejected") && (
                        <button onClick={() => decide(a.id, "open")} disabled={pending === a.id} className="text-[11px] text-muted underline-offset-2 hover:underline disabled:opacity-50">
                          undo
                        </button>
                      )}
                    </div>
                  )}
                  {errors[a.id] && (
                    <p className="rounded-lg border border-crit-fg/20 bg-crit-bg px-2 py-1.5 text-[11.5px] text-crit-fg">
                      {errors[a.id]}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
