// Local read model over the backend runtime state. In production this becomes
// the query layer over durable storage; the public shape stays stable for pages.

import * as backend from "@/lib/backend/services";
import { state } from "@/lib/backend/state";
import * as seed from "./seed";

export { seed };

export const NOW = seed.NOW;
export const TODAY = seed.TODAY;

export const ORG = state.org;
export const USERS = state.users;
export const CURRENT_USER_ID = state.currentUserId;
export const ACCOUNTS = state.accounts;
export const TAX_CODES = state.taxCodes;
export const COST_CENTRES = state.costCentres;
export const TRANSACTIONS = state.transactions;
export const RECEIPTS = state.receipts;
export const MATCHES = state.matches;
export const EINVOICES = state.einvoices;
export const RECORDS = state.records;
export const SYNC_REFS = state.syncRefs;
export const APPROVALS = state.approvals;
export const POSITIONS = state.positions;
export const NEWS = state.news;
export const PREFERENCES = state.preferences;
export const COUNTRY_CONFIGS = state.countryConfigs;
export const VENDORS = state.vendors;
export const FORECAST_BUCKETS = state.forecastBuckets;
export const AUDIT = state.audit;

export const FX_TO_MYR = backend.FX_TO_MYR;

export const toBase = backend.toBase;
export const account = backend.account;
export const taxCode = backend.taxCode;
export const costCentre = backend.costCentre;
export const user = backend.user;
export const currentUser = backend.currentUser;
export const receipt = backend.receipt;
export const transaction = backend.transaction;
export const matchForTransaction = backend.matchForTransaction;
export const matchForReceipt = backend.matchForReceipt;
export const spendByAccount = backend.spendByAccount;
export const spendByCostCentre = backend.spendByCostCentre;
export const totalSpendBaseMinor = backend.totalSpendBaseMinor;
export const matchStats = backend.matchStats;
export const receiptStats = backend.receiptStats;
export const einvoiceStats = backend.einvoiceStats;
export const briefingRunState = backend.briefingRunState;
export const listApprovals = backend.listApprovals;
export const openApprovals = backend.openApprovals;
export const closeReadiness = backend.closeReadiness;
export const portfolioStats = backend.portfolioStats;
