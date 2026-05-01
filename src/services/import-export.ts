import { db } from '../storage/db';
import { encryption } from '../crypto/encryption';
import type { BackupData, EncryptedBackup, ImportStrategy, ImportResult } from '../types';

class ImportExportService {
  async createBackup(passphrase: string): Promise<void> {
    const validation = encryption.validatePassphrase(passphrase);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

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

    const encrypted = await encryption.encrypt(backupData, passphrase);
    await encryption.exportToFile(encrypted);
    await db.updateSettings({ lastBackupDate: new Date().toISOString() });
  }

  async restoreBackup(
    file: File,
    passphrase: string,
    strategy: ImportStrategy
  ): Promise<ImportResult> {
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
      await db.clear('transactions');
      await db.clear('categories');
      await db.clear('budgets');
      await db.clear('receipts');
      await db.clearUndoStack();
    }

    for (const category of backupData.categories) {
      if (strategy === 'merge') {
        const existing = await db.get('categories', category.id);
        if (existing && existing.version >= category.version) {
          result.conflicts++;
          continue;
        }
      }
      await db.put('categories', category);
      result.categoriesImported++;
    }

    for (const transaction of backupData.transactions) {
      if (strategy === 'merge') {
        const existing = await db.get('transactions', transaction.id);
        if (existing && existing.version >= transaction.version) {
          result.conflicts++;
          continue;
        }
      }
      await db.put('transactions', transaction);
      result.transactionsImported++;
    }

    for (const budget of backupData.budgets) {
      await db.put('budgets', budget);
      result.budgetsImported++;
    }

    for (const receipt of backupData.receipts) {
      await db.put('receipts', receipt);
      result.receiptsImported++;
    }

    const currentSettings = await db.getSettings();
    const mergedSettings = { ...backupData.settings, ...currentSettings };
    await db.put('settings', mergedSettings);

    return result;
  }

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
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}

export const importExport = new ImportExportService();

// Made with Bob
