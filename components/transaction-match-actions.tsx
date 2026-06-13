"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type MatchState = "auto" | "suggested" | "confirmed";

export function TransactionMatchActions({
  matchId,
  state,
  billId,
}: {
  matchId: string;
  state: MatchState;
  billId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(state === "confirmed");
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/matches/${matchId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Confirm failed.");
      }
      setConfirmed(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmed) {
    return (
      <Button variant="outline" size="sm" icon="lock" href={billId ? `/erp-close#${billId}` : "/erp-close"}>
        Continue to AP Close
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="primary" size="sm" icon="check" disabled={busy} onClick={confirm}>
        {busy ? "Confirming" : "Confirm match"}
      </Button>
      {error && <span className="text-[11px] text-crit-fg">{error}</span>}
    </span>
  );
}
