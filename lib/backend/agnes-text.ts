import { getExportBlockers, getWorkflowDashboard } from "@/lib/erp-close";
import { agnesChat, agnesProviderReadiness, agnesTextModel } from "./agnes";
import { closeSummary, type CloseSummary } from "./agnes-context";
import { state } from "./state";

export interface AgnesCloseReasoningResult {
  source: "live" | "fallback";
  model?: string;
  summary: CloseSummary;
  answer: string;
  fallbackReason?: string;
}

function blockedCloseContext(clientId?: string) {
  const summary = closeSummary(clientId);
  const records = state.closeBookRecords.filter((record) => record.clientId === summary.clientId);
  const dashboard = getWorkflowDashboard(records);
  const blocked = dashboard.blockedRecords
    .filter(({ reasons }) => reasons.some((reason) => reason.code !== "already_exported"))
    .slice(0, 4)
    .map(({ record }) => ({
      id: record.id,
      supplier: record.supplierName ?? "Unknown supplier",
      status: record.status,
      amount: record.totalMinor,
      taxTreatment: record.taxTreatment,
      approval: record.approval.state,
      unresolvedExceptions: record.exceptions
        .filter((exception) => !exception.resolved)
        .map((exception) => `${exception.severity}: ${exception.message}`),
      blockers: getExportBlockers(record)
        .filter((reason) => reason.code !== "already_exported")
        .map((reason) => reason.message),
    }));

  return {
    summary,
    readiness: dashboard.closeReadiness,
    statusCounts: dashboard.statusCounts,
    blocked,
  };
}

function fallbackAnswer(context: ReturnType<typeof blockedCloseContext>, reason: string): AgnesCloseReasoningResult {
  const primary = context.blocked[0];
  const blocker = primary?.blockers[0] ?? "No active export blocker remains.";
  const answer = primary
    ? `Focus on ${primary.supplier}: ${blocker} Keep it blocked from ERP/LHDN export until the missing evidence, tax identity, mapping, or approval is resolved. Next action: assign the blocker to the accountant, apply any recalled supplier coding only if supported by evidence, then re-check the export gate.`
    : `The close has ${context.readiness.exportableRecords} exportable records and no active blocker in the sampled queue. Next action: generate the evidence pack, export ready bills, and keep already-exported records out of the next batch.`;

  return {
    source: "fallback",
    summary: context.summary,
    answer,
    fallbackReason: reason,
  };
}

export async function reasonOverBlockedClose(input: { clientId?: string } = {}): Promise<AgnesCloseReasoningResult> {
  const context = blockedCloseContext(input.clientId);

  if (!agnesProviderReadiness().configured) {
    return fallbackAnswer(context, "missing_agnes_key");
  }

  try {
    const completion = await agnesChat(
      [
        {
          role: "system",
          content: [
            "You are Agnes AI reasoning inside Kira's month-end ERP close workspace.",
            "Use only the provided close context.",
            "Answer in 2 concise sentences.",
            "Name the most important blocked supplier, explain why it cannot be exported, and recommend the safest next action.",
            "Do not say the context is missing if blocked records are provided.",
            "Do not claim Kira moves money, pays suppliers, settles funds, or bypasses approval.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Close context:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
      { model: agnesTextModel(), temperature: 0.2, maxTokens: 180 },
    );
    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) return fallbackAnswer(context, "agnes_empty_response");
    return {
      source: "live",
      model: agnesTextModel(),
      summary: context.summary,
      answer,
    };
  } catch (error) {
    return fallbackAnswer(context, error instanceof Error ? error.message : "agnes_text_failed");
  }
}
