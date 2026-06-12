import { ApiError, fail, ok, readJson } from "@/lib/backend/http";
import { recallSupplierContext } from "@/lib/backend/memory";

export const dynamic = "force-dynamic";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  try {
    const input = await readJson(request);
    if (!input || typeof input !== "object") {
      throw new ApiError(400, "INVALID_BODY", "Memory recall payload must be an object.");
    }
    const body = input as Record<string, unknown>;
    const clientId = optionalString(body.clientId);
    const query = optionalString(body.query);
    if (!clientId) throw new ApiError(400, "CLIENT_ID_REQUIRED", "clientId is required.");
    if (!query) throw new ApiError(400, "QUERY_REQUIRED", "query is required.");
    const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : undefined;
    const result = await recallSupplierContext({
      clientId,
      supplierId: optionalString(body.supplierId),
      query,
      limit,
    });
    return ok(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
