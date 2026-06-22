import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { reasonOverBlockedClose } from "@/lib/backend/agnes-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await readOptionalJson(request)) as { clientId?: string } | undefined;
    const result = await reasonOverBlockedClose({ clientId: body?.clientId });
    return ok(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
