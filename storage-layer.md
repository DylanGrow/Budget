# Storage Layer Implementation

Complete IndexedDB wrapper with TypeScript types and transaction management.

## Database Service Implementation

```typescript
// src/storage/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Transaction, Category, Receipt, Budget, AppSettings } from '../types';

interface BudgetDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'date': string;
      'category': string;
      'merchant': string;
      'createdAt': string;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'name': string };
  };
  receipts: {
    key: string;
    value: Receipt;
    indexes: { 'transactionId': string };
  };
  budgets: {
    key: string;
    value: Budget;
    indexes: { 'period': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  undoStack: {
    key: string;
    value: UndoAction;
    indexes: { 'timestamp': number };
  };
}

interface UndoAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  before?: any;
  after?: any;
  timestamp: number;
}

class DatabaseService {
  private db: IDBPDatabase<BudgetDB> | null = null;
  private readonly DB_NAME = 'BudgetAppDB';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    this.db = await openDB<BudgetDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('date', 'date');
          txStore.createIndex('category', 'category');
          txStore.createIndex('merchant', 'merchant');
          txStore.createIndex('createdAt', 'createdAt');
        }

        // Create categories store
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('name', 'name', { unique: true });
        }

        // Create receipts store
        if (!db.objectStoreNames.contains('receipts')) {
          const recStore = db.createObjectStore('receipts', { keyPath: 'id' });
          recStore.createIndex('transactionId', 'transactionId');
        }

        // Create budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
          budgetStore.createIndex('period', 'period');
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Create undo stack store
        if (!db.objectStoreNames.contains('undoStack')) {
          const undoStore = db.createObjectStore('undoStack', { keyPath: 'id' });
          undoStore.createIndex('timestamp', 'timestamp');
        }
      },
      blocked() {
        console.warn('Database upgrade blocked by another tab');
      },
      blocking() {
        console.warn('This tab is blocking database upgrade');
      }
    });

    await this.initializeDefaults();
  }

  private async initializeDefaults(): Promise<void> {
    const settings = await this.db!.get('settings', 'settings');
    if (!settings) {
      // Initialize default settings
      await this.db!.put('settings', {
        id: 'settings',
        defaultCurrency: 'USD',
        currencies: [
          { code: 'USD', symbol: '$', rate: 1.0, decimals: 2 },
          { code: 'EUR', symbol: '€', rate: 0.85, decimals: 2 },
          { code: 'GBP', symbol: '£', rate: 0.73, decimals: 2 },
          { code: 'JPY', symbol: '¥', rate: 110.0, decimals: 0 },
          { code: 'CAD', symbol: 'C$', rate: 1.25, decimals: 2 }
        ],
        theme: 'auto',
        locale: 'en-US',
        dateFormat: 'MM/DD/YYYY',
        firstDayOfWeek: 0,
        receiptMaxSize: 10 * 1024 * 1024, // 10MB
        storageQuotaWarning: 80,
        analyticsEnabled: false,
        version: '1.0.0'
      });

      // Create default categories
      const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'version'>[] = [
        { name: 'Food & Dining', color: '#FF6B6B', icon: '🍔', isSystem: true },
        { name: 'Transportation', color: '#4ECDC4', icon: '🚗', isSystem: true },
        { name: 'Shopping', color: '#95E1D3', icon: '🛍️', isSystem: true },
        { name: 'Entertainment', color: '#F38181', icon: '🎬', isSystem: true },
        { name: 'Bills & Utilities', color: '#AA96DA', icon: '💡', isSystem: true },
        { name: 'Healthcare', color: '#FCBAD3', icon: '⚕️', isSystem: true },
        { name: 'Groceries', color: '#A8E6CF', icon: '🛒', isSystem: true },
        { name: 'Personal Care', color: '#FFD3B6', icon: '💅', isSystem: true },
        { name: 'Education', color: '#FFAAA5', icon: '📚', isSystem: true },
        { name: 'Other', color: '#A8D8EA', icon: '📦', isSystem: true }
      ];

      const tx = this.db!.transaction('categories', 'readwrite');
      for (const cat of defaultCategories) {
        const category: Category = {
          ...cat,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };
        await tx.store.add(category);
      }
      await tx.done;
    }
  }

  // Transaction CRUD Operations
  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Transaction> {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    await this.db!.add('transactions', newTransaction);
    await this.addUndoAction('create', 'transaction', undefined, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const existing = await this.db!.get('transactions', id);
    if (!existing) throw new Error('Transaction not found');
    
    const updated: Transaction = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    };
    await this.db!.put('transactions', updated);
    await this.addUndoAction('update', 'transaction', existing, updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const existing = await this.db!.get('transactions', id);
    if (!existing) throw new Error('Transaction not found');
    
    await this.db!.delete('transactions', id);
    await this.addUndoAction('delete', 'transaction', existing);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.db!.get('transactions', id);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return this.db!.getAll('transactions');
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const all = await this.db!.getAllFromIndex('transactions', 'date');
    return all.filter(tx => tx.date >= startDate && tx.date <= endDate);
  }

  async getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
    return this.db!.getAllFromIndex('transactions', 'category', categoryId);
  }

  // Category CRUD Operations
  async addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Category> {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    await this.db!.add('categories', newCategory);
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const existing = await this.db!.get('categories', id);
    if (!existing) throw new Error('Category not found');
    
    const updated: Category = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    };
    await this.db!.put('categories', updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.db!.get('categories', id);
    if (!category) throw new Error('Category not found');
    if (category.isSystem) throw new Error('Cannot delete system category');
    
    // Check if category is in use
    const transactions = await this.getTransactionsByCategory(id);
    if (transactions.length > 0) {
      throw new Error('Cannot delete category with existing transactions');
    }
    
    await this.db!.delete('categories', id);
  }

  async getAllCategories(): Promise<Category[]> {
    return this.db!.getAll('categories');
  }

  async mergeCategories(sourceId: string, targetId: string): Promise<void> {
    const source = await this.db!.get('categories', sourceId);
    const target = await this.db!.get('categories', targetId);
    
    if (!source || !target) throw new Error('Category not found');
    if (source.isSystem) throw new Error('Cannot merge system category');
    
    // Update all transactions from source to target
    const transactions = await this.getTransactionsByCategory(sourceId);
    const tx = this.db!.transaction('transactions', 'readwrite');
    
    for (const transaction of transactions) {
      await tx.store.put({ ...transaction, category: targetId });
    }
    await tx.done;
    
    // Delete source category
    await this.db!.delete('categories', sourceId);
  }

  // Receipt Operations
  async addReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
    // Check size limit
    const settings = await this.getSettings();
    if (receipt.size > settings.receiptMaxSize) {
      throw new Error(`Receipt size exceeds limit of ${settings.receiptMaxSize} bytes`);
    }
    
    const newReceipt: Receipt = {
      ...receipt,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    await this.db!.add('receipts', newReceipt);
    return newReceipt;
  }

  async getReceipt(id: string): Promise<Receipt | undefined> {
    return this.db!.get('receipts', id);
  }

  async getReceiptByTransaction(transactionId: string): Promise<Receipt | undefined> {
    const receipts = await this.db!.getAllFromIndex('receipts', 'transactionId', transactionId);
    return receipts[0];
  }

  async deleteReceipt(id: string): Promise<void> {
    await this.db!.delete('receipts', id);
  }

  // Budget Operations
  async addBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const newBudget: Budget = {
      ...budget,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db!.add('budgets', newBudget);
    return newBudget;
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget> {
    const existing = await this.db!.get('budgets', id);
    if (!existing) throw new Error('Budget not found');
    
    const updated: Budget = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    await this.db!.put('budgets', updated);
    return updated;
  }

  async deleteBudget(id: string): Promise<void> {
    await this.db!.delete('budgets', id);
  }

  async getAllBudgets(): Promise<Budget[]> {
    return this.db!.getAll('budgets');
  }

  // Settings Operations
  async getSettings(): Promise<AppSettings> {
    const settings = await this.db!.get('settings', 'settings');
    if (!settings) throw new Error('Settings not initialized');
    return settings;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const existing = await this.getSettings();
    const updated = { ...existing, ...updates };
    await this.db!.put('settings', updated);
    return updated;
  }

  // Undo/Redo Operations
  private async addUndoAction(
    action: 'create' | 'update' | 'delete',
    entityType: string,
    before?: any,
    after?: any
  ): Promise<void> {
    const undoAction: UndoAction = {
      id: crypto.randomUUID(),
      action,
      entityType,
      before,
      after,
      timestamp: Date.now()
    };
    
    await this.db!.add('undoStack', undoAction);
    
    // Keep only last 50 actions
    const all = await this.db!.getAllFromIndex('undoStack', 'timestamp');
    if (all.length > 50) {
      const toDelete = all.slice(0, all.length - 50);
      const tx = this.db!.transaction('undoStack', 'readwrite');
      await Promise.all(toDelete.map(action => tx.store.delete(action.id)));
      await tx.done;
    }
  }

  async getUndoStack(): Promise<UndoAction[]> {
    const all = await this.db!.getAllFromIndex('undoStack', 'timestamp');
    return all.reverse(); // Most recent first
  }

  async undo(): Promise<void> {
    const stack = await this.getUndoStack();
    if (stack.length === 0) return;
    
    const action = stack[0];
    
    switch (action.action) {
      case 'create':
        // Undo create by deleting
        await this.db!.delete(action.entityType as any, action.after.id);
        break;
      case 'update':
        // Undo update by restoring previous version
        await this.db!.put(action.entityType as any, action.before);
        break;
      case 'delete':
        // Undo delete by recreating
        await this.db!.add(action.entityType as any, action.before);
        break;
    }
    
    // Remove from undo stack
    await this.db!.delete('undoStack', action.id);
  }

  async clearUndoStack(): Promise<void> {
    await this.db!.clear('undoStack');
  }

  // Storage Quota Management
  async getStorageEstimate(): Promise<{ usage: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;
      return { usage, quota, percentage };
    }
    return { usage: 0, quota: 0, percentage: 0 };
  }

  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return await navigator.storage.persist();
    }
    return false;
  }

  // Utility Methods
  async clear(storeName: keyof BudgetDB): Promise<void> {
    await this.db!.clear(storeName);
  }

  async clearAll(): Promise<void> {
    const stores: (keyof BudgetDB)[] = [
      'transactions',
      'categories',
      'receipts',
      'budgets',
      'undoStack'
    ];
    
    for (const store of stores) {
      await this.clear(store);
    }
    
    // Reinitialize defaults
    await this.initializeDefaults();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();
```

## Usage Examples

### Initialize Database

```typescript
import { db } from './storage/db';

// Initialize on app start
await db.init();

// Request persistent storage (optional)
const isPersistent = await db.requestPersistentStorage();
console.log('Persistent storage:', isPersistent);
```

### Add Transaction

```typescript
const transaction = await db.addTransaction({
  amount: 4599, // $45.99 in cents
  currency: 'USD',
  date: new Date().toISOString(),
  category: 'food-category-id',
  merchant: 'Starbucks',
  paymentMethod: 'Credit Card',
  tags: ['coffee', 'morning'],
  note: 'Morning coffee'
});
```

### Query Transactions

```typescript
// Get all transactions
const all = await db.getAllTransactions();

// Get by date range
const thisMonth = await db.getTransactionsByDateRange(
  '2026-05-01T00:00:00Z',
  '2026-05-31T23:59:59Z'
);

// Get by category
const foodTransactions = await db.getTransactionsByCategory('food-category-id');
```

### Undo Last Action

```typescript
await db.undo();
```

### Check Storage Usage

```typescript
const { usage, quota, percentage } = await db.getStorageEstimate();
console.log(`Using ${percentage.toFixed(1)}% of storage`);

if (percentage > 80) {
  // Warn user about storage
}
```

## Error Handling

```typescript
try {
  await db.addTransaction(transactionData);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Handle storage quota exceeded
    alert('Storage quota exceeded. Please delete old data or export a backup.');
  } else {
    // Handle other errors
    console.error('Failed to add transaction:', error);
  }
}
```

## Performance Considerations

1. **Batch Operations**: Use transactions for multiple operations
2. **Indexed Queries**: Always use indexes for filtering
3. **Lazy Loading**: Load receipts only when needed
4. **Pagination**: Implement pagination for large transaction lists

```typescript
// Batch insert example
async function batchAddTransactions(transactions: Transaction[]): Promise<void> {
  const tx = db.transaction('transactions', 'readwrite');
  await Promise.all(transactions.map(t => tx.store.add(t)));
  await tx.done;
}