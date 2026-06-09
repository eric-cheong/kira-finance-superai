import { fail, ok, readJson } from "@/lib/backend/http";
import { resolveCloseBookException } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(resolveCloseBookException(params.id, await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
