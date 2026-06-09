import { PageHeader } from "@/components/ui";
import { OnboardingWizard } from "@/components/onboarding-client";

export const metadata = { title: "Get started · Kira" };

export default function OnboardingPage() {
  return (
    <div className="animate-in">
      <PageHeader
        title="Get started"
        description="Create your org, set the tax profile, connect accounting and feeds, and invite your team. Most SMEs are live in under a day — no money movement, no license required."
      />
      <OnboardingWizard />
    </div>
  );
}
