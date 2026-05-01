// Core data types for Budget PWA

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  merchant?: string;
  paymentMethod?: string;
  tags: string[];
  note?: string;
  receiptId?: string;
  splits?: TransactionSplit[];
  recurring?: RecurringConfig;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface TransactionSplit {
  categoryId: string;
  amount: number;
  note?: string;
}

export interface RecurringConfig {
  seriesId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  nextOccurrence: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId?: string;
  budget?: CategoryBudget;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CategoryBudget {
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
  rollover: boolean;
  alertThreshold: number;
}

export interface Receipt {
  id: string;
  transactionId: string;
  blob: Blob;
  mimeType: string;
  size: number;
  thumbnail?: Blob;
  ocrText?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  categories: string[];
  rollover: boolean;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: 'settings';
  defaultCurrency: string;
  currencies: CurrencyConfig[];
  defaultCategory?: string;
  theme: 'light' | 'dark' | 'auto';
  locale: string;
  dateFormat: string;
  firstDayOfWeek: 0 | 1;
  receiptMaxSize: number;
  storageQuotaWarning: number;
  analyticsEnabled: boolean;
  lastBackupDate?: string;
  version: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number;
  decimals: number;
}

export interface UndoAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  before?: any;
  after?: any;
  timestamp: number;
}

export interface TransactionFilters {
  dateRange?: { start: string; end: string };
  categories?: string[];
  merchants?: string[];
  tags?: string[];
  amountRange?: { min: number; max: number };
  searchText?: string;
}

export interface EncryptedBackup {
  version: string;
  timestamp: string;
  salt: string;
  iv: string;
  data: string;
  manifest: BackupManifest;
}

export interface BackupManifest {
  appVersion: string;
  transactionCount: number;
  categoryCount: number;
  budgetCount: number;
  receiptCount: number;
  totalSize: number;
}

export interface BackupData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  receipts: Receipt[];
  settings: AppSettings;
}

export type ImportStrategy = 'merge' | 'replace';

export interface ImportResult {
  transactionsImported: number;
  categoriesImported: number;
  budgetsImported: number;
  receiptsImported: number;
  conflicts: number;
}

// Made with Bob
