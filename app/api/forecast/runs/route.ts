import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { runForecast } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return ok(runForecast(await readOptionalJson(request)));
  } catch (error) {
    return fail(error);
  }
}
