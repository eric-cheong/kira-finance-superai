import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { generateCloseReportImage } from "@/lib/backend/agnes-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await readOptionalJson(request)) as { clientId?: string } | undefined;
    const result = await generateCloseReportImage({ clientId: body?.clientId });
    return ok(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
