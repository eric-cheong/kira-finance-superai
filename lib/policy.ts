import type { ActionClass, ApprovalTier, ProductPhase } from "./types";
import type { Finding } from "./agents/types";

export interface FindingPolicyDecision {
  actionClass: ActionClass;
  tier: ApprovalTier;
  escalate: boolean;
  informational: boolean;
  disclaimer?: string;
  prohibited: boolean;
  reasons: string[];
}

export const NOT_FINANCIAL_ADVICE =
  "Educational / informational only — not financial advice.";

const PHASE_2_ONLY_KINDS = new Set<Finding["kind"]>(["market", "portfolio"]);

function maxTier(a: ApprovalTier, b: ApprovalTier): ApprovalTier {
  return Math.max(a, b) as ApprovalTier;
}

function phaseAvailableFor(finding: Finding): ProductPhase {
  if (PHASE_2_ONLY_KINDS.has(finding.kind)) return 2;
  return 1;
}

function looksLikeMoneyMovement(finding: Finding): boolean {
  const haystack = `${finding.title} ${finding.detail}`.toLowerCase();
  return /\b(move|transfer|settle|payout|pay bill|bill-pay|issue card|e-money|place trade|execute trade)\b/.test(
    haystack,
  );
}

function looksLikeInvestmentAction(finding: Finding): boolean {
  const haystack = `${finding.title} ${finding.detail}`.toLowerCase();
  return finding.kind === "portfolio" && /\b(rebalance|trade|buy|sell|investment action)\b/.test(haystack);
}

export function classifyFinding(
  finding: Finding,
  productPhase: ProductPhase,
): FindingPolicyDecision {
  const reasons: string[] = [];
  let actionClass = finding.actionClass;
  let tier = finding.tier;
  let escalate = finding.escalate;
  let informational = finding.informational;
  let disclaimer = finding.disclaimer;
  let prohibited = actionClass === "prohibited";

  if (finding.kind === "market" || finding.kind === "portfolio" || finding.kind === "news") {
    informational = true;
    reasons.push("intelligence output labelled informational");
    if (finding.kind !== "news" && !disclaimer) {
      disclaimer = NOT_FINANCIAL_ADVICE;
      reasons.push("financial-advice disclaimer attached");
    }
  }

  const availableFrom = phaseAvailableFor(finding);
  if (productPhase < availableFrom) {
    actionClass = "prohibited";
    tier = 4;
    escalate = true;
    prohibited = true;
    reasons.push(`phase-${availableFrom} capability blocked in phase-${productPhase}`);
  }

  if (looksLikeMoneyMovement(finding) && productPhase === 1) {
    actionClass = "prohibited";
    tier = 4;
    escalate = true;
    prohibited = true;
    reasons.push("money movement is prohibited in phase 1");
  }

  if (looksLikeInvestmentAction(finding) && productPhase < 2) {
    actionClass = "prohibited";
    tier = 4;
    escalate = true;
    prohibited = true;
    reasons.push("investment action is unavailable before phase 2");
  }

  if (finding.moneyTouching && !prohibited) {
    tier = maxTier(tier, 3);
    escalate = true;
    reasons.push("money-touching item requires explicit approval");
  }

  if (finding.confidence < 70) {
    escalate = true;
    reasons.push("low confidence requires human escalation");
  }

  return { actionClass, tier, escalate, informational, disclaimer, prohibited, reasons };
}

export function applyFindingPolicy(finding: Finding, productPhase: ProductPhase): Finding {
  const decision = classifyFinding(finding, productPhase);
  return {
    ...finding,
    actionClass: decision.actionClass,
    tier: decision.tier,
    escalate: decision.escalate,
    informational: decision.informational,
    disclaimer: decision.disclaimer,
    rationale: decision.reasons.length
      ? `${finding.rationale} Policy: ${decision.reasons.join("; ")}.`
      : finding.rationale,
  };
}
