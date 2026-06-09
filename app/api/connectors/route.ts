import { connectors } from "@/lib/backend/services";
import { fail, ok } from "@/lib/backend/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(connectors(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
