import { fail, ok } from "@/lib/backend/http";
import { postCapture } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(postCapture(params.id));
  } catch (error) {
    return fail(error);
  }
}
