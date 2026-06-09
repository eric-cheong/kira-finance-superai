import { Badge, Button, PageHeader } from "@/components/ui";
import { OperatingFunctionsModulePage } from "@/components/operating-functions";

export const metadata = { title: "Operating Functions · Kira" };

export default function OperatingFunctionsPage() {
  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Operating functions"
        description="KIRA connects benchmark intelligence with AI execution across the workflows that decide cash, margin, growth, and customer experience. It works above ERP, CRM, helpdesk, email, spreadsheets, billing systems, and communication tools."
        badge={<Badge variant="brand">AI operating layer</Badge>}
        actions={
          <>
            <Button variant="outline" size="sm" icon="benchmark" href="#finance-fpa">
              Benchmark your workflows
            </Button>
            <Button variant="primary" size="sm" icon="workflow" href="#accounts-receivable">
              Map your operating gaps
            </Button>
          </>
        }
      />

      <OperatingFunctionsModulePage />
    </div>
  );
}
