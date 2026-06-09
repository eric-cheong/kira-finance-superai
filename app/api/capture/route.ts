import { created, fail, ok, readJson } from "@/lib/backend/http";
import { createCapture, listCaptureInbox } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(listCaptureInbox(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    return created(createCapture(body as Parameters<typeof createCapture>[0]));
  } catch (error) {
    return fail(error);
  }
}
