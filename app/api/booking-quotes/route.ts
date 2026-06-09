import { created, fail, readJson } from "@/lib/backend/http";
import { guardProviderRequest } from "@/lib/backend/provider-guard";
import { createBookingQuote } from "@/lib/backend/services";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    guardProviderRequest(request, body);
    return created(await createBookingQuote(body));
  } catch (error) {
    return fail(error);
  }
}
