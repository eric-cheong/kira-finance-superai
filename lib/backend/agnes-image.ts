import { agnesClient, agnesImageModel, agnesProviderReadiness } from "./agnes";
import { closeSummary, type CloseSummary } from "./agnes-context";

/**
 * Agnes Image — generates a branded month-end close report cover/infographic
 * with agnes-image-2.0-flash. Falls back to a deterministic inline SVG built
 * from the real close numbers, so a visual always renders.
 */

export interface AgnesImageResult {
  source: "live" | "fallback";
  model?: string;
  prompt: string;
  imageUrl: string; // hosted URL (live) or data: URL (fallback SVG)
  summary: CloseSummary;
  fallbackReason?: string;
}

function buildPrompt(s: CloseSummary): string {
  return [
    "Create a clean, professional month-end financial close report visual for a real SME finance workspace.",
    "Ground the visual in these exact facts, but do not render text inside the image:",
    `Company trading name: ${s.tradingName}. Legal name: ${s.legalName}.`,
    `Industry: ${s.msicDescription}. ERP: ${s.erp}. Period: ${s.closePeriod}.`,
    `Close metrics: ${s.total} verified bills, ${s.exportable} exportable, ${s.blocked} held, ${s.approved} approved, ${s.exported} exported.`,
    `Top supplier: ${s.topSupplier}. Blocked suppliers: ${s.blockedSuppliers.join(", ") || "none"}.`,
    `Blockers to reflect visually: ${s.blockerMessages.join(" | ") || "no active blockers"}.`,
    "Make the subject unmistakably finance close operations: invoice stack, approval checkmarks, exception warnings, bank reconciliation lines, supplier tie-out, audit trail nodes, ERP export package.",
    "Use subtle industry cues from the company context, such as grocery/retail operations for food retail or textile/apparel cues for apparel manufacturing.",
    "Modern fintech style with teal, navy, white space, crisp vector composition, realistic accounting operations dashboard mood.",
    "Do not render any letters, words, numbers, company names, labels, captions, logos, signatures, watermarks, pseudo-text, or UI text.",
    "Leave a clean blank area where the application can overlay exact company data separately.",
  ].join(" ");
}

function fallbackSvg(s: CloseSummary): string {
  const text = (value: string) => (
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  );
  const blocker = s.blockerMessages[0] ?? "No active export blocker";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0f3b3a"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <text x="64" y="150" fill="#ffffff" font-family="Arial, sans-serif" font-size="58" font-weight="700">Month-End Close</text>
  <text x="64" y="210" fill="#bdeee7" font-family="Arial, sans-serif" font-size="34">${text(s.tradingName)}</text>
  <text x="64" y="256" fill="#8fd9cf" font-family="Arial, sans-serif" font-size="26">${text(s.closePeriod)} · ${text(s.erp)}</text>
  <rect x="64" y="340" width="410" height="260" rx="24" fill="#ffffff" opacity="0.12"/>
  <rect x="550" y="340" width="410" height="260" rx="24" fill="#ffffff" opacity="0.12"/>
  <text x="96" y="430" fill="#ffffff" font-family="Arial, sans-serif" font-size="96" font-weight="700">${s.exportable}</text>
  <text x="96" y="500" fill="#bdeee7" font-family="Arial, sans-serif" font-size="30">exportable</text>
  <text x="582" y="430" fill="#ffffff" font-family="Arial, sans-serif" font-size="96" font-weight="700">${s.blocked}</text>
  <text x="582" y="500" fill="#bdeee7" font-family="Arial, sans-serif" font-size="30">held</text>
  <text x="64" y="690" fill="#ffffff" font-family="Arial, sans-serif" font-size="30">Top supplier: ${text(s.topSupplier)}</text>
  <text x="64" y="740" fill="#bdeee7" font-family="Arial, sans-serif" font-size="24">TIN ${text(s.tin)} · MSIC ${text(s.msic)}</text>
  <text x="64" y="790" fill="#bdeee7" font-family="Arial, sans-serif" font-size="24">${text(blocker.slice(0, 72))}</text>
  <text x="64" y="960" fill="#8fd9cf" font-family="Arial, sans-serif" font-size="24">Powered by Agnes AI · orchestrate, never settle</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function generateCloseReportImage(input: { clientId?: string } = {}): Promise<AgnesImageResult> {
  const summary = closeSummary(input.clientId);
  const prompt = buildPrompt(summary);

  if (!agnesProviderReadiness().configured) {
    return { source: "fallback", prompt, imageUrl: fallbackSvg(summary), summary, fallbackReason: "missing_agnes_key" };
  }

  try {
    const client = agnesClient();
    const result = await client.images.generate({
      model: agnesImageModel(),
      prompt,
      size: "1024x1024",
    });
    const item = result.data?.[0];
    const imageUrl = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
    if (!imageUrl) {
      return { source: "fallback", prompt, imageUrl: fallbackSvg(summary), summary, fallbackReason: "agnes_image_no_output" };
    }
    return { source: "live", model: agnesImageModel(), prompt, imageUrl, summary };
  } catch (error) {
    return {
      source: "fallback",
      prompt,
      imageUrl: fallbackSvg(summary),
      summary,
      fallbackReason: error instanceof Error ? error.message : "agnes_image_failed",
    };
  }
}
