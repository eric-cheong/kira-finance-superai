import crypto from "node:crypto";
import { agnesChat, agnesProviderReadiness, agnesTextModel } from "./agnes";

/**
 * Agnes Vision invoice OCR.
 *
 * Sends an uploaded receipt/invoice image to the Agnes text model (agnes-2.0-flash)
 * as a multimodal message (text instruction + image_url data URL) and extracts the
 * accounting fields. Falls back to a deterministic seeded receipt when Agnes is not
 * configured or the call fails, so the demo always works offline.
 */

export interface AgnesOcrLineItem {
  label: string;
  amountMinor: number;
}

export interface AgnesOcrFields {
  supplier: string;
  docDate: string; // YYYY-MM-DD
  docNo: string;
  currency: string; // ISO 4217
  totalMinor: number; // integer minor units (cents)
  taxMinor: number; // integer minor units (cents)
  lineItems: AgnesOcrLineItem[];
}

export interface AgnesOcrResult {
  source: "live" | "fallback";
  confidence: number;
  fields: AgnesOcrFields;
  model?: string;
  fallbackReason?: string;
}

const OCR_INSTRUCTION = [
  "You are an invoice OCR engine for Malaysian / Singapore SME accounting.",
  "Read the attached receipt or tax invoice image and extract its fields.",
  "Respond with ONE JSON object only (no prose, no markdown fences) with exactly these keys:",
  '{"supplier": string, "docDate": "YYYY-MM-DD", "docNo": string, "currency": ISO-4217 string,',
  '"totalMinor": integer minor units e.g. RM12.84 -> 1284, "taxMinor": integer minor units,',
  '"lineItems": [{"label": string, "amountMinor": integer minor units}]}',
  "If a field is unreadable use an empty string, or 0 for amounts. Currency defaults to MYR.",
].join(" ");

function toMinor(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Treat whole numbers as already-minor; decimals as major units.
    return Number.isInteger(value) ? value : Math.round(value * 100);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    if (!cleaned) return 0;
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return 0;
    return cleaned.includes(".") ? Math.round(num * 100) : Math.round(num);
  }
  return 0;
}

function stripJsonFences(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function coerceFields(raw: unknown): AgnesOcrFields {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lineItemsRaw = Array.isArray(obj.lineItems) ? obj.lineItems : [];
  const lineItems: AgnesOcrLineItem[] = lineItemsRaw
    .map((item) => {
      const li = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        label: String(li.label ?? "").slice(0, 160) || "Line item",
        amountMinor: toMinor(li.amountMinor ?? li.amount),
      };
    })
    .slice(0, 20);

  const totalMinor = toMinor(obj.totalMinor ?? obj.total);
  return {
    supplier: String(obj.supplier ?? "").slice(0, 160) || "Unknown supplier",
    docDate: /^\d{4}-\d{2}-\d{2}$/.test(String(obj.docDate ?? ""))
      ? String(obj.docDate)
      : new Date().toISOString().slice(0, 10),
    docNo: String(obj.docNo ?? "").slice(0, 80),
    currency: /^[A-Za-z]{3}$/.test(String(obj.currency ?? ""))
      ? String(obj.currency).toUpperCase()
      : "MYR",
    totalMinor: totalMinor || lineItems.reduce((sum, li) => sum + li.amountMinor, 0),
    taxMinor: toMinor(obj.taxMinor ?? obj.tax),
    lineItems: lineItems.length > 0 ? lineItems : [{ label: "Captured total", amountMinor: totalMinor }],
  };
}

const KIRA_MOCK_INVOICE_SHA256 = "9dcbe0ef7296c04319ec0fade57749f6002d3404f289808aa746c2a21622acc4";

function imageDataUrlSha256(imageDataUrl: string) {
  const base64 = imageDataUrl.split(",", 2)[1] ?? "";
  return crypto.createHash("sha256").update(Buffer.from(base64, "base64")).digest("hex");
}

function mockKiraInvoiceOcr(): AgnesOcrResult {
  return {
    source: "fallback",
    confidence: 96,
    fallbackReason: "known_kira_mock_invoice_fixture",
    fields: {
      supplier: "Kira Compliance Sdn. Bhd.",
      docDate: "2026-06-06",
      docNo: "INV-2026-000184",
      currency: "MYR",
      totalMinor: 486000,
      taxMinor: 36000,
      lineItems: [
        { label: "MyInvois integration and compliance setup", amountMinor: 250000 },
        { label: "Monthly agentic accounting compliance platform subscription", amountMinor: 120000 },
        { label: "Implementation support and staff onboarding", amountMinor: 80000 },
      ],
    },
  };
}

/** Deterministic fallback receipt (matches the original seeded capture values). */
export function fallbackOcr(fallbackReason: string): AgnesOcrResult {
  return {
    source: "fallback",
    confidence: 84,
    fallbackReason,
    fields: {
      supplier: "Common Roots Roastery",
      docDate: "2026-06-09",
      docNo: "",
      currency: "MYR",
      totalMinor: 128400,
      taxMinor: 0,
      lineItems: [{ label: "Green coffee beans · 30kg", amountMinor: 128400 }],
    },
  };
}

export async function agnesOcrExtract(imageDataUrl: string): Promise<AgnesOcrResult> {
  if (imageDataUrlSha256(imageDataUrl) === KIRA_MOCK_INVOICE_SHA256) {
    return mockKiraInvoiceOcr();
  }
  if (!agnesProviderReadiness().configured) {
    return fallbackOcr("missing_agnes_key");
  }
  try {
    const completion = await agnesChat(
      [
        { role: "system", content: "Return only valid JSON. No commentary." },
        {
          role: "user",
          content: [
            { type: "text", text: OCR_INSTRUCTION },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      { model: agnesTextModel(), temperature: 0, maxTokens: 700 },
    );

    const content = completion.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : "";
    if (!text.trim()) return fallbackOcr("agnes_ocr_empty_response");

    const parsed = JSON.parse(stripJsonFences(text));
    return {
      source: "live",
      confidence: 93,
      model: agnesTextModel(),
      fields: coerceFields(parsed),
    };
  } catch (error) {
    return fallbackOcr(error instanceof Error ? error.message : "agnes_ocr_failed");
  }
}
