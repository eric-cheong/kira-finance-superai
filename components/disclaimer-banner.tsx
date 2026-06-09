import { Notice } from "./ui/primitives";

// The persistent, always-visible separation between information and regulated
// advice. Required on every intelligence surface.
export function DisclaimerBanner({ variant = "advice" }: { variant?: "advice" | "tax" }) {
  const text =
    variant === "advice"
      ? "Intelligence below is educational / informational only — not financial advice. Kira orchestrates and records; it never places trades, moves money, or issues regulated advice."
      : "Kira is software, not a tax agent or taxpayer of record. Tax codes and e-invoices are suggestions that require your confirmation; validation responses are stored for audit.";
  const shortText =
    variant === "advice"
      ? "Informational only. Kira records and orchestrates; it never moves money or gives regulated advice."
      : "Tax suggestions require your confirmation. Kira stores validation responses for audit.";
  return (
    <Notice icon="shield" variant={variant === "tax" ? "warn" : "info"} className="bg-surface/75">
      <span className="sm:hidden">{shortText}</span>
      <span className="hidden sm:inline">{text}</span>
    </Notice>
  );
}
