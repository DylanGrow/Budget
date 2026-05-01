# Implementation Guide

Complete implementation details for core features, PWA setup, testing, and deployment.

## Core Services Implementation

### Transaction Service

```typescript
// src/services/transaction-service.ts
import { db } from '../storage/db';
import type { Transaction, TransactionFilters } from '../types';

class TransactionService {
  /**
   * Add new transaction with validation
   */
  async addTransaction(
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<Transaction> {
    // Validate amount
    if (data.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Validate splits if present
    if (data.splits && data.splits.length > 0) {
      const splitTotal = data.splits.reduce((sum, split) => sum + split.amount, 0);
      if (splitTotal !== data.amount) {
        throw new Error('Split amounts must sum to transaction amount');
      }
    }

    // Validate category exists
    const category = await db.get('categories', data.category);
    if (!category) {
      throw new Error('Invalid category');
    }

    // Create transaction
    const transaction = await db.addTransaction(data);

    // Update budget tracking
    await this.updateBudgetProgress(transaction);

    // Trigger notification if needed
    await this.checkBudgetAlerts(transaction);

    return transaction;
  }

  /**
   * Search and filter transactions
   */
  async searchTransactions(filters: TransactionFilters): Promise<Transaction[]> {
    let transactions = await db.getAllTransactions();

    // Apply date range filter
    if (filters.dateRange) {
      transactions = transactions.filter(
        tx => tx.date >= filters.dateRange!.start && tx.date <= filters.dateRange!.end
      );
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      transactions = transactions.filter(tx => filters.categories!.includes(tx.category));
    }

    // Apply merchant filter
    if (filters.merchants && filters.merchants.length > 0) {
      transactions = transactions.filter(
        tx => tx.merchant && filters.merchants!.includes(tx.merchant)
      );
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      transactions = transactions.filter(tx =>
        filters.tags!.some(tag => tx.tags.includes(tag))
      );
    }

    // Apply amount range filter
    if (filters.amountRange) {
      transactions = transactions.filter(
        tx =>
          tx.amount >= filters.amountRange!.min &&
          tx.amount <= filters.amountRange!.max
      );
    }

    // Apply text search
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      transactions = transactions.filter(
        tx =>
          tx.merchant?.toLowerCase().includes(search) ||
          tx.note?.toLowerCase().includes(search) ||
          tx.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
  }

  /**
   * Get spending summary for period
   */
  async getSpendingSummary(startDate: string, endDate: string) {
    const transactions = await db.getTransactionsByDateRange(startDate, endDate);
    const categories = await db.getAllCategories();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const byCategory = new Map<string, number>();
    const byMerchant = new Map<string, number>();

    for (const tx of transactions) {
      // By category
      const current = byCategory.get(tx.category) || 0;
      byCategory.set(tx.category, current + tx.amount);

      // By merchant
      if (tx.merchant) {
        const merchantTotal = byMerchant.get(tx.merchant) || 0;
        byMerchant.set(tx.merchant, merchantTotal + tx.amount);
      }
    }

    // Convert to arrays and sort
    const categoryBreakdown = Array.from(byCategory.entries())
      .map(([id, amount]) => ({
        category: categoryMap.get(id)!,
        amount,
        percentage: (amount / total) * 100
      }))
      .sort((a, b) => b.amount - a.amount);

    const topMerchants = Array.from(byMerchant.entries())
      .map(([merchant, amount]) => ({ merchant, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      total,
      count: transactions.length,
      average: total / transactions.length || 0,
      categoryBreakdown,
      topMerchants
    };
  }

  private async updateBudgetProgress(transaction: Transaction): Promise<void> {
    const budgets = await db.getAllBudgets();
    const relevantBudgets = budgets.filter(b => b.categories.includes(transaction.category));

    for (const budget of relevantBudgets) {
      const periodStart = this.getPeriodStart(budget.period);
      const periodTransactions = await db.getTransactionsByDateRange(
        periodStart,
        new Date().toISOString()
      );

      const spent = periodTransactions
        .filter(tx => budget.categories.includes(tx.category))
        .reduce((sum, tx) => sum + tx.amount, 0);

      const percentage = (spent / budget.amount) * 100;

      if (percentage >= budget.alertThreshold) {
        await this.triggerBudgetAlert(budget, spent, percentage);
      }
    }
  }

  private async checkBudgetAlerts(transaction: Transaction): Promise<void> {
    const category = await db.get('categories', transaction.category);
    if (!category?.budget) return;

    const periodStart = this.getPeriodStart(category.budget.period);
    const transactions = await db.getTransactionsByDateRange(
      periodStart,
      new Date().toISOString()
    );

    const spent = transactions
      .filter(tx => tx.category === category.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const percentage = (spent / category.budget.amount) * 100;

    if (percentage >= category.budget.alertThreshold) {
      await this.triggerBudgetAlert(
        { name: category.name, amount: category.budget.amount } as any,
        spent,
        percentage
      );
    }
  }

  private getPeriodStart(period: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'weekly':
        const day = now.getDay();
        const diff = now.getDate() - day;
        return new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  }

  private async triggerBudgetAlert(
    budget: { name: string; amount: number },
    spent: number,
    percentage: number
  ): Promise<void> {
    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Budget Alert', {
        body: `You've spent ${percentage.toFixed(0)}% of your ${budget.name} budget`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `budget-${budget.name}`,
        requireInteraction: false
      });
    }

    // Also show in-app alert
    this.showInAppAlert(budget, spent, percentage);
  }

  private showInAppAlert(
    budget: { name: string; amount: number },
    spent: number,
    percentage: number
  ): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(
      new CustomEvent('budget-alert', {
        detail: { budget, spent, percentage }
      })
    );
  }
}

export const transactionService = new TransactionService();
```

### Recurring Transactions Service

```typescript
// src/services/recurring.ts
import { db } from '../storage/db';
import type { Transaction, RecurringConfig } from '../types';

class RecurringService {
  private checkInterval: number | null = null;

  /**
   * Start recurring transaction processor
   */
  start(): void {
    // Check every hour
    this.checkInterval = window.setInterval(() => {
      this.processRecurringTransactions();
    }, 60 * 60 * 1000);

    // Check immediately on start
    this.processRecurringTransactions();
  }

  /**
   * Stop recurring transaction processor
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Process due recurring transactions
   */
  async processRecurringTransactions(): Promise<void> {
    const transactions = await db.getAllTransactions();
    const recurring = transactions.filter(tx => tx.recurring);

    for (const template of recurring) {
      if (!template.recurring) continue;

      const nextDate = new Date(template.recurring.nextOccurrence);
      const now = new Date();

      // Check if end date has passed
      if (template.recurring.endDate) {
        const endDate = new Date(template.recurring.endDate);
        if (now > endDate) {
          // Remove recurring config
          await db.updateTransaction(template.id, { recurring: undefined });
          continue;
        }
      }

      // Create instance if due
      if (nextDate <= now) {
        await this.createRecurringInstance(template);
      }
    }
  }

  /**
   * Create instance of recurring transaction
   */
  private async createRecurringInstance(template: Transaction): Promise<void> {
    if (!template.recurring) return;

    const newTransaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version'> = {
      amount: template.amount,
      currency: template.currency,
      date: new Date().toISOString(),
      category: template.category,
      merchant: template.merchant,
      paymentMethod: template.paymentMethod,
      tags: [...template.tags, 'recurring'],
      note: template.note,
      splits: template.splits,
      recurring: {
        ...template.recurring,
        nextOccurrence: this.calculateNextOccurrence(template.recurring)
      }
    };

    await db.addTransaction(newTransaction);

    // Update template's next occurrence
    await db.updateTransaction(template.id, {
      recurring: {
        ...template.recurring,
        nextOccurrence: this.calculateNextOccurrence(template.recurring)
      }
    });
  }

  /**
   * Calculate next occurrence date
   */
  private calculateNextOccurrence(config: RecurringConfig): string {
    const current = new Date(config.nextOccurrence);

    switch (config.frequency) {
      case 'daily':
        current.setDate(current.getDate() + config.interval);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7 * config.interval);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + config.interval);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + config.interval);
        break;
    }

    return current.toISOString();
  }

  /**
   * Create recurring transaction template
   */
  async createRecurringTemplate(
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
    config: Omit<RecurringConfig, 'seriesId'>
  ): Promise<Transaction> {
    const seriesId = crypto.randomUUID();
    const recurringConfig: RecurringConfig = {
      ...config,
      seriesId
    };

    return db.addTransaction({
      ...transaction,
      recurring: recurringConfig,
      tags: [...transaction.tags, 'recurring-template']
    });
  }
}

export const recurringService = new RecurringService();
```

## PWA Setup

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/', // Change to '/repo-name/' for GitHub Pages
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Budget Tracker - Offline Budget Manager',
        short_name: 'Budget',
        description: 'Privacy-focused offline budget tracker with encrypted backups',
        theme_color: '#4ECDC4',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js'],
          'idb': ['idb']
        }
      }
    }
  }
});
```

### Service Worker Registration

```typescript
// src/main.ts
import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available! Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  }
});

// Initialize app
async function initApp() {
  // Initialize database
  await db.init();
  
  // Start recurring transaction processor
  recurringService.start();
  
  // Initialize router
  router.init();
  
  // Check for updates periodically
  setInterval(() => {
    updateSW();
  }, 60 * 60 * 1000); // Check every hour
}

initApp();
```

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/storage.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../src/storage/db';

describe('Database Service', () => {
  beforeEach(async () => {
    await db.init();
  });

  afterEach(async () => {
    await db.clearAll();
    await db.close();
  });

  it('should add transaction', async () => {
    const transaction = await db.addTransaction({
      amount: 1000,
      currency: 'USD',
      date: new Date().toISOString(),
      category: 'test-category',
      tags: []
    });

    expect(transaction.id).toBeDefined();
    expect(transaction.amount).toBe(1000);
  });

  it('should update transaction', async () => {
    const transaction = await db.addTransaction({
      amount: 1000,
      currency: 'USD',
      date: new Date().toISOString(),
      category: 'test-category',
      tags: []
    });

    const updated = await db.updateTransaction(transaction.id, {
      amount: 2000
    });

    expect(updated.amount).toBe(2000);
    expect(updated.version).toBe(2);
  });

  it('should delete transaction', async () => {
    const transaction = await db.addTransaction({
      amount: 1000,
      currency: 'USD',
      date: new Date().toISOString(),
      category: 'test-category',
      tags: []
    });

    await db.deleteTransaction(transaction.id);
    const found = await db.getTransaction(transaction.id);
    expect(found).toBeUndefined();
  });
});
```

### Integration Tests

```typescript
// tests/integration/import-export.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { importExport } from '../../src/services/import-export';
import { encryption } from '../../src/crypto/encryption';
import { db } from '../../src/storage/db';

describe('Import/Export Service', () => {
  beforeEach(async () => {
    await db.init();
  });

  it('should create and restore encrypted backup', async () => {
    // Add test data
    await db.addTransaction({
      amount: 1000,
      currency: 'USD',
      date: new Date().toISOString(),
      category: 'test-category',
      tags: []
    });

    // Create backup
    const passphrase = 'test-passphrase-123';
    const backupData = {
      transactions: await db.getAllTransactions(),
      categories: await db.getAllCategories(),
      budgets: await db.getAllBudgets(),
      receipts: [],
      settings: await db.getSettings()
    };

    const encrypted = await encryption.encrypt(backupData, passphrase);
    expect(encrypted.manifest.transactionCount).toBe(1);

    // Clear database
    await db.clearAll();

    // Restore backup
    const decrypted = await encryption.decrypt(encrypted, passphrase);
    expect(decrypted.transactions.length).toBe(1);
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/pwa-install.spec.ts
import { test, expect } from '@playwright/test';

test('should install PWA', async ({ page, context }) => {
  await page.goto('/');

  // Wait for service worker registration
  await page.waitForFunction(() => 'serviceWorker' in navigator);

  // Check manifest
  const manifestLink = await page.locator('link[rel="manifest"]');
  expect(await manifestLink.getAttribute('href')).toBeTruthy();

  // Check installability
  let installPromptFired = false;
  await context.exposeFunction('beforeinstallprompt', () => {
    installPromptFired = true;
  });

  // Trigger install prompt
  await page.evaluate(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      (window as any).beforeinstallprompt();
    });
  });

  // Note: Actual install testing requires manual intervention
  // This test verifies PWA prerequisites
});

test('should work offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Go offline
  await context.setOffline(true);

  // Navigate to transactions
  await page.click('text=Transactions');
  await expect(page.locator('h1')).toContainText('Transactions');

  // Add transaction offline
  await page.click('text=Add Transaction');
  await page.fill('input[name="amount"]', '25.99');
  await page.selectOption('select[name="category"]', { index: 0 });
  await page.click('button[type="submit"]');

  // Verify transaction added
  await expect(page.locator('text=$25.99')).toBeVisible();
});
```

## CI/CD Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Package.json Scripts

```json
{
  "name": "budget-pwa",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "idb": "^8.0.0",
    "chart.js": "^4.4.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "vitest": "^1.0.0",
    "workbox-window": "^7.0.0"
  }
}
```

This implementation guide provides the complete foundation for building the offline budget PWA with all core features, PWA capabilities, comprehensive testing, and automated deployment.