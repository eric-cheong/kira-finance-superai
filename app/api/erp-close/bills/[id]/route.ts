import { fail, ok, readJson } from "@/lib/backend/http";
import { getCloseBookBill, updateCloseBookBill } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(getCloseBookBill(params.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(updateCloseBookBill(params.id, await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
