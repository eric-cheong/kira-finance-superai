"use client";

import { useMemo, useState } from "react";
import type { BriefingRunState } from "@/lib/backend/state";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

const TOOL_ACTIVITY = [
  { label: "ledger.scan", detail: "transactions + receipts", state: "complete" },
  { label: "forecast.project", detail: "cash range", state: "complete" },
  { label: "policy.evaluate", detail: "approval gates", state: "complete" },
];

type BriefingAction = "pause" | "edit_plan" | "resume";

const STATUS_BADGE: Record<BriefingRunState["status"], { label: string; variant: "pos" | "warn" | "info" }> = {
  running: { label: "running", variant: "pos" },
  paused: { label: "paused", variant: "warn" },
  editing: { label: "editing", variant: "info" },
};

function normalizeDraft(runControl: BriefingRunState) {
  return runControl.planSteps.map((step) => step.label);
}

export function BriefingRunCockpit({
  approvalsCount,
  runControl: initialRunControl,
}: {
  approvalsCount: number;
  runControl: BriefingRunState;
}) {
  const [runControl, setRunControl] = useState(initialRunControl);
  const [draftSteps, setDraftSteps] = useState(() => normalizeDraft(initialRunControl));
  const [pendingAction, setPendingAction] = useState<BriefingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = STATUS_BADGE[runControl.status];
  const isEditing = runControl.status === "editing";
  const draftChanged = useMemo(
    () => JSON.stringify(draftSteps.map((step) => step.trim())) !== JSON.stringify(normalizeDraft(runControl)),
    [draftSteps, runControl],
  );

  async function mutate(action: BriefingAction, planSteps?: string[]) {
    setPendingAction(action);
    setError(null);
    try {
      const response = await fetch("/api/briefing/runs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: runControl.id,
          action,
          ...(planSteps ? { planSteps } : {}),
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { runControl: BriefingRunState };
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Run state could not be updated.");
      }
      setRunControl(payload.data.runControl);
      setDraftSteps(normalizeDraft(payload.data.runControl));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Run state could not be updated.");
    } finally {
      setPendingAction(null);
    }
  }

  function updateDraft(index: number, value: string) {
    setDraftSteps((steps) => steps.map((step, i) => (i === index ? value : step)));
  }

  function addStep() {
    setDraftSteps((steps) => [...steps, "Review next action"]);
  }

  return (
    <Card>
      <CardHeader
        title="Agent run cockpit"
        subtitle={`Persisted run state updates audit history when a reviewer pauses, edits, or resumes ${runControl.id}.`}
        icon="workflow"
        right={
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} dot>{status.label}</Badge>
            <Badge variant="warn">{approvalsCount} waiting</Badge>
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <div className="min-w-0">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Plan</p>
          <ol className="space-y-2">
            {runControl.planSteps.map((step, index) => (
              <li key={step.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                <span className="tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[10px] text-faint">
                  {index + 1}
                </span>
                {isEditing ? (
                  <input
                    value={draftSteps[index] ?? ""}
                    onChange={(event) => updateDraft(index, event.target.value)}
                    className="min-h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand/50"
                    aria-label={`Plan step ${index + 1}`}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{step.label}</span>
                )}
                <Badge variant={step.state === "done" ? "pos" : "warn"} className="ml-auto">
                  {step.state}
                </Badge>
              </li>
            ))}
          </ol>
          {isEditing && (
            <Button className="mt-2 w-full sm:w-auto" variant="ghost" size="sm" icon="plus" onClick={addStep}>
              Add step
            </Button>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Tool calls</p>
          <div className="space-y-2">
            {TOOL_ACTIVITY.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="tnum min-w-0 truncate text-[12px] font-medium text-info-fg">{item.label}</span>
                  <Badge variant="neutral">{item.state}</Badge>
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Human controls</p>
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
            <Button
              disabled={runControl.status === "paused" || pendingAction !== null}
              variant="outline"
              size="sm"
              icon="clock"
              onClick={() => mutate("pause")}
            >
              {pendingAction === "pause" ? "Pausing" : "Pause"}
            </Button>
            <Button
              disabled={pendingAction !== null}
              variant="outline"
              size="sm"
              icon="doc"
              onClick={() => mutate("edit_plan", isEditing ? draftSteps : undefined)}
            >
              {pendingAction === "edit_plan" ? "Saving" : isEditing ? "Save plan" : "Edit plan"}
            </Button>
            <Button
              disabled={runControl.status === "running" || draftChanged || pendingAction !== null}
              variant="outline"
              size="sm"
              icon="arrowRight"
              onClick={() => mutate("resume")}
            >
              {pendingAction === "resume" ? "Resuming" : "Resume"}
            </Button>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            {draftChanged
              ? "Save the edited plan before resuming the run."
              : `Last control update: ${fmtDateTime(runControl.updatedAt)} MYT.`}
          </p>
          {error && (
            <p className="mt-2 rounded-lg border border-crit-fg/20 bg-crit-bg px-3 py-2 text-[12px] leading-relaxed text-ink">
              {error}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
