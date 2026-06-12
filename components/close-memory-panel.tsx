"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardHeader, ConfidenceChip, EmptyState, Notice } from "@/components/ui";
import type { ErpMapping } from "@/lib/erp-close";

export interface CloseMemoryBillOption {
  id: string;
  supplierId?: string;
  supplierName: string;
  query: string;
}

interface CloseMemory {
  id: string;
  text: string;
  score: number;
  suggestedMapping?: Partial<ErpMapping>;
  source: "mem0" | "local";
}

type PanelState =
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
    throw new Error(payload?.error?.message ?? "Request failed.");
  }
  return payload?.data ?? payload;
}

async function patchJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message ?? "Update failed.");
  }
  return payload?.data ?? payload;
}

function mappingLabel(mapping: Partial<ErpMapping>) {
  return [
    mapping.expenseAccountCode && `Expense ${mapping.expenseAccountCode}`,
    mapping.taxCode && `Tax ${mapping.taxCode}`,
    mapping.costCentre && `CC ${mapping.costCentre}`,
    mapping.vendorId && `Vendor ${mapping.vendorId}`,
  ].filter(Boolean).join(" · ");
}

export function CloseMemoryPanel({
  clientId,
  initialBills,
  memoryConfigured,
}: {
  clientId: string;
  initialBills: CloseMemoryBillOption[];
  memoryConfigured: boolean;
}) {
  const router = useRouter();
  const [selectedBillId, setSelectedBillId] = useState(initialBills[0]?.id ?? "");
  const [state, setState] = useState<PanelState>({ status: "idle" });
  const [memories, setMemories] = useState<CloseMemory[]>([]);
  const [source, setSource] = useState<"mem0" | "local" | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const selectedBill = useMemo(
    () => initialBills.find((bill) => bill.id === selectedBillId) ?? initialBills[0],
    [initialBills, selectedBillId],
  );
  const busy = state.status === "loading";
  const badgeSource = source ?? (hydrated && memoryConfigured ? "mem0" : hydrated ? "local" : null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function recallContext() {
    if (!selectedBill) return;
    setState({ status: "loading", label: "Recalling context" });
    try {
      const result = await postJson("/api/erp-close/memory/recall", {
        clientId,
        supplierId: selectedBill.supplierId,
        query: selectedBill.query,
        limit: 5,
      }) as { memories?: CloseMemory[]; source?: "mem0" | "local" };
      setMemories(result.memories ?? []);
      setSource(result.source ?? null);
      setState({
        status: "ok",
        message: (result.memories?.length ?? 0) > 0
          ? `Recalled ${result.memories?.length ?? 0} close memor${result.memories?.length === 1 ? "y" : "ies"}.`
          : "No prior close memory found for this supplier.",
      });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Memory recall failed." });
    }
  }

  async function applyMapping(memory: CloseMemory) {
    if (!selectedBill || !memory.suggestedMapping) return;
    setState({ status: "loading", label: "Applying coding" });
    try {
      await patchJson(`/api/erp-close/bills/${selectedBill.id}`, {
        erpMapping: memory.suggestedMapping,
        note: "Applied suggested coding from Close Memory.",
      });
      setState({ status: "ok", message: "Suggested coding applied to the Bill Record." });
      router.refresh();
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Suggested coding failed." });
    }
  }

  return (
    <Card>
      <CardHeader
        title="Close Memory"
        subtitle="Recall supplier coding and exception decisions from prior closes."
        icon="bookOpen"
        right={
          <Badge variant={badgeSource === "mem0" ? "brand" : "neutral"}>
            {badgeSource === "mem0" ? "Powered by Mem0" : badgeSource === "local" ? "Local memory" : "Memory ready"}
          </Badge>
        }
      />

      {initialBills.length === 0 ? (
        <EmptyState icon="bookOpen" title="No Bill Records" sub="Memory recall appears when close-book records are available." />
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted">Bill Record</span>
            <select
              value={selectedBill?.id ?? ""}
              onChange={(event) => setSelectedBillId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface-2/65 px-3 text-[13px] text-ink outline-none transition hover:border-border-strong focus:border-brand/50"
            >
              {initialBills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.supplierName} · {bill.id}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="primary"
            icon="search"
            className="w-full"
            disabled={busy || !selectedBill}
            onClick={recallContext}
          >
            {busy ? state.label : "Recall context"}
          </Button>

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

          {memories.length === 0 ? (
            <EmptyState
              icon="bookOpen"
              title="No memory selected"
              sub="Choose a Bill Record and recall context to see prior close decisions."
            />
          ) : (
            <div className="space-y-2">
              {memories.map((memory) => (
                <div key={memory.id} className="rounded-lg border border-border bg-surface-2/45 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <ConfidenceChip value={memory.score} />
                    <Badge variant={memory.source === "mem0" ? "brand" : "neutral"}>
                      {memory.source === "mem0" ? "Mem0" : "Local"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{memory.text}</p>
                  {memory.suggestedMapping && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[12px] font-medium leading-relaxed text-ink">
                        {mappingLabel(memory.suggestedMapping) || "Structured ERP mapping available"}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        icon="check"
                        className="w-full"
                        disabled={busy}
                        onClick={() => applyMapping(memory)}
                      >
                        Apply suggested coding
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
