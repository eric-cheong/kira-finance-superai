import { fail, ok } from "@/lib/backend/http";
import { runInvoiceWorkflowUntilBlocked, runNextInvoiceStep } from "@/lib/backend/invoice-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    return ok(runNextInvoiceStep(params.id));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  try {
    return ok({ steps: runInvoiceWorkflowUntilBlocked(params.id) });
  } catch (error) {
    return fail(error);
  }
}
