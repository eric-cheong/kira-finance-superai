import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { ErpMapping } from "@/lib/erp-close";
import { CLOSE_BOOK_CLIENTS, CLOSE_BOOK_SUPPLIERS } from "@/lib/erp-close";
import { hasMem0Key, mem0OrgId, mem0ProjectId } from "./provider-config";

export interface CloseDecisionInput {
  clientId: string;
  supplierId?: string;
  supplierName?: string;
  closePeriod?: string;
  kind: "approval" | "export" | "exception_resolution";
  billId: string;
  erpMapping?: Partial<ErpMapping>;
  taxTreatment?: string;
  approver?: string;
  exceptionsResolved?: string[];
  note?: string;
}

export interface CloseMemory {
  id: string;
  text: string;
  score: number;
  metadata: {
    clientId?: string;
    supplierId?: string;
    supplierName?: string;
    kind?: string;
    billId?: string;
    closePeriod?: string;
    taxTreatment?: string;
    approver?: string;
    exceptionsResolved?: string[];
    erpMapping?: Partial<ErpMapping>;
  };
  suggestedMapping?: Partial<ErpMapping>;
  source: "mem0" | "local";
}

interface LocalMemoryEntry {
  id: string;
  text: string;
  createdAt: string;
  metadata: CloseMemory["metadata"];
}

type MemorySource = "mem0" | "local";

const DATA_DIR = path.join(process.cwd(), ".kira-data");
const MEMORY_PATH = path.join(DATA_DIR, "close-memory.json");

let cachedClient: unknown;

async function mem0Client() {
  if (!hasMem0Key()) return null;
  if (cachedClient) return cachedClient;
  const mod = await import("mem0ai");
  const MemoryClient = (mod as { default?: unknown; MemoryClient?: unknown }).default
    ?? (mod as { MemoryClient?: unknown }).MemoryClient;
  if (typeof MemoryClient !== "function") {
    throw new Error("mem0_client_unavailable");
  }
  cachedClient = new (MemoryClient as new (options: Record<string, unknown>) => unknown)({
    apiKey: process.env.MEM0_API_KEY,
    api_key: process.env.MEM0_API_KEY,
    org_id: mem0OrgId(),
    project_id: mem0ProjectId(),
  });
  return cachedClient;
}

function ensureMemoryDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLocalEntries(): LocalMemoryEntry[] {
  try {
    if (!fs.existsSync(MEMORY_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLocalEntry);
  } catch {
    return [];
  }
}

function writeLocalEntries(entries: LocalMemoryEntry[]) {
  ensureMemoryDir();
  fs.writeFileSync(MEMORY_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

function isLocalEntry(value: unknown): value is LocalMemoryEntry {
  return Boolean(
    value
      && typeof value === "object"
      && typeof (value as LocalMemoryEntry).id === "string"
      && typeof (value as LocalMemoryEntry).text === "string"
      && typeof (value as LocalMemoryEntry).createdAt === "string"
      && typeof (value as LocalMemoryEntry).metadata === "object",
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function localScore(query: string, entry: LocalMemoryEntry) {
  const queryTokens = new Set(normalizeText(query));
  if (queryTokens.size === 0) return 0;
  const haystack = new Set([
    ...normalizeText(entry.text),
    ...normalizeText(entry.metadata.supplierName ?? ""),
    ...normalizeText(entry.metadata.taxTreatment ?? ""),
    ...normalizeText(entry.metadata.erpMapping?.expenseAccountCode ?? ""),
    ...normalizeText(entry.metadata.erpMapping?.taxCode ?? ""),
    ...normalizeText(entry.metadata.erpMapping?.costCentre ?? ""),
  ]);
  let matched = 0;
  queryTokens.forEach((token) => {
    if (haystack.has(token)) matched += 1;
  });
  return Math.round((matched / queryTokens.size) * 100);
}

function clampScore(value: unknown) {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return 75;
  const percent = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function metadataFor(input: CloseDecisionInput): CloseMemory["metadata"] {
  return {
    clientId: input.clientId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    kind: input.kind,
    billId: input.billId,
    closePeriod: input.closePeriod,
    taxTreatment: input.taxTreatment,
    approver: input.approver,
    exceptionsResolved: input.exceptionsResolved,
    erpMapping: input.erpMapping,
  };
}

function memorySentence(input: CloseDecisionInput) {
  const supplier = input.supplierName ?? input.supplierId ?? "Unknown supplier";
  const mapping = input.erpMapping;
  const mappingText = mapping
    ? [
        mapping.destination ? `${mapping.destination}` : undefined,
        mapping.vendorId ? `vendor ${mapping.vendorId}` : undefined,
        mapping.apAccountCode ? `AP ${mapping.apAccountCode}` : undefined,
        mapping.expenseAccountCode ? `expense ${mapping.expenseAccountCode}` : undefined,
        mapping.taxCode ? `tax ${mapping.taxCode}` : undefined,
        mapping.costCentre ? `cost centre ${mapping.costCentre}` : undefined,
        mapping.lhdnClassificationCode ? `LHDN ${mapping.lhdnClassificationCode}` : undefined,
      ].filter(Boolean).join(", ")
    : "no ERP mapping captured";
  const exceptions = input.exceptionsResolved?.length
    ? ` Resolved exceptions: ${input.exceptionsResolved.join(", ")}.`
    : "";
  const approver = input.approver ? ` Approved by ${input.approver}.` : "";
  const note = input.note ? ` Note: ${input.note.trim()}` : "";
  return [
    `${supplier} close decision for ${input.closePeriod ?? "the close period"}: ${input.kind.replace(/_/g, " ")} on ${input.billId}.`,
    `Coding: ${mappingText}.`,
    input.taxTreatment ? `Tax treatment: ${input.taxTreatment}.` : undefined,
    approver.trim() || undefined,
    exceptions.trim() || undefined,
    note.trim() || undefined,
  ].filter(Boolean).join(" ");
}

function toCloseMemory(entry: LocalMemoryEntry, score: number, source: MemorySource): CloseMemory {
  return {
    id: entry.id,
    text: entry.text,
    score,
    metadata: entry.metadata,
    suggestedMapping: entry.metadata.erpMapping,
    source,
  };
}

function localRemember(input: CloseDecisionInput): { written: boolean; source: "local" } {
  const entries = readLocalEntries();
  const entry: LocalMemoryEntry = {
    id: `mem_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    text: memorySentence(input),
    createdAt: new Date().toISOString(),
    metadata: metadataFor(input),
  };
  entries.unshift(entry);
  writeLocalEntries(entries.slice(0, 250));
  return { written: true, source: "local" };
}

export async function rememberCloseDecision(input: CloseDecisionInput): Promise<{ written: boolean; source: MemorySource }> {
  if (hasMem0Key()) {
    try {
      const client = await mem0Client();
      if (client && typeof (client as { add?: unknown }).add === "function") {
        await (client as { add: (messages: unknown, options: unknown) => Promise<unknown> }).add(
          [{ role: "user", content: memorySentence(input) }],
          { user_id: input.clientId, metadata: metadataFor(input) },
        );
        return { written: true, source: "mem0" };
      }
    } catch {
      // Hosted memory is best-effort; local fallback keeps close-book actions safe.
    }
  }
  return localRemember(input);
}

export async function recallSupplierContext(args: {
  clientId: string;
  supplierId?: string;
  query: string;
  limit?: number;
}): Promise<{ memories: CloseMemory[]; source: MemorySource }> {
  const limit = Math.max(1, Math.min(args.limit ?? 5, 12));
  if (hasMem0Key()) {
    try {
      const client = await mem0Client();
      if (client && typeof (client as { search?: unknown }).search === "function") {
        const result = await (client as { search: (query: string, options: unknown) => Promise<unknown> }).search(
          args.query,
          {
            user_id: args.clientId,
            filters: args.supplierId ? { AND: [{ supplierId: args.supplierId }] } : undefined,
            top_k: limit,
          },
        );
        return { memories: mapMem0Results(result).slice(0, limit), source: "mem0" };
      }
    } catch {
      // Fall through to local store.
    }
  }
  return localRecall(args.clientId, args.supplierId, args.query, limit);
}

export async function listClientMemories(clientId: string): Promise<{ memories: CloseMemory[]; source: MemorySource }> {
  if (hasMem0Key()) {
    try {
      const client = await mem0Client();
      if (client && typeof (client as { getAll?: unknown }).getAll === "function") {
        const result = await (client as { getAll: (options: unknown) => Promise<unknown> }).getAll({ user_id: clientId });
        return { memories: mapMem0Results(result), source: "mem0" };
      }
    } catch {
      // Fall through to local store.
    }
  }
  const entries = readLocalEntries().filter((entry) => entry.metadata.clientId === clientId);
  return { memories: entries.map((entry) => toCloseMemory(entry, 100, "local")), source: "local" };
}

function localRecall(clientId: string, supplierId: string | undefined, query: string, limit: number) {
  const memories = readLocalEntries()
    .filter((entry) => entry.metadata.clientId === clientId)
    .filter((entry) => !supplierId || entry.metadata.supplierId === supplierId)
    .map((entry) => toCloseMemory(entry, localScore(query, entry), "local"))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { memories, source: "local" as const };
}

function mapMem0Results(result: unknown): CloseMemory[] {
  const items = Array.isArray(result)
    ? result
    : Array.isArray((result as { results?: unknown[] })?.results)
      ? (result as { results: unknown[] }).results
      : Array.isArray((result as { memories?: unknown[] })?.memories)
        ? (result as { memories: unknown[] }).memories
        : [];
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    const metadata = isMetadata(record.metadata) ? record.metadata : {};
    const text = stringValue(record.memory) ?? stringValue(record.text) ?? stringValue(record.content) ?? "";
    return {
      id: stringValue(record.id) ?? `mem0_${index}`,
      text,
      score: clampScore(record.score),
      metadata,
      suggestedMapping: metadata.erpMapping,
      source: "mem0" as const,
    };
  }).filter((item) => item.text.length > 0);
}

function isMetadata(value: unknown): value is CloseMemory["metadata"] {
  return Boolean(value && typeof value === "object");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export async function seedCloseMemories(): Promise<{ written: number; source: MemorySource }> {
  const seeds: CloseDecisionInput[] = [
    seedDecision("client_laman", "sup_beras", "approval", "bill_1001", {
      destination: "AutoCount",
      vendorId: "AC-V000219",
      apAccountCode: "2100",
      expenseAccountCode: "5010",
      taxCode: "SST-EX",
      costCentre: "LG-KL",
      lhdnClassificationCode: "022",
    }, "sst_exempt", "Nur Aisyah", "Recurring rice supplier; bank evidence matched."),
    seedDecision("client_laman", "sup_cooltech", "approval", "bill_1002", {
      destination: "AutoCount",
      vendorId: "AC-V000104",
      apAccountCode: "2100",
      expenseAccountCode: "6070",
      taxCode: "SST-S8",
      costCentre: "LG-KL",
      lhdnClassificationCode: "036",
    }, "sst_8_service", "Daniel Tan", "Chiller maintenance consistently coded to facilities repairs."),
    seedDecision("client_laman", "sup_meta", "approval", "bill_1003", {
      destination: "AutoCount",
      vendorId: "AC-V000331",
      apAccountCode: "2100",
      expenseAccountCode: "6030",
      taxCode: "SST-IMP",
      costCentre: "LG-MKT",
      lhdnClassificationCode: "037",
    }, "imported_taxable_service", "Amir Rahman", "Imported digital advertising service confirmed."),
    seedDecision("client_batik", "sup_cooltech", "approval", "bill_1005", {
      destination: "SQL Account",
      vendorId: "SQL-V000104",
      apAccountCode: "2100",
      expenseAccountCode: "6070",
      taxCode: "SST-S8",
      costCentre: "BTK-OPS",
      lhdnClassificationCode: "036",
    }, "sst_8_service", "Mei Lin", "Batik Atelier uses SQL Account for the same chiller supplier."),
    seedDecision("client_batik", "sup_meta", "approval", "bill_meta_batik_seed", {
      destination: "SQL Account",
      vendorId: "SQL-V000331",
      apAccountCode: "2100",
      expenseAccountCode: "6030",
      taxCode: "SST-IMP",
      costCentre: "BTK-MKT",
      lhdnClassificationCode: "037",
    }, "imported_taxable_service", "Mei Lin", "Monthly ad spend uses imported-service treatment."),
    {
      ...seedDecision("client_laman", "sup_beras", "exception_resolution", "bill_beras_tax_seed", undefined, undefined, "Nur Aisyah", "Supplier TIN C20477100991 confirmed from supplier master."),
      exceptionsResolved: ["missing_tax_id"],
    },
    {
      ...seedDecision("client_laman", "sup_meta", "exception_resolution", "bill_meta_supplier_seed", undefined, "imported_taxable_service", "Amir Rahman", "Meta supplier approved and imported-service treatment confirmed."),
      exceptionsResolved: ["new_supplier", "imported_service"],
    },
  ];
  let written = 0;
  let source: MemorySource = hasMem0Key() ? "mem0" : "local";
  for (const seed of seeds) {
    const result = await rememberCloseDecision(seed);
    if (result.written) written += 1;
    source = result.source;
  }
  return { written, source };
}

function seedDecision(
  clientId: string,
  supplierId: string,
  kind: CloseDecisionInput["kind"],
  billId: string,
  erpMapping?: Partial<ErpMapping>,
  taxTreatment?: string,
  approver?: string,
  note?: string,
): CloseDecisionInput {
  const client = CLOSE_BOOK_CLIENTS.find((item) => item.id === clientId);
  const supplier = CLOSE_BOOK_SUPPLIERS.find((item) => item.id === supplierId);
  return {
    clientId,
    supplierId,
    supplierName: supplier?.legalName,
    closePeriod: client?.closePeriod,
    kind,
    billId,
    erpMapping,
    taxTreatment,
    approver,
    note,
  };
}
