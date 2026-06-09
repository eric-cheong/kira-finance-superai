import * as db from "@/lib/data/store";
import { PageHeader } from "@/components/ui";
import { ApprovalQueue } from "@/components/approvals-client";

export const metadata = { title: "Approvals · Kira" };

export default function ApprovalsPage() {
  const approvals = db.listApprovals();
  return (
    <div className="animate-in">
      <PageHeader
        title="Approvals"
        description="Human approval is required for money-touching, irreversible, or abnormal actions. Each request shows evidence, confidence, and whether it can be undone."
      />
      <ApprovalQueue initial={approvals} />
    </div>
  );
}
