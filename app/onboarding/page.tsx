import { PageHeader } from "@/components/ui";
import { OnboardingWizard } from "@/components/onboarding-client";

export const metadata = { title: "Get started · Kira" };

export default function OnboardingPage() {
  return (
    <div className="animate-in">
      <PageHeader
        title="Get started"
        description="Create your org, set tax and accounting defaults, connect feeds, and invite your team. No money movement; setup stays approval-gated."
      />
      <OnboardingWizard />
    </div>
  );
}
