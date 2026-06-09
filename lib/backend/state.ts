import fs from "node:fs";
import path from "node:path";
import { chainHash, fnv1a } from "@/lib/hash";
import * as seed from "@/lib/data/seed";
import {
  CLOSE_BOOK_CLIENTS,
  CLOSE_BOOK_SUPPLIERS,
  VERIFIED_BILL_RECORDS,
  type CloseBookClient,
  type CloseBookSupplier,
  type VerifiedBillRecord,
} from "@/lib/erp-close";
import type {
  AccountingSyncRef,
  ApprovalRequest,
  AuditLogEntry,
  Booking,
  BookingQuote,
  ChartOfAccount,
  CostCentre,
  CountryConfig,
  EInvoice,
  ForecastBucket,
  Match,
  NewsItem,
  Organization,
  Position,
  Receipt,
  RecordEntry,
  TaxCode,
  TransactionEvent,
  User,
  UserPreference,
  Vendor,
} from "@/lib/types";

export type RawAuditEvent = (typeof seed.RAW_AUDIT)[number];
export type ConnectorState = {
  name: string;
  kind: string;
  state: "available" | "connected";
};

export interface OnboardingRun {
  id: string;
  completedAt: string;
  legalName: string;
  country: Organization["country"];
  industry: string;
  accountingProvider: string;
  feeds: string[];
}

export interface ForecastRun {
  id: string;
  createdAt: string;
  horizonDays: number;
  assumptions: Record<string, unknown>;
}

export interface WorkflowRun {
  id: string;
  functionId: string;
  action: string;
  status: "queued" | "running" | "approval_required" | "completed" | "rejected";
  createdAt: string;
  approvalId?: string;
}

export interface ExportBatch {
  id: string;
  createdAt: string;
  destination: string;
  recordIds: string[];
  exportedRecords: string[];
  blockedRecords: string[];
  fileRef?: string;
}

export interface BackendState {
  schemaVersion: 1;
  org: Organization;
  users: User[];
  currentUserId: string;
  accounts: ChartOfAccount[];
  taxCodes: TaxCode[];
  costCentres: CostCentre[];
  transactions: TransactionEvent[];
  receipts: Receipt[];
  matches: Match[];
  einvoices: EInvoice[];
  records: RecordEntry[];
  syncRefs: AccountingSyncRef[];
  approvals: ApprovalRequest[];
  positions: Position[];
  news: NewsItem[];
  preferences: UserPreference;
  countryConfigs: CountryConfig[];
  bookingQuotes: BookingQuote[];
  bookings: Booking[];
  vendors: Vendor[];
  forecastBuckets: ForecastBucket[];
  forecastRuns: ForecastRun[];
  workflowRuns: WorkflowRun[];
  closeBookClients: CloseBookClient[];
  closeBookSuppliers: CloseBookSupplier[];
  closeBookRecords: VerifiedBillRecord[];
  exportBatches: ExportBatch[];
  connectors: ConnectorState[];
  rawAudit: RawAuditEvent[];
  onboardingRuns: OnboardingRun[];
}

const INITIAL_CONNECTORS: ConnectorState[] = [
  { name: "AutoCount", kind: "Accounting (local)", state: "connected" },
  { name: "Xero", kind: "Accounting (SG entity)", state: "connected" },
  { name: "SQL Account", kind: "Accounting (local)", state: "available" },
  { name: "LHDN MyInvois", kind: "E-invoicing (MY)", state: "connected" },
  { name: "Peppol / InvoiceNow", kind: "E-invoicing (SG)", state: "connected" },
  { name: "Maybank / CIMB / DBS", kind: "Transaction feed (CSV)", state: "connected" },
];

export interface RuntimeState extends BackendState {
  audit: AuditLogEntry[];
}

const STORE_KEY = "__kiraBackendRuntime__";
const DATA_DIR = path.join(process.cwd(), ".kira-data");
const SNAPSHOT_PATH = path.join(DATA_DIR, "state.json");

type GlobalWithRuntime = typeof globalThis & {
  [STORE_KEY]?: RuntimeState;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function initialState(): RuntimeState {
  const state: BackendState = {
    schemaVersion: 1,
    org: clone(seed.ORG),
    users: clone(seed.USERS),
    currentUserId: seed.CURRENT_USER_ID,
    accounts: clone(seed.ACCOUNTS),
    taxCodes: clone(seed.TAX_CODES),
    costCentres: clone(seed.COST_CENTRES),
    transactions: clone(seed.TRANSACTIONS),
    receipts: clone(seed.RECEIPTS),
    matches: clone(seed.MATCHES),
    einvoices: clone(seed.EINVOICES),
    records: clone(seed.RECORDS),
    syncRefs: clone(seed.SYNC_REFS),
    approvals: clone(seed.APPROVALS),
    positions: clone(seed.POSITIONS),
    news: clone(seed.NEWS),
    preferences: clone(seed.PREFERENCES),
    countryConfigs: clone(seed.COUNTRY_CONFIGS),
    bookingQuotes: clone(seed.BOOKING_QUOTES),
    bookings: clone(seed.BOOKINGS),
    vendors: clone(seed.VENDORS),
    forecastBuckets: clone(seed.FORECAST_BUCKETS),
    forecastRuns: [],
    workflowRuns: [],
    closeBookClients: clone(CLOSE_BOOK_CLIENTS),
    closeBookSuppliers: clone(CLOSE_BOOK_SUPPLIERS),
    closeBookRecords: clone(VERIFIED_BILL_RECORDS),
    exportBatches: [],
    connectors: clone(INITIAL_CONNECTORS),
    rawAudit: clone(seed.RAW_AUDIT),
    onboardingRuns: [],
  };
  return { ...state, audit: materializeAudit(state.rawAudit) };
}

function readSnapshot(): RuntimeState | null {
  try {
    if (!fs.existsSync(SNAPSHOT_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as BackendState;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.rawAudit)) return null;
    const fallback = initialState();
    const normalized: BackendState = {
      ...snapshotOf(fallback),
      ...parsed,
      org: parsed.org ?? fallback.org,
      users: parsed.users ?? fallback.users,
      accounts: parsed.accounts ?? fallback.accounts,
      taxCodes: parsed.taxCodes ?? fallback.taxCodes,
      costCentres: parsed.costCentres ?? fallback.costCentres,
      transactions: parsed.transactions ?? fallback.transactions,
      receipts: parsed.receipts ?? fallback.receipts,
      matches: parsed.matches ?? fallback.matches,
      einvoices: parsed.einvoices ?? fallback.einvoices,
      records: parsed.records ?? fallback.records,
      syncRefs: parsed.syncRefs ?? fallback.syncRefs,
      approvals: parsed.approvals ?? fallback.approvals,
      positions: parsed.positions ?? fallback.positions,
      news: parsed.news ?? fallback.news,
      preferences: parsed.preferences ?? fallback.preferences,
      countryConfigs: parsed.countryConfigs ?? fallback.countryConfigs,
      bookingQuotes: parsed.bookingQuotes ?? fallback.bookingQuotes,
      bookings: parsed.bookings ?? fallback.bookings,
      vendors: parsed.vendors ?? fallback.vendors,
      forecastBuckets: parsed.forecastBuckets ?? fallback.forecastBuckets,
      forecastRuns: parsed.forecastRuns ?? fallback.forecastRuns,
      workflowRuns: parsed.workflowRuns ?? fallback.workflowRuns,
      closeBookClients: parsed.closeBookClients ?? fallback.closeBookClients,
      closeBookSuppliers: parsed.closeBookSuppliers ?? fallback.closeBookSuppliers,
      closeBookRecords: parsed.closeBookRecords ?? fallback.closeBookRecords,
      exportBatches: parsed.exportBatches ?? fallback.exportBatches,
      connectors: parsed.connectors ?? fallback.connectors,
      rawAudit: parsed.rawAudit,
      onboardingRuns: parsed.onboardingRuns ?? fallback.onboardingRuns,
    };
    return { ...normalized, audit: materializeAudit(normalized.rawAudit) };
  } catch {
    return null;
  }
}

function snapshotOf(runtime: RuntimeState): BackendState {
  const { audit: _audit, ...snapshot } = runtime;
  return clone(snapshot);
}

export function persistState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshotOf(state), null, 2)}\n`);
}

export function resetState() {
  const next = initialState();
  Object.assign(state.org, next.org);
  replaceArray(state.users, next.users);
  state.currentUserId = next.currentUserId;
  replaceArray(state.accounts, next.accounts);
  replaceArray(state.taxCodes, next.taxCodes);
  replaceArray(state.costCentres, next.costCentres);
  replaceArray(state.transactions, next.transactions);
  replaceArray(state.receipts, next.receipts);
  replaceArray(state.matches, next.matches);
  replaceArray(state.einvoices, next.einvoices);
  replaceArray(state.records, next.records);
  replaceArray(state.syncRefs, next.syncRefs);
  replaceArray(state.approvals, next.approvals);
  replaceArray(state.positions, next.positions);
  replaceArray(state.news, next.news);
  Object.assign(state.preferences, next.preferences);
  replaceArray(state.countryConfigs, next.countryConfigs);
  replaceArray(state.bookingQuotes, next.bookingQuotes);
  replaceArray(state.bookings, next.bookings);
  replaceArray(state.vendors, next.vendors);
  replaceArray(state.forecastBuckets, next.forecastBuckets);
  replaceArray(state.forecastRuns, next.forecastRuns);
  replaceArray(state.workflowRuns, next.workflowRuns);
  replaceArray(state.closeBookClients, next.closeBookClients);
  replaceArray(state.closeBookSuppliers, next.closeBookSuppliers);
  replaceArray(state.closeBookRecords, next.closeBookRecords);
  replaceArray(state.exportBatches, next.exportBatches);
  replaceArray(state.connectors, next.connectors);
  replaceArray(state.rawAudit, next.rawAudit);
  replaceArray(state.onboardingRuns, next.onboardingRuns);
  refreshAudit();
  persistState();
}

export function refreshAudit() {
  replaceArray(state.audit, materializeAudit(state.rawAudit));
}

export function appendAudit(event: Omit<RawAuditEvent, "at"> & { at?: string }) {
  state.rawAudit.push({
    at: event.at ?? new Date().toISOString(),
    actor: event.actor,
    action: event.action,
    target: event.target,
    detail: event.detail,
    tier: event.tier,
  });
  refreshAudit();
  persistState();
}

export function nextId(prefix: string, existing: readonly { id: string }[]) {
  let n = existing.length + 1;
  let id = `${prefix}_${String(n).padStart(2, "0")}`;
  const ids = new Set(existing.map((item) => item.id));
  while (ids.has(id)) {
    n += 1;
    id = `${prefix}_${String(n).padStart(2, "0")}`;
  }
  return id;
}

export function confirmationRef(seedText: string) {
  return `KR-${fnv1a(`${seedText}|${state.rawAudit.length}`).slice(0, 6).toUpperCase()}`;
}

function materializeAudit(raw: RawAuditEvent[]): AuditLogEntry[] {
  const sorted = [...raw].sort((a, b) => a.at.localeCompare(b.at));
  let prev = "genesis0000000000";
  return sorted.map((e, i): AuditLogEntry => {
    const payload = `${e.at}|${e.actor}|${e.action}|${e.target ?? ""}|${e.detail}|tier:${e.tier ?? ""}`;
    const hash = chainHash(prev, payload);
    const entry: AuditLogEntry = {
      seq: i + 1,
      at: e.at,
      actor: e.actor,
      action: e.action,
      target: e.target,
      detail: e.detail,
      prevHash: prev,
      hash,
      tier: e.tier,
    };
    prev = hash;
    return entry;
  });
}

function replaceArray<T>(target: T[], source: readonly T[]) {
  target.splice(0, target.length, ...clone(source));
}

const globalRuntime = globalThis as GlobalWithRuntime;

export const state: RuntimeState =
  globalRuntime[STORE_KEY] ?? (globalRuntime[STORE_KEY] = readSnapshot() ?? initialState());

export const snapshotPath = SNAPSHOT_PATH;
