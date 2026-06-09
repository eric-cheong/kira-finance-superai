import { fail, ok, readJson } from "@/lib/backend/http";
import { cancelEInvoice } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(cancelEInvoice(params.id, await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
