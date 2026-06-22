"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

type Props = {
  billId: string;
  status: string;
};

export function InboxWorkflowButton({ billId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const terminal = ["needs_review", "ready", "approved", "exported"].includes(status);

  async function runStep() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/erp-close/bills/${billId}/workflow`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "Workflow step failed.");
      setMessage(`${payload.data.event.action} → ${payload.data.record.status}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workflow step failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size="sm" variant={terminal ? "outline" : "primary"} disabled={busy || terminal} onClick={runStep}>
        {busy ? "Running…" : terminal ? "Blocked / ready" : "Run next step"}
      </Button>
      {message && <span className="text-[11.5px] text-muted">{message}</span>}
    </div>
  );
}
