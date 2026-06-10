"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPreference } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Icon } from "@/components/ui";
import { cn } from "@/components/ui/cn";

const RISK: UserPreference["riskTolerance"][] = ["conservative", "balanced", "growth"];

export function AutomationControls({ prefs }: { prefs: UserPreference }) {
  const router = useRouter();
  const [savedPrefs, setSavedPrefs] = useState(prefs);
  const [threshold, setThreshold] = useState(prefs.automationThreshold);
  const [risk, setRisk] = useState(prefs.riskTolerance);
  const [channels, setChannels] = useState(prefs.channels);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const channelKeys = Object.keys(channels) as (keyof typeof channels)[];
  const dirty =
    threshold !== savedPrefs.automationThreshold ||
    risk !== savedPrefs.riskTolerance ||
    channelKeys.some((key) => channels[key] !== savedPrefs.channels[key]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationThreshold: threshold, riskTolerance: risk, channels }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Save failed.");
      }
      const nextPrefs = payload.data.preferences as UserPreference;
      setSavedPrefs(nextPrefs);
      setThreshold(nextPrefs.automationThreshold);
      setRisk(nextPrefs.riskTolerance);
      setChannels(nextPrefs.channels);
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setThreshold(savedPrefs.automationThreshold);
    setRisk(savedPrefs.riskTolerance);
    setChannels(savedPrefs.channels);
    setSaved(false);
  }

  return (
    <Card>
      <CardHeader
        title="Automation & intelligence"
        subtitle="How much the agents do before asking you"
        icon="settings"
        right={dirty ? <Badge variant="warn">unsaved</Badge> : saved ? <Badge variant="pos">saved</Badge> : null}
      />

      <div className="space-y-6">
        {/* Threshold */}
        <div>
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <label className="text-[13px] font-medium text-ink">Auto-pass confidence threshold</label>
            <span className="tnum text-[15px] font-semibold text-ink">{threshold}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[rgb(var(--brand))]"
            aria-label="Automation threshold"
          />
          <div className="mt-1 flex justify-between text-[12px] text-faint">
            <span>50% · more automation</span>
            <span>100% · human review only</span>
          </div>
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-2/60 px-3 py-2 text-[12px] text-muted">
            <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
            Signals at or above {threshold}% can auto-pass; lower confidence queues for review. Money movement, e-invoice submission, and regulated advice <span className="font-medium text-ink-2">always</span> require approval regardless of confidence.
          </p>
          {error && (
            <p className="mt-2 rounded-lg border border-crit-fg/20 bg-crit-bg px-3 py-2 text-[12px] text-crit-fg">
              {error}
            </p>
          )}
        </div>

        {/* Risk tolerance */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink">Risk tolerance</label>
          <div className="grid w-full grid-cols-3 rounded-lg border border-border bg-surface-2/60 p-0.5 sm:inline-flex sm:w-auto">
            {RISK.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRisk(r)}
                aria-pressed={risk === r}
                className={cn(
                  "btn-lift min-h-11 rounded-md px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition sm:min-h-10",
                  risk === r ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-surface-2/70 hover:text-ink",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink">Notification channels</label>
          <div className="flex flex-wrap gap-2">
            {channelKeys.map((k) => {
              const on = channels[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setChannels((c) => ({ ...c, [k]: !c[k] }))}
                  aria-pressed={on}
                  className={cn(
                    "btn-lift inline-flex min-h-11 transform-gpu items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition sm:min-h-10",
                    on ? "border-brand/20 bg-brand-soft text-brand" : "border-border bg-surface text-muted hover:bg-surface-2/60 hover:text-ink",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-brand" : "bg-faint")} />
                  {k}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-faint">
            Quiet hours {prefs.quietHours.from}–{prefs.quietHours.to}. Channel changes are a soft-approval (tier-2) action.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button className="w-full sm:w-auto" variant="ghost" disabled={!dirty || saving} onClick={reset}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" variant="primary" disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving" : "Save changes"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
