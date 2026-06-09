import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { confirmMatch } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(confirmMatch(params.id, await readOptionalJson(request)));
  } catch (error) {
    return fail(error);
  }
}
