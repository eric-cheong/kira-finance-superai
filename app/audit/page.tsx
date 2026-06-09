import { AGENT_ROSTER, runDailyBriefing } from "@/lib/agents";
import type { LoopPhase } from "@/lib/agents/types";
import * as db from "@/lib/data/store";
import { fmtDateTime, shortId } from "@/lib/format";
import {
  Badge,
  Card,
  CardHeader,
  Icon,
  PageHeader,
  Table,
  TierBadge,
  Td,
  Th,
} from "@/components/ui";
import type { ApprovalTier } from "@/lib/types";

export const metadata = { title: "Audit & Agents · Kira" };

const PHASE_LABEL: Record<LoopPhase, string> = {
  observe: "OBSERVE",
  analyze: "ANALYZE",
  plan: "PLAN",
  act: "ACT",
  verify: "VERIFY",
  summarize: "SUMMARIZE",
  escalate: "ESCALATE",
};

export default function AuditPage() {
  const run = runDailyBriefing();

  return (
    <div className="animate-in space-y-8">
      <PageHeader
        title="Audit & agents"
        description="The transparency layer: every agent plan, tool call, policy check, autonomy boundary, and immutable hash-chained record of what happened. This is what an auditor or admin sees."
        badge={<Badge variant="pos" dot>chain verified</Badge>}
      />

      {/* Agent roster / autonomy boundaries */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Agent roster & autonomy boundaries</h2>
        <Card pad={false}>
          <Table>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Job</Th>
                <Th>Allowed autonomously</Th>
                <Th>Never without a human</Th>
                <Th>Phase</Th>
              </tr>
            </thead>
            <tbody>
              {AGENT_ROSTER.map((a) => (
                <tr key={a.name} className="hover:bg-surface-2/40">
                  <Td className="whitespace-nowrap font-medium text-ink">{a.name}</Td>
                  <Td className="text-[12.5px]">{a.job}</Td>
                  <Td className="text-[12.5px] text-ink">{a.autonomous}</Td>
                  <Td className="text-[12.5px] text-ink">{a.neverWithoutHuman}</Td>
                  <Td>{a.phase === 2 ? <Badge variant="neutral">P2</Badge> : <Badge variant="brand">P1</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      {/* Latest run trace */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Latest run — decision trace</h2>
          <span className="tnum text-[12px] text-faint">
            {run.runId} · {run.durationMs}ms · {fmtDateTime(run.startedAt)}
          </span>
        </div>

        <Card className="mb-4">
          <CardHeader title="Orchestrator log" icon="spark" />
          <ol className="space-y-1.5">
            {run.orchestratorLog.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-2">
                <span className="tnum mt-0.5 text-faint">{i + 1}.</span>
                {l}
              </li>
            ))}
          </ol>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {run.agentResults.map((a) => (
            <Card key={a.agent}>
              <CardHeader
                title={a.agent}
                subtitle={`${a.findings.length} finding${a.findings.length === 1 ? "" : "s"} · ${a.durationMs}ms`}
                right={
                  <Badge variant={a.status === "ok" ? "pos" : a.status === "degraded" ? "warn" : "crit"} dot>
                    {a.status}
                  </Badge>
                }
              />
              <ol className="space-y-2">
                {a.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-[68px] shrink-0 text-right text-[9.5px] font-semibold tracking-wide text-faint">
                      {PHASE_LABEL[s.phase]}
                    </span>
                    <span className="mt-0.5 h-3 w-px shrink-0 bg-border" />
                    <span className="text-[12px] leading-relaxed text-ink-2">{s.message}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </section>

      {/* Immutable audit chain */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Immutable audit log</h2>
        <Card pad={false}>
          <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-[12px] text-muted">
            <Icon name="lock" size={14} className="text-pos-fg" />
            Hash-chained · {db.AUDIT.length} entries · each hash binds the previous, so any edit breaks the chain.
          </div>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Detail</Th>
                <Th>Tier</Th>
                <Th>Hash</Th>
              </tr>
            </thead>
            <tbody>
              {db.AUDIT.map((e) => (
                <tr key={e.seq} className="hover:bg-surface-2/40">
                  <Td className="tnum text-faint">{e.seq}</Td>
                  <Td className="whitespace-nowrap tnum text-[11.5px] text-muted">{fmtDateTime(e.at)}</Td>
                  <Td className="whitespace-nowrap text-[12px] font-medium text-ink">{e.actor}</Td>
                  <Td className="whitespace-nowrap tnum text-[11.5px] text-info-fg">{e.action}</Td>
                  <Td className="max-w-[320px] text-[12px]">{e.detail}</Td>
                  <Td>{e.tier ? <TierBadge tier={e.tier as ApprovalTier} /> : <span className="text-faint">—</span>}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="tnum text-[11px] text-faint" title={`prev ${e.prevHash}`}>
                      {shortId(e.hash, 10)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
