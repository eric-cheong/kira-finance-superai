import { fail, ok } from "@/lib/backend/http";
import { aiProviderStatus } from "@/lib/backend/services";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(aiProviderStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
