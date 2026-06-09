import { fail, ok, readJson } from "@/lib/backend/http";
import { updateEInvoice } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(updateEInvoice(params.id, await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
