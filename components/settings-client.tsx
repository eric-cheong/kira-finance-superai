"use client";

import { useState } from "react";
import type { UserPreference } from "@/lib/types";
import { Card, CardHeader, Icon } from "@/components/ui";
import { cn } from "@/components/ui/cn";

const RISK: UserPreference["riskTolerance"][] = ["conservative", "balanced", "growth"];

export function AutomationControls({ prefs }: { prefs: UserPreference }) {
  const [threshold, setThreshold] = useState(prefs.automationThreshold);
  const [risk, setRisk] = useState(prefs.riskTolerance);
  const [channels, setChannels] = useState(prefs.channels);

  const channelKeys = Object.keys(channels) as (keyof typeof channels)[];

  return (
    <Card>
      <CardHeader title="Automation & intelligence" subtitle="How much the agents do before asking you" icon="settings" />

      <div className="space-y-6">
        {/* Threshold */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="text-[13px] font-medium text-ink">Auto-pass confidence threshold</label>
            <span className="tnum text-[15px] font-semibold text-brand">{threshold}%</span>
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
          <div className="mt-1 flex justify-between text-[10.5px] text-faint">
            <span>50% · cautious</span>
            <span>100% · everything reviewed</span>
          </div>
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-2/60 px-3 py-2 text-[12px] text-muted">
            <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
            Findings at or above {threshold}% auto-pass; below {threshold}% queue for a human. Money movement, e-invoice submission, and regulated advice <span className="font-medium text-ink-2">always</span> require approval regardless of confidence.
          </p>
        </div>

        {/* Risk tolerance */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink">Risk tolerance</label>
          <div className="inline-flex rounded-lg border border-border bg-surface-2/60 p-0.5">
            {RISK.map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors",
                  risk === r ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink-2",
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
                  onClick={() => setChannels((c) => ({ ...c, [k]: !c[k] }))}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors",
                    on ? "border-brand/20 bg-brand-soft text-brand" : "border-border bg-surface text-muted hover:text-ink-2",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-brand" : "bg-faint")} />
                  {k}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-faint">
            Quiet hours {prefs.quietHours.from}–{prefs.quietHours.to}. Channel changes are a soft-approval (tier-2) action.
          </p>
        </div>
      </div>
    </Card>
  );
}
