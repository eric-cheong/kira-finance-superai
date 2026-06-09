import { fail, ok, readJson } from "@/lib/backend/http";
import { connectConnector } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { name: string } }) {
  try {
    return ok(connectConnector(params.name, await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
