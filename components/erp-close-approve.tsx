"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function ErpCloseApprove({ billId }: { billId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/erp-close/bills/${billId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message ?? payload?.message ?? "Approval failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5 space-y-1">
      <Button variant="primary" size="sm" icon="check" disabled={busy} onClick={approve}>
        {busy ? "Approving" : "Approve for export"}
      </Button>
      {error && <p className="text-[11px] text-crit-fg">{error}</p>}
    </div>
  );
}
