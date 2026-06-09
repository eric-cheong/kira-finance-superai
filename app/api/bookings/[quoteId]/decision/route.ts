import { fail, ok, readJson } from "@/lib/backend/http";
import { decideBooking } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { quoteId: string } }) {
  try {
    const body = await readJson(request);
    return ok(decideBooking(params.quoteId, body as Parameters<typeof decideBooking>[1]));
  } catch (error) {
    return fail(error);
  }
}
