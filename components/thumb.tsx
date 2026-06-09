import { cn } from "./ui/cn";

// Deterministic placeholder thumbnail for a captured receipt/invoice. In
// production this is the stored document image; here it's a tinted tile with a
// glyph + initials so lists stay visually consistent without binary assets.

const GLYPH: Record<string, string> = {
  beans: "☕",
  bolt: "⚡",
  car: "🚗",
  box: "📦",
  design: "✎",
  grinder: "⚙",
  cup: "🥤",
  building: "🏢",
  ads: "📣",
  doc: "📄",
};

const TONE: Record<string, string> = {
  beans: "bg-[#f4ede3] text-[#7a5a36]",
  bolt: "bg-warn-bg text-warn-fg",
  car: "bg-info-bg text-info-fg",
  box: "bg-[#eef2f4] text-[#475569]",
  design: "bg-[#f3eefb] text-[#6d28d9]",
  grinder: "bg-surface-2 text-ink-2",
  cup: "bg-[#eaf6ef] text-[#15803d]",
  building: "bg-[#eef2f4] text-[#475569]",
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
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {GLYPH[hint] ?? "📄"}
    </span>
  );
}
