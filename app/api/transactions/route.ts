import { fail, ok } from "@/lib/backend/http";
import { listTransactions } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(listTransactions(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
