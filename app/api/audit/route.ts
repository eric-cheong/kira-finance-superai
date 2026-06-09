import { fail, ok } from "@/lib/backend/http";
import { auditTrail } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get("targetId");
    const data = auditTrail();
    const entries = target ? data.entries.filter((entry) => entry.target === target) : data.entries;
    return ok({ ...data, entries }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
