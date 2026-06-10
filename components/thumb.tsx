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
  beans: "bg-surface text-muted",
  bolt: "bg-brand-soft text-brand",
  car: "bg-brand-soft text-brand",
  box: "bg-surface text-muted",
  design: "bg-brand-soft text-brand",
  grinder: "bg-surface-2 text-muted",
  cup: "bg-brand-soft text-brand",
  building: "bg-surface text-muted",
  ads: "bg-brand-soft text-brand",
  doc: "bg-surface-2 text-muted",
};

export function Thumb({ hint, size = 40 }: { hint: string; size?: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-border",
        TONE[hint] ?? "bg-surface-2 text-muted",
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name={ICON[hint] ?? "doc"} size={Math.max(16, Math.round(size * 0.45))} />
    </span>
  );
}
