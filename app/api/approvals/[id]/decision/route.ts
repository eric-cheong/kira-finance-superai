import { fail, ok, readJson } from "@/lib/backend/http";
import { decideApproval } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await readJson(request);
    return ok(decideApproval(params.id, body as Parameters<typeof decideApproval>[1]));
  } catch (error) {
    return fail(error);
  }
}
