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
  paginatedTransactions: any[] = []; // For displaying on the current page
  loading = true;
  paymentStatusRef = PaymentStatus;
  expandedTransactionId: string | null = null;
  
  // Pagination properties
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 1;
  
  // Add Math object to use in template
  Math = Math;
  
  constructor(
    private adminService: AdminService, 
    private snack: SnackbarService, 
    private router: Router, 
    private activatedRoute: ActivatedRoute,
    private transactionUpdateService: TransactionUpdateService
  ) { }

  ngOnInit(): void {
    this.loadPendingTransactions();
    
    // Safety net - if loading still true after 10 seconds, set to false
    setTimeout(() => {
      if (this.loading) {
        console.log('Loading timeout reached, setting loading to false');
        this.loading = false;
      }
    }, 10000);
  }

  loadPendingTransactions(): void {
    this.loading = true;
    console.log('Loading pending transactions...');
    
    this.adminService.GetPendingAnonymousExchanges().then(result => {
      this.loading = false;
      if (result.success) {
        console.log('Pending transactions loaded:', result.content);
        
        if (Array.isArray(result.content)) {
          this.pendingTransactions = result.content;
        } else {
          console.warn('GetPendingAnonymousExchanges did not return an array:', result.content);
          this.pendingTransactions = [];
        }
        
        // Log first transaction for debugging
        if (this.pendingTransactions.length > 0) {
          console.log('First pending transaction:', this.pendingTransactions[0]);
        }
        
        this.updatePagination();
      } else {
        console.error('Error loading pending transactions:', result.error);
        this.pendingTransactions = [];
        this.updatePagination();
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not load pending transactions.", 
          AlertType.Error
        ));
      }
    }).catch(error => {
      this.loading = false;
      console.error('Exception loading pending transactions:', error);
      this.pendingTransactions = [];
      this.updatePagination();
      this.snack.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Failed to load transactions. Please try again.", 
        AlertType.Error
      ));
    });
  }

  // Toggle expanded state for a transaction
  toggleTransactionDetails(transactionId: string): void {
    if (this.expandedTransactionId === transactionId) {
      this.expandedTransactionId = null; // Collapse if already expanded
    } else {
      this.expandedTransactionId = transactionId; // Expand this transaction
    }
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
    if (!dateString) return 'N/A';
    
    try {
      return new Date(Date.parse(dateString)).toLocaleString([], { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'N/A';
    }
  }

  // Add helper methods to safely get image paths and data
  getSourceImagePath(transaction: any): string {
    const basePath = '/assets/images/';
    const fallbackPath = basePath + 'crypto/generic.svg';
    
    try {
      if (transaction?.sourceWallet?.type !== undefined && transaction?.sourceWallet?.ticker) {
        return basePath + (transaction.sourceWallet.type == 1 ? 'fiat' : 'crypto') + '/' + transaction.sourceWallet.ticker + '.svg';
      }
    } catch (error) {
      console.error('Error getting source image path:', error);
    }
    
    return fallbackPath;
  }

  getDestinationImagePath(transaction: any): string {
    const basePath = '/assets/images/';
    const fallbackPath = basePath + 'crypto/generic.svg';
    
    try {
      if (transaction?.destinationWallet?.type !== undefined && transaction?.destinationWallet?.ticker) {
        return basePath + (transaction.destinationWallet.type == 1 ? 'fiat' : 'crypto') + '/' + transaction.destinationWallet.ticker + '.svg';
      }
    } catch (error) {
      console.error('Error getting destination image path:', error);
    }
    
    return fallbackPath;
  }

  getSourceTicker(transaction: any): string {
    return transaction?.sourceWallet?.ticker || 'Unknown';
  }

  getDestinationTicker(transaction: any): string {
    return transaction?.destinationWallet?.ticker || 'Unknown';
  }

  getSourceAmount(transaction: any): string {
    const amount = transaction?.sourceAmount || 0;
    return typeof amount === 'number' ? amount.toLocaleString() : amount.toString();
  }

  getDestinationAmount(transaction: any): string {
    const amount = transaction?.destinationAmount || 0;
    return typeof amount === 'number' ? amount.toLocaleString() : amount.toString();
  }

  // Get transaction status text
  getTransactionStatusText(status: PaymentStatus): string {
    switch(status) {
      case PaymentStatus.success:
        return 'Success';
      case PaymentStatus.failed:
        return 'Failed';
      case PaymentStatus.notProcessed:
        return 'Not Processed';
      case PaymentStatus.pending:
        return 'Pending';
      case PaymentStatus.awaitingVerification:
        return 'Awaiting Verification';
      default:
        return 'Unknown';
    }
  }

  // Get appropriate CSS class for transaction status
  getTransactionStatusClass(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.success:
        return 'bg-green-100 text-green-800';
      case PaymentStatus.failed:
        return 'bg-red-100 text-red-800';
      case PaymentStatus.notProcessed:
      case PaymentStatus.pending:
      case PaymentStatus.awaitingVerification:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Update pagination to handle edge cases
  updatePagination(): void {
    if (!this.pendingTransactions || this.pendingTransactions.length === 0) {
      this.totalPages = 1;
      this.currentPage = 1;
      this.paginatedTransactions = [];
      return;
    }
    
    this.totalPages = Math.ceil(this.pendingTransactions.length / this.pageSize);
    
    // Ensure current page is within valid range
    if (this.currentPage < 1) this.currentPage = 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    
    // Get items for current page
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.pendingTransactions.length);
    
    // Create a deep copy to avoid reference issues
    this.paginatedTransactions = this.pendingTransactions.slice(startIndex, endIndex).map(t => ({...t}));
    
    console.log(`Pagination updated: page ${this.currentPage} of ${this.totalPages}, showing ${this.paginatedTransactions.length} transactions`);
  }

  changePage(pageNumber: number): void {
    // Reset expanded transaction when changing pages
    this.expandedTransactionId = null;
    
    this.currentPage = pageNumber;
    this.updatePagination();
  }
}