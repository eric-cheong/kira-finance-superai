import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="kira">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
