# Encryption & Import/Export Specification

Complete implementation of client-side encryption and backup/restore functionality.

## Encryption Service

```typescript
// src/crypto/encryption.ts

interface EncryptedBackup {
  version: string;              // Backup format version
  timestamp: string;            // ISO 8601
  salt: string;                 // Base64 encoded
  iv: string;                   // Base64 encoded
  data: string;                 // Base64 encoded encrypted data
  manifest: BackupManifest;
}

interface BackupManifest {
  appVersion: string;
  transactionCount: number;
  categoryCount: number;
  budgetCount: number;
  receiptCount: number;
  totalSize: number;            // Bytes
}

interface BackupData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  receipts: Receipt[];
  settings: AppSettings;
}

class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly ITERATIONS = 100000;
  private readonly SALT_LENGTH = 16;
  private readonly IV_LENGTH = 12;

  /**
   * Derive encryption key from passphrase using PBKDF2
   */
  async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      passphraseKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt backup data with user passphrase
   */
  async encrypt(data: BackupData, passphrase: string): Promise<EncryptedBackup> {
    // Validate passphrase strength
    if (passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters');
    }

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Derive encryption key
    const key = await this.deriveKey(passphrase, salt);

    // Serialize data to JSON
    const encoder = new TextEncoder();
    const serialized = encoder.encode(JSON.stringify(data));

    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      serialized
    );

    // Create manifest
    const manifest: BackupManifest = {
      appVersion: data.settings.version,
      transactionCount: data.transactions.length,
      categoryCount: data.categories.length,
      budgetCount: data.budgets.length,
      receiptCount: data.receipts.length,
      totalSize: serialized.byteLength
    };

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encrypted),
      manifest
    };
  }

  /**
   * Decrypt backup data with user passphrase
   */
  async decrypt(backup: EncryptedBackup, passphrase: string): Promise<BackupData> {
    // Decode salt, IV, and encrypted data
    const salt = this.base64ToArrayBuffer(backup.salt);
    const iv = this.base64ToArrayBuffer(backup.iv);
    const encrypted = this.base64ToArrayBuffer(backup.data);

    // Derive decryption key
    const key = await this.deriveKey(passphrase, new Uint8Array(salt));

    // Decrypt data
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: new Uint8Array(iv) },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      const json = decoder.decode(decrypted);
      return JSON.parse(json);
    } catch (error) {
      throw new Error('Decryption failed. Invalid passphrase or corrupted backup.');
    }
  }

  /**
   * Export encrypted backup to file
   */
  async exportToFile(backup: EncryptedBackup, filename?: string): Promise<void> {
    const defaultFilename = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import encrypted backup from file
   */
  async importFromFile(file: File): Promise<EncryptedBackup> {
    if (!file.name.endsWith('.json')) {
      throw new Error('Invalid file type. Expected .json file.');
    }

    const text = await file.text();
    const backup = JSON.parse(text) as EncryptedBackup;

    // Validate backup structure
    if (!backup.version || !backup.salt || !backup.iv || !backup.data || !backup.manifest) {
      throw new Error('Invalid backup file structure');
    }

    return backup;
  }

  /**
   * Export transactions to CSV
   */
  async exportToCSV(transactions: Transaction[], categories: Category[]): Promise<void> {
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    
    const headers = [
      'Date',
      'Amount',
      'Currency',
      'Category',
      'Merchant',
      'Payment Method',
      'Tags',
      'Note'
    ];
    
    const rows = transactions.map(tx => [
      tx.date,
      (tx.amount / 100).toFixed(2),
      tx.currency,
      categoryMap.get(tx.category) || 'Unknown',
      tx.merchant || '',
      tx.paymentMethod || '',
      tx.tags.join('; '),
      tx.note || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import transactions from CSV
   */
  async importFromCSV(file: File, categories: Category[]): Promise<Partial<Transaction>[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // Create category name to ID map
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    
    // Parse rows
    const transactions: Partial<Transaction>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) continue;
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      // Map CSV row to transaction
      const categoryName = row['Category']?.toLowerCase();
      const categoryId = categoryMap.get(categoryName) || categories.find(c => c.name === 'Other')?.id;
      
      if (!categoryId) continue;
      
      transactions.push({
        amount: Math.round(parseFloat(row['Amount']) * 100),
        currency: row['Currency'] || 'USD',
        date: new Date(row['Date']).toISOString(),
        category: categoryId,
        merchant: row['Merchant'] || undefined,
        paymentMethod: row['Payment Method'] || undefined,
        tags: row['Tags'] ? row['Tags'].split(';').map(t => t.trim()) : [],
        note: row['Note'] || undefined
      });
    }
    
    return transactions;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Validate passphrase strength
   */
  validatePassphrase(passphrase: string): { valid: boolean; message: string } {
    if (passphrase.length < 8) {
      return { valid: false, message: 'Passphrase must be at least 8 characters' };
    }
    if (passphrase.length < 12) {
      return { valid: true, message: 'Passphrase strength: Weak' };
    }
    if (passphrase.length < 16) {
      return { valid: true, message: 'Passphrase strength: Medium' };
    }
    return { valid: true, message: 'Passphrase strength: Strong' };
  }
}

export const encryption = new EncryptionService();
```

## Import/Export Service

```typescript
// src/services/import-export.ts
import { db } from '../storage/db';
import { encryption } from '../crypto/encryption';
import type { BackupData, EncryptedBackup } from '../crypto/encryption';

type ImportStrategy = 'merge' | 'replace';

interface ImportResult {
  transactionsImported: number;
  categoriesImported: number;
  budgetsImported: number;
  receiptsImported: number;
  conflicts: number;
}

class ImportExportService {
  /**
   * Create encrypted backup of all data
   */
  async createBackup(passphrase: string): Promise<void> {
    // Validate passphrase
    const validation = encryption.validatePassphrase(passphrase);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Gather all data
    const transactions = await db.getAllTransactions();
    const categories = await db.getAllCategories();
    const budgets = await db.getAllBudgets();
    const receipts = await db.getAll('receipts');
    const settings = await db.getSettings();

    const backupData: BackupData = {
      transactions,
      categories,
      budgets,
      receipts,
      settings
    };

    // Encrypt
    const encrypted = await encryption.encrypt(backupData, passphrase);

    // Export to file
    await encryption.exportToFile(encrypted);

    // Update last backup timestamp
    await db.updateSettings({ lastBackupDate: new Date().toISOString() });
  }

  /**
   * Restore from encrypted backup
   */
  async restoreBackup(
    file: File,
    passphrase: string,
    strategy: ImportStrategy
  ): Promise<ImportResult> {
    // Import and decrypt
    const encrypted = await encryption.importFromFile(file);
    const backupData = await encryption.decrypt(encrypted, passphrase);

    const result: ImportResult = {
      transactionsImported: 0,
      categoriesImported: 0,
      budgetsImported: 0,
      receiptsImported: 0,
      conflicts: 0
    };

    if (strategy === 'replace') {
      // Clear existing data
      await db.clear('transactions');
      await db.clear('categories');
      await db.clear('budgets');
      await db.clear('receipts');
      await db.clearUndoStack();
    }

    // Restore categories first (transactions depend on them)
    for (const category of backupData.categories) {
      if (strategy === 'merge') {
        const existing = await db.get('categories', category.id);
        if (existing) {
          if (existing.version >= category.version) {
            result.conflicts++;
            continue; // Skip older versions
          }
        }
      }
      await db.put('categories', category);
      result.categoriesImported++;
    }

    // Restore transactions
    for (const transaction of backupData.transactions) {
      if (strategy === 'merge') {
        const existing = await db.get('transactions', transaction.id);
        if (existing) {
          if (existing.version >= transaction.version) {
            result.conflicts++;
            continue;
          }
        }
      }
      await db.put('transactions', transaction);
      result.transactionsImported++;
    }

    // Restore budgets
    for (const budget of backupData.budgets) {
      await db.put('budgets', budget);
      result.budgetsImported++;
    }

    // Restore receipts
    for (const receipt of backupData.receipts) {
      await db.put('receipts', receipt);
      result.receiptsImported++;
    }

    // Merge settings (keep current settings, only update missing fields)
    const currentSettings = await db.getSettings();
    const mergedSettings = { ...backupData.settings, ...currentSettings };
    await db.put('settings', mergedSettings);

    return result;
  }

  /**
   * Export transactions to CSV
   */
  async exportCSV(dateRange?: { start: string; end: string }): Promise<void> {
    let transactions = await db.getAllTransactions();
    
    if (dateRange) {
      transactions = transactions.filter(
        tx => tx.date >= dateRange.start && tx.date <= dateRange.end
      );
    }
    
    const categories = await db.getAllCategories();
    await encryption.exportToCSV(transactions, categories);
  }

  /**
   * Import transactions from CSV
   */
  async importCSV(file: File): Promise<number> {
    const categories = await db.getAllCategories();
    const transactions = await encryption.importFromCSV(file, categories);
    
    let imported = 0;
    for (const tx of transactions) {
      try {
        await db.addTransaction(tx as any);
        imported++;
      } catch (error) {
        console.error('Failed to import transaction:', error);
      }
    }
    
    return imported;
  }

  /**
   * Get backup preview without decrypting
   */
  getBackupPreview(backup: EncryptedBackup): BackupManifest {
    return backup.manifest;
  }

  /**
   * Validate backup file
   */
  async validateBackupFile(file: File): Promise<{ valid: boolean; error?: string }> {
    try {
      const backup = await encryption.importFromFile(file);
      
      if (!backup.version || !backup.manifest) {
        return { valid: false, error: 'Invalid backup file structure' };
      }
      
      if (backup.version !== '1.0') {
        return { valid: false, error: 'Unsupported backup version' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

export const importExport = new ImportExportService();
```

## Usage Examples

### Create Encrypted Backup

```typescript
import { importExport } from './services/import-export';

// Create backup with user passphrase
try {
  await importExport.createBackup('my-secure-passphrase-123');
  alert('Backup created successfully!');
} catch (error) {
  alert(`Backup failed: ${error.message}`);
}
```

### Restore from Backup

```typescript
// User selects file
const fileInput = document.getElementById('backup-file') as HTMLInputElement;
const file = fileInput.files[0];

// Validate file first
const validation = await importExport.validateBackupFile(file);
if (!validation.valid) {
  alert(`Invalid backup file: ${validation.error}`);
  return;
}

// Show preview
const backup = await encryption.importFromFile(file);
const preview = importExport.getBackupPreview(backup);
console.log('Backup contains:', preview);

// Restore with user passphrase
const passphrase = prompt('Enter backup passphrase:');
try {
  const result = await importExport.restoreBackup(file, passphrase, 'merge');
  alert(`Imported ${result.transactionsImported} transactions, ${result.conflicts} conflicts`);
} catch (error) {
  alert(`Restore failed: ${error.message}`);
}
```

### Export to CSV

```typescript
// Export all transactions
await importExport.exportCSV();

// Export date range
await importExport.exportCSV({
  start: '2026-01-01T00:00:00Z',
  end: '2026-12-31T23:59:59Z'
});
```

### Import from CSV

```typescript
const fileInput = document.getElementById('csv-file') as HTMLInputElement;
const file = fileInput.files[0];

const imported = await importExport.importCSV(file);
alert(`Imported ${imported} transactions`);
```

## Security Considerations

1. **Passphrase Strength**: Enforce minimum 8 characters, recommend 12+
2. **Key Derivation**: PBKDF2 with 100,000 iterations prevents brute force
3. **Random Salt/IV**: Unique per backup prevents rainbow table attacks
4. **AES-256-GCM**: Authenticated encryption prevents tampering
5. **No Passphrase Storage**: Never store passphrase, only derive keys on-demand

## Error Handling

```typescript
try {
  await importExport.createBackup(passphrase);
} catch (error) {
  if (error.message.includes('Passphrase')) {
    // Handle weak passphrase
  } else if (error.message.includes('QuotaExceeded')) {
    // Handle storage quota
  } else {
    // Handle other errors
  }
}
```

## Backup File Format

```json
{
  "version": "1.0",
  "timestamp": "2026-05-01T15:30:00.000Z",
  "salt": "base64-encoded-salt",
  "iv": "base64-encoded-iv",
  "data": "base64-encoded-encrypted-data",
  "manifest": {
    "appVersion": "1.0.0",
    "transactionCount": 150,
    "categoryCount": 10,
    "budgetCount": 3,
    "receiptCount": 45,
    "totalSize": 524288
  }
}