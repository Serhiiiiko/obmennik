// src/app/admin/services/transaction-update.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';

@Injectable({
  providedIn: 'root'
})
export class TransactionUpdateService {
  private approvedTransactionsSubject = new BehaviorSubject<any[]>([]);
  private rejectedTransactionsSubject = new BehaviorSubject<any[]>([]);
  
  // Storage keys for localStorage
  private readonly APPROVED_STORAGE_KEY = 'cryptex-approved-transactions';
  private readonly REJECTED_STORAGE_KEY = 'cryptex-rejected-transactions';
  
  approvedTransactions$ = this.approvedTransactionsSubject.asObservable();
  rejectedTransactions$ = this.rejectedTransactionsSubject.asObservable();
  
  constructor() {
    // Load stored transactions when service initializes
    this.loadFromStorage();
  }
  
  addApprovedTransaction(transaction: any) {
    const currentTransactions = this.approvedTransactionsSubject.getValue();
    // Avoid duplicates
    if (!currentTransactions.some(t => t.id === transaction.id)) {
      console.log('Adding approved transaction to service:', transaction);
      const updatedTransactions = [...currentTransactions, transaction];
      this.approvedTransactionsSubject.next(updatedTransactions);
      // Save to localStorage
      this.saveToStorage(this.APPROVED_STORAGE_KEY, updatedTransactions);
    }
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
    } catch (error) {
      console.error('Error loading transactions from storage:', error);
      // If there's an error, reset storage
      localStorage.removeItem(this.APPROVED_STORAGE_KEY);
      localStorage.removeItem(this.REJECTED_STORAGE_KEY);
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