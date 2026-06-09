import { fail, ok, readJson } from "@/lib/backend/http";
import { reviewCapture } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await readJson(request);
    return ok(reviewCapture(params.id, body as Parameters<typeof reviewCapture>[1]));
  } catch (error) {
    return fail(error);
  }
}
