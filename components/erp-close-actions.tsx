"use client";

import { useState } from "react";
import { ActionBar, Button, Notice } from "@/components/ui";

type ExportState =
  | { status: "idle" }
  | { status: "loading"; label: string }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message ?? payload?.message ?? "Export failed.");
  }
  return payload?.data ?? payload;
}

export function ErpCloseExportActions({
  disabled,
  readyRecordIds,
  destination,
}: {
  disabled: boolean;
  readyRecordIds: string[];
  destination: string;
}) {
  const [state, setState] = useState<ExportState>({ status: "idle" });
  const busy = state.status === "loading";

  async function runEvidencePack() {
    setState({ status: "loading", label: "Preparing evidence pack" });
    try {
      const result = await postJson("/api/erp-close/export/evidence-pack", {});
      setState({ status: "ok", message: `Evidence pack ready: ${result.fileRef ?? result.exportId}` });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Evidence export failed." });
    }
  }

  async function runReadyExport() {
    setState({ status: "loading", label: "Exporting ready bills" });
    try {
      const result = await postJson("/api/erp-close/export/ready-bills", {
        destination,
        recordIds: readyRecordIds,
      });
      setState({
        status: "ok",
        message: `Exported ${result.exportedRecords?.length ?? 0}; blocked ${result.blockedRecords?.length ?? 0}.`,
      });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Ready bill export failed." });
    }
  }

  return (
    <div className="w-full space-y-2 sm:w-auto">
      <ActionBar>
        <Button variant="outline" icon="doc" size="sm" disabled={busy} onClick={runEvidencePack}>
          Evidence pack
        </Button>
        <Button variant="primary" icon="lock" size="sm" disabled={disabled || busy} onClick={runReadyExport}>
          {busy ? state.label : "Export Ready Bills"}
        </Button>
      </ActionBar>
      {state.status === "ok" && (
        <Notice variant="pos" icon="check">
          {state.message}
        </Notice>
      )}
      {state.status === "error" && (
        <Notice variant="crit" icon="alert">
          {state.message}
        </Notice>
      )}
    </div>
  );
}
