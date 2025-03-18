// src/app/admin/components/pending-transactions/pending-transactions.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AdminService } from '../../services/admin.service';
import { TransactionUpdateService } from '../../services/transaction-update.service';

@Component({
  selector: 'app-pending-transactions',
  templateUrl: './pending-transactions.component.html',
  styleUrls: ['./pending-transactions.component.scss']
})
export class PendingTransactionsComponent implements OnInit {
  pendingTransactions: any[] = [];
  loading = true;
  paymentStatusRef = PaymentStatus;
  
  constructor(
    private adminService: AdminService, 
    private snack: SnackbarService, 
    private router: Router, 
    private activatedRoute: ActivatedRoute,
    private transactionUpdateService: TransactionUpdateService
  ) { }

  ngOnInit(): void {
    this.loadPendingTransactions();
  }

  loadPendingTransactions(): void {
    this.loading = true;
    this.adminService.GetPendingAnonymousExchanges().then(result => {
      this.loading = false;
      if (result.success) {
        this.pendingTransactions = result.content;
        console.log('Loaded pending transactions:', this.pendingTransactions);
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not load pending transactions.", 
          AlertType.Error
        ));
      }
    });
  }

  approveTransaction(id: string): void {
    console.log('Approving transaction:', id);
    // First find and store a copy of the transaction before sending the API request
    const transaction = this.pendingTransactions.find(t => t.id === id);
    if (!transaction) {
      console.error('Transaction not found:', id);
      this.snack.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Transaction not found.", 
        AlertType.Error
      ));
      return;
    }
    
    // Create a deep copy of the transaction with the updated status
    const updatedTransaction = {
      ...transaction,
      status: PaymentStatus.success
    };
    
    // Now send the API request
    this.adminService.UpdateAnonymousExchangeStatus(id, PaymentStatus.success).then(result => {
      if (result.success) {
        console.log('Transaction approved successfully:', id);
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Success", 
          "Transaction was successfully approved.", 
          AlertType.Success
        ));
        
        // Add to approved transactions storage
        this.transactionUpdateService.addApprovedTransaction(updatedTransaction);
        
        // Reload the pending transactions list
        this.loadPendingTransactions();
      } else {
        console.error('Error approving transaction:', result.error);
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not approve transaction.", 
          AlertType.Error
        ));
      }
    });
  }
  
  rejectTransaction(id: string): void {
    console.log('Rejecting transaction:', id);
    // First find and store a copy of the transaction before sending the API request
    const transaction = this.pendingTransactions.find(t => t.id === id);
    if (!transaction) {
      console.error('Transaction not found:', id);
      this.snack.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Transaction not found.", 
        AlertType.Error
      ));
      return;
    }
    
    // Create a deep copy of the transaction with the updated status
    const updatedTransaction = {
      ...transaction,
      status: PaymentStatus.failed
    };
    
    this.adminService.UpdateAnonymousExchangeStatus(id, PaymentStatus.failed).then(result => {
      if (result.success) {
        console.log('Transaction rejected successfully:', id);
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Success", 
          "Transaction was successfully rejected.", 
          AlertType.Success
        ));
        
        // Add to rejected transactions storage
        this.transactionUpdateService.addRejectedTransaction(updatedTransaction);
        
        // Reload the pending transactions list
        this.loadPendingTransactions();
      } else {
        console.error('Error rejecting transaction:', result.error);
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not reject transaction.", 
          AlertType.Error
        ));
      }
    });
  }

  redirectToUserPage(email: string): void {
    this.snack.ShowSnackbar(new SnackBarCreate(
      "User Email", 
      email, 
      AlertType.Info
    ));
  }

  getFormattedDate(dateString: string): string {
    return new Date(Date.parse(dateString)).toLocaleString([], { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric' 
    });
  }
}