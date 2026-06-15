import { agnesBaseURL, agnesProviderReadiness, agnesVideoModel } from "./agnes";
import { closeSummary, type CloseSummary } from "./agnes-context";

/**
 * Agnes Video — generates a short CFO close-briefing clip with agnes-video-v2.0.
 *
 * Video generation is asynchronous: POST /v1/video/generations returns a task_id,
 * then GET /v1/videos/{task_id} is polled until the clip is ready. When Agnes is
 * not configured (or a call fails / times out) we return a deterministic 4-scene
 * storyboard so the "briefing" concept always renders.
 */

export interface AgnesVideoStoryboardScene {
  scene: number;
  caption: string;
}

export interface AgnesVideoResult {
  source: "live" | "fallback";
  status: "processing" | "ready" | "failed";
  model?: string;
  prompt: string;
  taskId?: string;
  videoUrl?: string;
  progress?: number;
  storyboard?: AgnesVideoStoryboardScene[];
  summary: CloseSummary;
  fallbackReason?: string;
}

function buildPrompt(s: CloseSummary): string {
  return [
    `A 5-second cinematic corporate explainer clip: a CFO month-end close briefing for ${s.tradingName}.`,
    `Animated teal/navy financial dashboard showing ${s.ready} records ready and ${s.blocked} blocked,`,
    `top supplier ${s.topSupplier}. Smooth camera push-in, clean motion-graphic charts, professional fintech mood.`,
  ].join(" ");
}

function storyboard(s: CloseSummary): AgnesVideoStoryboardScene[] {
  return [
    { scene: 1, caption: `${s.tradingName} — ${s.closePeriod} month-end close` },
    { scene: 2, caption: `${s.ready} records ready, ${s.blocked} blocked for review` },
    { scene: 3, caption: `Top supplier this period: ${s.topSupplier}` },
    { scene: 4, caption: "Kira orchestrates and records — it never moves money" },
  ];
}

function fallback(summary: CloseSummary, prompt: string, fallbackReason: string): AgnesVideoResult {
  return { source: "fallback", status: "ready", prompt, storyboard: storyboard(summary), summary, fallbackReason };
}

type JsonRecord = Record<string, unknown>;

const VIDEO_URL_KEYS = [
  "video_url",
  "videoUrl",
  "url",
  "download_url",
  "downloadUrl",
  "file_url",
  "fileUrl",
  "output",
  "result",
  "video",
  "videos",
  "data",
] as const;

const TASK_ID_KEYS = ["task_id", "taskId", "id", "generation_id", "generationId"] as const;
const STATUS_KEYS = ["status", "state", "task_status", "taskStatus"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

function findNestedValue(value: unknown, keys: readonly string[], depth = 0): unknown {
  if (depth > 6) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findNestedValue(item, keys, depth + 1);
      if (nested !== undefined) return nested;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  for (const key of keys) {
    if (value[key] !== undefined) return value[key];
  }
  for (const child of Object.values(value)) {
    const nested = findNestedValue(child, keys, depth + 1);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function findVideoUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 6) return undefined;
  const direct = httpUrl(value);
  if (direct) return direct;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findVideoUrl(item, depth + 1);
      if (nested) return nested;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  for (const key of VIDEO_URL_KEYS) {
    const nested = findVideoUrl(value[key], depth + 1);
    if (nested) return nested;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "prompt") continue;
    const nested = findVideoUrl(child, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

function normalizeStatus(raw: unknown): "processing" | "ready" | "failed" {
  const value = String(raw ?? "").trim().toLowerCase();
  if (["complete", "completed", "done", "succeeded", "success", "ready", "finished"].includes(value)) return "ready";
  if (["failed", "error", "cancelled", "canceled"].includes(value)) return "failed";
  return "processing";
}

function normalizeLivePayload(
  payload: JsonRecord,
  summary: CloseSummary,
  taskIdFallback?: string,
): Pick<AgnesVideoResult, "status" | "taskId" | "videoUrl" | "progress" | "storyboard"> {
  const videoUrl = findVideoUrl(payload);
  const taskIdRaw = findNestedValue(payload, TASK_ID_KEYS);
  const statusRaw = findNestedValue(payload, STATUS_KEYS);
  const progressRaw = findNestedValue(payload, ["progress", "percentage", "percent"]);
  const progress = typeof progressRaw === "number"
    ? progressRaw
    : typeof progressRaw === "string" && progressRaw.trim()
      ? Number(progressRaw)
      : undefined;

  return {
    status: videoUrl ? "ready" : normalizeStatus(statusRaw),
    taskId: typeof taskIdRaw === "string" ? taskIdRaw : taskIdFallback,
    videoUrl,
    progress: Number.isFinite(progress) ? progress : undefined,
    storyboard: videoUrl ? undefined : storyboard(summary),
  };
}

export async function generateCfoBriefingVideo(input: { clientId?: string } = {}): Promise<AgnesVideoResult> {
  const summary = closeSummary(input.clientId);
  const prompt = buildPrompt(summary);

  if (!agnesProviderReadiness().configured) {
    return fallback(summary, prompt, "missing_agnes_key");
  }

  try {
    const response = await fetch(`${agnesBaseURL()}/video/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AGNES_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: agnesVideoModel(), prompt }),
    });
    if (!response.ok) {
      return fallback(summary, prompt, `agnes_video_http_${response.status}`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const live = normalizeLivePayload(payload, summary);
    const taskId = live.taskId;
    if (!taskId) {
      return fallback(summary, prompt, "agnes_video_no_task_id");
    }
    return {
      source: "live",
      status: live.status,
      model: agnesVideoModel(),
      prompt,
      taskId,
      videoUrl: live.videoUrl,
      progress: live.progress ?? 0,
      storyboard: live.storyboard,
      summary,
    };
  } catch (error) {
    return fallback(summary, prompt, error instanceof Error ? error.message : "agnes_video_failed");
  }
}

export async function pollCfoBriefingVideo(
  taskId: string,
  clientId?: string,
): Promise<AgnesVideoResult> {
  const summary = closeSummary(clientId);
  const prompt = buildPrompt(summary);

  if (!agnesProviderReadiness().configured) {
    return fallback(summary, prompt, "missing_agnes_key");
  }

  try {
    const response = await fetch(`${agnesBaseURL()}/videos/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${process.env.AGNES_API_KEY}` },
    });
    if (!response.ok) {
      return fallback(summary, prompt, `agnes_video_poll_http_${response.status}`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const live = normalizeLivePayload(payload, summary, taskId);
    if (live.status === "failed") {
      return fallback(summary, prompt, "agnes_video_generation_failed");
    }
    return {
      source: "live",
      status: live.status,
      model: agnesVideoModel(),
      prompt,
      taskId: live.taskId ?? taskId,
      videoUrl: live.videoUrl,
      progress: live.progress,
      storyboard: live.storyboard,
      summary,
    };
  } catch (error) {
    return fallback(summary, prompt, error instanceof Error ? error.message : "agnes_video_poll_failed");
  }
}
