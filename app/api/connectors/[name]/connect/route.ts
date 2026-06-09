import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { connectConnector } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { name: string } }) {
  try {
    return ok(connectConnector(params.name, await readOptionalJson(request)));
  } catch (error) {
    return fail(error);
  }
}
