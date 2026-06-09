import { fail, ok, readJson } from "@/lib/backend/http";
import { guardProviderRequest } from "@/lib/backend/provider-guard";
import { researchConsumerTrip } from "@/lib/backend/services";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    guardProviderRequest(request, body);
    return ok(await researchConsumerTrip(body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
