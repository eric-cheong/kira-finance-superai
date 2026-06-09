import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { exportEvidencePack } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return ok(exportEvidencePack(await readOptionalJson(request)));
  } catch (error) {
    return fail(error);
  }
}
