import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';

@Injectable({
  providedIn: 'root'
})
export class TransactionUpdateService {
  private approvedTransactionsSubject = new BehaviorSubject<any[]>([]);
  private rejectedTransactionsSubject = new BehaviorSubject<any[]>([]);
  private pendingTransactionsSubject = new BehaviorSubject<any[]>([]);
  
  // Storage keys for localStorage
  private readonly APPROVED_STORAGE_KEY = 'cryptex-approved-transactions';
  private readonly REJECTED_STORAGE_KEY = 'cryptex-rejected-transactions';
  private readonly PENDING_STORAGE_KEY = 'cryptex-pending-transactions';
  
  approvedTransactions$ = this.approvedTransactionsSubject.asObservable();
  rejectedTransactions$ = this.rejectedTransactionsSubject.asObservable();
  pendingTransactions$ = this.pendingTransactionsSubject.asObservable();
  
  constructor() {
    // Load stored transactions when service initializes
    this.loadFromStorage();
    
    // Set up a timer to periodically sync with localStorage
    setInterval(() => this.syncWithLocalStorage(), 5000);
  }
  
  addApprovedTransaction(transaction: any) {
    const currentTransactions = this.approvedTransactionsSubject.getValue();
    
    // First check if we already have this transaction
    const existingIndex = currentTransactions.findIndex(t => t.id === transaction.id);
    
    if (existingIndex !== -1) {
      // Update the existing transaction without changing its approved state
      const updatedTransactions = [...currentTransactions];
      updatedTransactions[existingIndex] = {
        ...currentTransactions[existingIndex],
        ...transaction,
        status: PaymentStatus.success // Ensure it stays approved
      };
      
      this.approvedTransactionsSubject.next(updatedTransactions);
      this.saveToStorage(this.APPROVED_STORAGE_KEY, updatedTransactions);
    } else if (!currentTransactions.some(t => t.id === transaction.id)) {
      // Only add if it's not already in the list
      console.log('Adding approved transaction to service:', transaction);
      
      // Force status to be success
      const approvedTransaction = {
        ...transaction,
        status: PaymentStatus.success
      };
      
      const updatedTransactions = [...currentTransactions, approvedTransaction];
      this.approvedTransactionsSubject.next(updatedTransactions);
      this.saveToStorage(this.APPROVED_STORAGE_KEY, updatedTransactions);
    }
    
    // Also update the main storage but preserve the success status
    this.updateMainStorage({
      ...transaction,
      status: PaymentStatus.success
    });
  }
  
  addRejectedTransaction(transaction: any) {
    const currentTransactions = this.rejectedTransactionsSubject.getValue();
    // Avoid duplicates
    if (!currentTransactions.some(t => t.id === transaction.id)) {
      console.log('Adding rejected transaction to service:', transaction);
      const updatedTransactions = [...currentTransactions, transaction];
      this.rejectedTransactionsSubject.next(updatedTransactions);
      // Save to localStorage
      this.saveToStorage(this.REJECTED_STORAGE_KEY, updatedTransactions);
      
      // Also update the main "anonymousTransactions" storage
      this.updateMainStorage(transaction);
    }
  }
  
  addPendingTransaction(transaction: any) {
    const currentTransactions = this.pendingTransactionsSubject.getValue();
    // Avoid duplicates
    if (!currentTransactions.some(t => t.id === transaction.id)) {
      console.log('Adding pending transaction to service:', transaction);
      const updatedTransactions = [...currentTransactions, transaction];
      this.pendingTransactionsSubject.next(updatedTransactions);
      // Save to localStorage
      this.saveToStorage(this.PENDING_STORAGE_KEY, updatedTransactions);
      
      // Also update the main "anonymousTransactions" storage
      this.updateMainStorage(transaction);
    }
  }
  
  // Updates the main anonymous transactions storage
  private updateMainStorage(transaction: any) {
    try {
      const mainStorageKey = 'anonymousTransactions';
      const storedData = localStorage.getItem(mainStorageKey);
      let transactions = [];
      
      if (storedData) {
        transactions = JSON.parse(storedData);
        
        // Find if transaction already exists
        const index = transactions.findIndex(t => t.id === transaction.id);
        
        if (index !== -1) {
          // Update existing transaction while preserving certain fields
          const currentStatus = transactions[index].status;
          
          // Only update status if new status is more final or if current status is undefined
          const finalStatus = this.isMoreFinalStatus(transaction.status, currentStatus) 
            ? transaction.status 
            : currentStatus;
            
          transactions[index] = {
            ...transactions[index], // Keep existing data
            ...transaction,         // Apply updates
            status: finalStatus     // Use the determined final status
          };
        } else {
          // Add new transaction
          transactions.push(transaction);
        }
      } else {
        // Create new array with this transaction
        transactions = [transaction];
      }
      
      // Save back to localStorage
      localStorage.setItem(mainStorageKey, JSON.stringify(transactions));
      console.log(`Updated main transactions storage with transaction ${transaction.id}`);
    } catch (error) {
      console.error('Error updating main transactions storage:', error);
    }
  }
  
  // Helper method to determine if a status is more "final"
  private isMoreFinalStatus(newStatus: number, oldStatus: number): boolean {
    if (oldStatus === undefined) return true;
    
    // Define finality priority (higher = more final)
    const priority = {
      [-1]: 1, // notProcessed
      [3]: 2,  // awaitingVerification
      [2]: 3,  // pending
      [0]: 4,  // failed
      [1]: 5   // success
    };
    
    return priority[newStatus] > priority[oldStatus];
  }
  
  // Sync data with changes from localStorage (e.g., from other tabs/components)
  syncWithLocalStorage() {
    try {
      // Check for changes in the main anonymous transactions storage
      const mainStorageKey = 'anonymousTransactions';
      const storedData = localStorage.getItem(mainStorageKey);
      
      if (storedData) {
        const allTransactions = JSON.parse(storedData);
        
        // Group by status
        const approved = allTransactions.filter(t => t.status === PaymentStatus.success);
        const rejected = allTransactions.filter(t => t.status === PaymentStatus.failed);
        const pending = allTransactions.filter(t => 
          t.status === PaymentStatus.pending || 
          t.status === PaymentStatus.notProcessed || 
          t.status === PaymentStatus.awaitingVerification
        );
        
        // Update our subjects if there are changes
        const currentApproved = this.approvedTransactionsSubject.getValue();
        const currentRejected = this.rejectedTransactionsSubject.getValue();
        const currentPending = this.pendingTransactionsSubject.getValue();
        
        if (JSON.stringify(approved) !== JSON.stringify(currentApproved)) {
          this.approvedTransactionsSubject.next(approved);
          this.saveToStorage(this.APPROVED_STORAGE_KEY, approved);
        }
        
        if (JSON.stringify(rejected) !== JSON.stringify(currentRejected)) {
          this.rejectedTransactionsSubject.next(rejected);
          this.saveToStorage(this.REJECTED_STORAGE_KEY, rejected);
        }
        
        if (JSON.stringify(pending) !== JSON.stringify(currentPending)) {
          this.pendingTransactionsSubject.next(pending);
          this.saveToStorage(this.PENDING_STORAGE_KEY, pending);
        }
      }
    } catch (error) {
      console.error('Error syncing with localStorage:', error);
    }
  }
  
  private loadFromStorage() {
    try {
      // Load approved transactions
      const storedApproved = localStorage.getItem(this.APPROVED_STORAGE_KEY);
      if (storedApproved) {
        const parsedData = JSON.parse(storedApproved);
        console.log('Loaded approved transactions from storage:', parsedData);
        this.approvedTransactionsSubject.next(parsedData);
      }
      
      // Load rejected transactions
      const storedRejected = localStorage.getItem(this.REJECTED_STORAGE_KEY);
      if (storedRejected) {
        const parsedData = JSON.parse(storedRejected);
        console.log('Loaded rejected transactions from storage:', parsedData);
        this.rejectedTransactionsSubject.next(parsedData);
      }
      
      // Load pending transactions
      const storedPending = localStorage.getItem(this.PENDING_STORAGE_KEY);
      if (storedPending) {
        const parsedData = JSON.parse(storedPending);
        console.log('Loaded pending transactions from storage:', parsedData);
        this.pendingTransactionsSubject.next(parsedData);
      }
      
      // Also check the main transactions storage
      this.syncWithLocalStorage();
    } catch (error) {
      console.error('Error loading transactions from storage:', error);
      // If there's an error, reset storage
      localStorage.removeItem(this.APPROVED_STORAGE_KEY);
      localStorage.removeItem(this.REJECTED_STORAGE_KEY);
      localStorage.removeItem(this.PENDING_STORAGE_KEY);
    }
  }
  
  private saveToStorage(key: string, data: any[]) {
    try {
      console.log(`Saving ${data.length} transactions to ${key}`);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving transactions to storage:', error);
    }
  }
}
