import { fail, ok } from "@/lib/backend/http";
import { operatingFunctions } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return ok(operatingFunctions(url.searchParams.get("id") ?? undefined), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}
