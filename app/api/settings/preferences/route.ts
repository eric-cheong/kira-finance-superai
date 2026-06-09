import { fail, ok, readJson } from "@/lib/backend/http";
import { getPreferences, updatePreferences } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ preferences: getPreferences() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    return ok({ preferences: updatePreferences(await readJson(request)) });
  } catch (error) {
    return fail(error);
  }
}
