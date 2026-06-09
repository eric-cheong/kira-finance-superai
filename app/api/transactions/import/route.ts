import { fail, ok, readJson } from "@/lib/backend/http";
import { importTransactions } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return ok(importTransactions(await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
