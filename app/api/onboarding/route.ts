import { created, fail, readJson } from "@/lib/backend/http";
import { completeOnboarding } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return created(completeOnboarding(await readJson(request)));
  } catch (error) {
    return fail(error);
  }
}
