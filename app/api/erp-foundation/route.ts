import { fail, ok } from "@/lib/backend/http";
import { erpFoundation } from "@/lib/erp-foundation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(erpFoundation(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
