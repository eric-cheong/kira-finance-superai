import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Kira · Finance SuperAI",
  description:
    "All-in-one agentic AI finance app for APAC SMEs. Orchestrates and records — never settles. GST/SST automation, e-invoicing compliance (MyInvois + Peppol/InvoiceNow), and an embedded multi-agent intelligence layer.",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
