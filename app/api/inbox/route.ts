import { ok } from "@/lib/backend/http";
import { state } from "@/lib/backend/state";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    sourceDocuments: state.sourceDocuments,
    intakeEvents: state.intakeEvents,
    webhookEvents: state.webhookEvents,
    bills: state.closeBookRecords.filter((record) => record.id.startsWith("bill_live")),
    stats: {
      documents: state.sourceDocuments.length,
      email: state.sourceDocuments.filter((doc) => doc.channel === "email").length,
      whatsapp: state.sourceDocuments.filter((doc) => doc.channel === "whatsapp").length,
      replayedWebhooks: state.webhookEvents.reduce((sum, event) => sum + event.replayCount, 0),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
