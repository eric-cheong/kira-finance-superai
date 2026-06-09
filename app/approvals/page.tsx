import * as db from "@/lib/data/store";
import { PageHeader } from "@/components/ui";
import { ApprovalQueue } from "@/components/approvals-client";

export const metadata = { title: "Approvals · Kira" };

export default function ApprovalsPage() {
  const approvals = db.openApprovals();
  return (
    <div className="animate-in">
      <PageHeader
        title="Approvals"
        description="Tier-3 and tier-4 items the agents prepared but will never execute on their own — money-touching actions, e-invoice submissions, and abnormal activity. Each shows evidence, confidence, and whether it can be undone."
      />
      <ApprovalQueue initial={approvals} />
    </div>
  );
}
