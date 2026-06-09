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
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {GLYPH[hint] ?? "📄"}
    </span>
  );
}
