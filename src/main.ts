import { db } from './storage/db';
import { importExport } from './services/import-export';
import type { Transaction, Category } from './types';
import './styles/main.css';

class BudgetApp {
  private categories: Category[] = [];
  private transactions: Transaction[] = [];
  private deferredPrompt: any = null;

  // XSS Protection - Sanitize HTML
  private sanitizeHTML(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Escape HTML for safe rendering
  private escapeHTML(str: string): string {
    const map: Record<string, string> = {
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'/]/g, (char) => map[char]);
  }

  async init() {
    try {
      await db.init();
      await this.loadData();
      this.setupEventListeners();
      this.updateUI();
      this.setupOnlineStatus();
      this.updateStorageInfo();
      this.setupInstallPrompt();
      this.handleSPARedirect();
      
      console.log('Budget App initialized successfully');
      console.log(`Loaded ${this.categories.length} categories and ${this.transactions.length} transactions`);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showNotification('Failed to initialize app. Please refresh the page.', 'error');
      
      // Show error in UI
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = `
          <div style="padding: 2rem; text-align: center;">
            <h1>⚠️ Initialization Error</h1>
            <p>Failed to initialize the app. This might be due to:</p>
            <ul style="text-align: left; max-width: 500px; margin: 1rem auto;">
              <li>Browser doesn't support IndexedDB</li>
              <li>Private/Incognito mode restrictions</li>
              <li>Storage quota exceeded</li>
            </ul>
            <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; font-size: 1rem; cursor: pointer;">
              Refresh Page
            </button>
          </div>
        `;
      }
    }
  }

  private async loadData() {
    this.categories = await db.getAllCategories();
    this.transactions = await db.getAllTransactions();
    this.populateCategorySelect();
  }

  private populateCategorySelect() {
    const select = document.getElementById('category') as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '<option value="">Select Category</option>';
    this.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${cat.icon} ${cat.name}`;
      select.appendChild(option);
    });
  }

  private setupEventListeners() {
    // Quick add form
    const quickAddForm = document.getElementById('quick-add-form');
    quickAddForm?.addEventListener('submit', (e) => this.handleQuickAdd(e));

    // Backup/Restore buttons
    document.getElementById('btn-backup')?.addEventListener('click', () => this.showBackupModal());
    document.getElementById('btn-restore')?.addEventListener('click', () => this.showRestoreModal());
    document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportCSV());

    // Backup modal
    document.getElementById('backup-form')?.addEventListener('submit', (e) => this.handleBackup(e));
    document.getElementById('cancel-backup')?.addEventListener('click', () => this.hideBackupModal());

    // Restore modal
    document.getElementById('restore-form')?.addEventListener('submit', (e) => this.handleRestore(e));
    document.getElementById('cancel-restore')?.addEventListener('click', () => this.hideRestoreModal());

    // Passphrase strength indicator
    document.getElementById('backup-passphrase')?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      this.updatePassphraseStrength(input.value);
    });
  }

  private async handleQuickAdd(e: Event) {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const amountInput = document.getElementById('amount') as HTMLInputElement;
    const categorySelect = document.getElementById('category') as HTMLSelectElement;
    const merchantInput = document.getElementById('merchant') as HTMLInputElement;

    try {
      // Validate inputs
      if (!amountInput.value || parseFloat(amountInput.value) <= 0) {
        this.showNotification('Please enter a valid amount', 'error');
        return;
      }

      if (!categorySelect.value) {
        this.showNotification('Please select a category', 'error');
        return;
      }

      const amount = Math.round(parseFloat(amountInput.value) * 100);
      const category = categorySelect.value;
      const merchant = merchantInput.value.trim() || undefined;

      await db.addTransaction({
        amount,
        currency: 'USD',
        date: new Date().toISOString(),
        category,
        merchant,
        tags: [],
        paymentMethod: undefined,
        note: undefined
      });

      form.reset();
      await this.loadData();
      this.updateUI();
      
      this.showNotification('Transaction added successfully!', 'success');
    } catch (error) {
      console.error('Failed to add transaction:', error);
      this.showNotification('Failed to add transaction', 'error');
    }
  }

  private updateUI() {
    this.updateBudgetSummary();
    this.updateTransactionsList();
  }

  private updateBudgetSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const monthTransactions = this.transactions.filter(
      tx => tx.date >= startOfMonth && tx.date <= endOfMonth
    );

    const spent = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const budget = 200000; // $2000 default budget
    const remaining = budget - spent;
    const percentage = Math.min((spent / budget) * 100, 100);

    document.getElementById('spent-amount')!.textContent = this.formatCurrency(spent);
    document.getElementById('budget-amount')!.textContent = this.formatCurrency(budget);
    document.getElementById('remaining-amount')!.textContent = 
      `${this.formatCurrency(remaining)} remaining`;
    
    const progressFill = document.getElementById('progress-fill') as HTMLElement;
    progressFill.style.width = `${percentage}%`;
    progressFill.style.backgroundColor = percentage > 90 ? '#FF6B6B' : '#4ECDC4';
  }

  private updateTransactionsList() {
    const list = document.getElementById('transactions-list');
    if (!list) return;

    if (this.transactions.length === 0) {
      list.innerHTML = '<p class="empty-state">No transactions yet. Add your first transaction above!</p>';
      return;
    }

    const recentTransactions = this.transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    list.innerHTML = recentTransactions.map(tx => {
      const category = this.categories.find(c => c.id === tx.category);
      const date = new Date(tx.date);
      const dateStr = this.formatDate(date);
      
      // XSS Protection: Escape all user-provided content
      const merchantSafe = this.escapeHTML(tx.merchant || 'Transaction');
      const categorySafe = this.escapeHTML(category?.name || 'Unknown');

      return `
        <div class="transaction-item" role="listitem">
          <div class="transaction-icon" aria-hidden="true">${category?.icon || '📦'}</div>
          <div class="transaction-details">
            <div class="transaction-merchant">${merchantSafe}</div>
            <div class="transaction-category">${categorySafe} • ${dateStr}</div>
          </div>
          <div class="transaction-amount">-${this.formatCurrency(tx.amount)}</div>
        </div>
      `;
    }).join('');
  }

  private formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private showBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (modal) modal.style.display = 'flex';
  }

  private hideBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (modal) modal.style.display = 'none';
    (document.getElementById('backup-form') as HTMLFormElement)?.reset();
  }

  private showRestoreModal() {
    const modal = document.getElementById('restore-modal');
    if (modal) modal.style.display = 'flex';
  }

  private hideRestoreModal() {
    const modal = document.getElementById('restore-modal');
    if (modal) modal.style.display = 'none';
    (document.getElementById('restore-form') as HTMLFormElement)?.reset();
  }

  private async handleBackup(e: Event) {
    e.preventDefault();

    const passphraseInput = document.getElementById('backup-passphrase') as HTMLInputElement;
    const confirmInput = document.getElementById('backup-passphrase-confirm') as HTMLInputElement;

    if (passphraseInput.value !== confirmInput.value) {
      this.showNotification('Passphrases do not match', 'error');
      return;
    }

    try {
      await importExport.createBackup(passphraseInput.value);
      this.hideBackupModal();
      this.showNotification('Backup created successfully!', 'success');
    } catch (error: any) {
      console.error('Backup failed:', error);
      this.showNotification(`Backup failed: ${error.message}`, 'error');
    }
  }

  private async handleRestore(e: Event) {
    e.preventDefault();

    const fileInput = document.getElementById('backup-file') as HTMLInputElement;
    const passphraseInput = document.getElementById('restore-passphrase') as HTMLInputElement;
    const strategyInputs = document.getElementsByName('strategy') as NodeListOf<HTMLInputElement>;
    
    const file = fileInput.files?.[0];
    if (!file) {
      this.showNotification('Please select a backup file', 'error');
      return;
    }

    const strategy = Array.from(strategyInputs).find(input => input.checked)?.value as 'merge' | 'replace';

    try {
      const result = await importExport.restoreBackup(file, passphraseInput.value, strategy);
      await this.loadData();
      this.updateUI();
      this.hideRestoreModal();
      this.showNotification(
        `Restored ${result.transactionsImported} transactions, ${result.categoriesImported} categories`,
        'success'
      );
    } catch (error: any) {
      console.error('Restore failed:', error);
      this.showNotification(`Restore failed: ${error.message}`, 'error');
    }
  }

  private async exportCSV() {
    try {
      await importExport.exportCSV();
      this.showNotification('CSV exported successfully!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('Export failed', 'error');
    }
  }

  private updatePassphraseStrength(passphrase: string) {
    const indicator = document.getElementById('passphrase-strength');
    if (!indicator) return;

    if (passphrase.length < 8) {
      indicator.textContent = 'Too short (min 8 characters)';
      indicator.className = 'strength-indicator weak';
    } else if (passphrase.length < 12) {
      indicator.textContent = 'Weak';
      indicator.className = 'strength-indicator weak';
    } else if (passphrase.length < 16) {
      indicator.textContent = 'Medium';
      indicator.className = 'strength-indicator medium';
    } else {
      indicator.textContent = 'Strong';
      indicator.className = 'strength-indicator strong';
    }
  }

  private setupOnlineStatus() {
    const updateStatus = () => {
      const indicator = document.getElementById('online-status');
      const text = document.getElementById('status-text');
      
      if (navigator.onLine) {
        indicator!.textContent = '●';
        indicator!.style.color = '#51CF66';
        text!.textContent = 'Online';
      } else {
        indicator!.textContent = '○';
        indicator!.style.color = '#ADB5BD';
        text!.textContent = 'Offline';
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  private async updateStorageInfo() {
    try {
      const { usage, quota } = await db.getStorageEstimate();
      document.getElementById('storage-used')!.textContent = (usage / (1024 * 1024)).toFixed(1);
      document.getElementById('storage-quota')!.textContent = (quota / (1024 * 1024)).toFixed(0);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.hideInstallPrompt();
      this.showNotification('App installed successfully!', 'success');
    });
  }

  private showInstallPrompt() {
    const existingPrompt = document.getElementById('install-prompt');
    if (existingPrompt) return;

    const prompt = document.createElement('div');
    prompt.id = 'install-prompt';
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
      <div class="install-prompt-content">
        <div class="install-prompt-title">Install Budget Tracker</div>
        <div class="install-prompt-text">Install this app for quick access and offline use</div>
      </div>
      <div class="install-prompt-actions">
        <button class="btn-primary" id="install-btn">Install</button>
        <button class="btn-secondary" id="dismiss-install">Not now</button>
      </div>
    `;
    document.body.appendChild(prompt);

    document.getElementById('install-btn')?.addEventListener('click', async () => {
      if (!this.deferredPrompt) return;
      
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    });

    document.getElementById('dismiss-install')?.addEventListener('click', () => {
      this.hideInstallPrompt();
    });
  }

  private hideInstallPrompt() {
    const prompt = document.getElementById('install-prompt');
    if (prompt) {
      prompt.remove();
    }
  }

  private handleSPARedirect() {
    const redirect = sessionStorage.getItem('redirect');
    if (redirect) {
      sessionStorage.removeItem('redirect');
      // Handle any SPA routing if needed
      console.log('Redirected from:', redirect);
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    // Simple notification - could be enhanced with a toast library
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize app
const app = new BudgetApp();
app.init();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      registration => console.log('SW registered:', registration),
      error => console.log('SW registration failed:', error)
    );
  });
}

// Made with Bob
