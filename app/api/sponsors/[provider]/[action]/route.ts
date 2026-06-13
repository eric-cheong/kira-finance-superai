import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { runSponsorAction } from "@/lib/backend/sponsors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { provider: string; action: string } }) {
  try {
    const result = await runSponsorAction(params.provider, params.action, await readOptionalJson(request));
    return ok(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
