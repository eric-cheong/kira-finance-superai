import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { HashTargetFocus } from "@/components/hash-target-focus";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kira · AI Operating Intelligence",
  description:
    "AI operating intelligence platform for finance and operating workflows. Kira benchmarks cash, margin, growth, and customer-experience gaps, then runs approval-gated workflows across existing systems.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf7",
  width: "device-width",
  initialScale: 1,
};

// Applies the stored theme before first paint to avoid a light-mode flash for dark users.
const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem("kira-theme");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"kira-dark":"kira";r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="kira" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HashTargetFocus />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
