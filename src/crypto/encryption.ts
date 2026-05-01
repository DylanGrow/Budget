import type { BackupData, EncryptedBackup, BackupManifest, Transaction, Category } from '../types';

class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly ITERATIONS = 100000;
  private readonly SALT_LENGTH = 16;
  private readonly IV_LENGTH = 12;

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

  async encrypt(data: BackupData, passphrase: string): Promise<EncryptedBackup> {
    if (passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters');
    }

    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const key = await this.deriveKey(passphrase, salt);

    const encoder = new TextEncoder();
    const serialized = encoder.encode(JSON.stringify(data));

    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      serialized
    );

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

  async decrypt(backup: EncryptedBackup, passphrase: string): Promise<BackupData> {
    const salt = this.base64ToArrayBuffer(backup.salt);
    const iv = this.base64ToArrayBuffer(backup.iv);
    const encrypted = this.base64ToArrayBuffer(backup.data);

    const key = await this.deriveKey(passphrase, new Uint8Array(salt));

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

  async importFromFile(file: File): Promise<EncryptedBackup> {
    if (!file.name.endsWith('.json')) {
      throw new Error('Invalid file type. Expected .json file.');
    }

    const text = await file.text();
    const backup = JSON.parse(text) as EncryptedBackup;

    if (!backup.version || !backup.salt || !backup.iv || !backup.data || !backup.manifest) {
      throw new Error('Invalid backup file structure');
    }

    return backup;
  }

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

  async importFromCSV(file: File, categories: Category[]): Promise<Partial<Transaction>[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    
    const transactions: Partial<Transaction>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) continue;
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
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

// Made with Bob
