import { fail, ok, readJson } from "@/lib/backend/http";
import { runForecast } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return ok(runForecast(await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
