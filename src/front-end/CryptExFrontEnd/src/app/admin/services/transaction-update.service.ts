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
  
  approvedTransactions$ = this.approvedTransactionsSubject.asObservable();
  rejectedTransactions$ = this.rejectedTransactionsSubject.asObservable();
  
  addApprovedTransaction(transaction: any) {
    const currentTransactions = this.approvedTransactionsSubject.getValue();
    // Avoid duplicates
    if (!currentTransactions.some(t => t.id === transaction.id)) {
      this.approvedTransactionsSubject.next([...currentTransactions, transaction]);
    }
  }
  
  addRejectedTransaction(transaction: any) {
    const currentTransactions = this.rejectedTransactionsSubject.getValue();
    // Avoid duplicates
    if (!currentTransactions.some(t => t.id === transaction.id)) {
      this.rejectedTransactionsSubject.next([...currentTransactions, transaction]);
    }
  }
}