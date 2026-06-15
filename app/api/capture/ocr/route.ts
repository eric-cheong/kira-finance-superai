import { ApiError, created, fail, readJson } from "@/lib/backend/http";
import { createCapture } from "@/lib/backend/services";
import { agnesOcrExtract } from "@/lib/backend/agnes-ocr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Receipt images are far larger than the 16KB provider guard, so this route does
// not use guardProviderRequest. It enforces a dedicated image-size cap instead.
const MAX_IMAGE_DATA_URL_BYTES = 8_000_000; // ~6MB image after base64

export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { source?: string; imageDataUrl?: string };
    const imageDataUrl = typeof body?.imageDataUrl === "string" ? body.imageDataUrl : "";
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageDataUrl)) {
      throw new ApiError(400, "INVALID_IMAGE", "imageDataUrl must be a base64 image data URL.");
    }
    if (imageDataUrl.length > MAX_IMAGE_DATA_URL_BYTES) {
      throw new ApiError(413, "IMAGE_TOO_LARGE", "Receipt image exceeds the 6MB limit.");
    }
    const ocr = await agnesOcrExtract(imageDataUrl);
    return created(createCapture({ source: "upload", ocr }));
  } catch (error) {
    return fail(error);
  }
}
