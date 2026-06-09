import { cn } from "./ui/cn";
import { Icon, type IconName } from "./ui/icons";

// Deterministic placeholder thumbnail for a captured receipt/invoice. In
// production this is the stored document image; here it's a tinted tile with a
// line icon so lists stay visually consistent without binary assets.

const ICON: Record<string, IconName> = {
  beans: "vendor",
  bolt: "spark",
  car: "transactions",
  box: "module",
  design: "doc",
  grinder: "settings",
  cup: "vendor",
  building: "bank",
  ads: "bell",
  doc: "doc",
};

const TONE: Record<string, string> = {
  beans: "bg-white text-ink",
  bolt: "bg-brand-soft text-ink",
  car: "bg-brand-soft text-ink",
  box: "bg-white text-ink",
  design: "bg-brand-soft text-ink",
  grinder: "bg-surface-2 text-ink",
  cup: "bg-brand-soft text-ink",
  building: "bg-white text-ink",
  ads: "bg-brand-soft text-ink",
  doc: "bg-surface-2 text-ink",
};

export function Thumb({ hint, size = 40 }: { hint: string; size?: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-border",
        TONE[hint] ?? "bg-surface-2 text-ink",
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name={ICON[hint] ?? "doc"} size={Math.max(16, Math.round(size * 0.45))} />
    </span>
  );
}
