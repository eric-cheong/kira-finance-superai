import { fail, ok } from "@/lib/backend/http";
import { resetBackend } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return ok(resetBackend());
  } catch (error) {
    return fail(error);
  }
}
