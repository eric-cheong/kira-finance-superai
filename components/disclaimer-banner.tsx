import { Icon } from "./ui/icons";

// The persistent, always-visible separation between information and regulated
// advice. Required on every intelligence surface.
export function DisclaimerBanner({ variant = "advice" }: { variant?: "advice" | "tax" }) {
  const text =
    variant === "advice"
      ? "Intelligence below is educational / informational only — not financial advice. Kira orchestrates and records; it never places trades, moves money, or issues regulated advice."
      : "Kira is software, not a tax agent or taxpayer of record. Tax codes and e-invoices are suggestions that require your confirmation; validation responses are stored for audit.";
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2/60 px-3.5 py-2.5">
      <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-muted" />
      <p className="text-[12.5px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}
