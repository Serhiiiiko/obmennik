// src/app/admin/components/approved-transactions/approved-transactions.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AdminService } from '../../services/admin.service';
import { TransactionUpdateService } from '../../services/transaction-update.service';

@Component({
  selector: 'app-approved-transactions',
  templateUrl: './approved-transactions.component.html',
  styleUrls: ['./approved-transactions.component.scss']
})
export class ApprovedTransactionsComponent implements OnInit, OnDestroy {
  approvedTransactions: any[] = [];
  paginatedTransactions: any[] = []; // For displaying on the current page
  loading = true;
  paymentStatusRef = PaymentStatus;
  expandedTransactionId: string | null = null;
  private subscription: Subscription;
  
  // Pagination properties
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 1;
  
  // Add Math object to use in template
  Math = Math;
 
  constructor(
    private adminService: AdminService,
    private snackbar: SnackbarService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private transactionUpdateService: TransactionUpdateService
  ) { }

  ngOnInit(): void {
    console.log('ApprovedTransactionsComponent initialized');
    
    // Subscribe first to get any transactions stored in memory/localStorage
    this.subscription = this.transactionUpdateService.approvedTransactions$.subscribe(transactions => {
      console.log('Received approved transactions from service:', transactions);
      // Always update the transactions list, even if empty
      this.approvedTransactions = transactions;
      this.updatePagination();
      if (transactions.length > 0) {
        this.loading = false;
      }
    });
    
    // Then try to get any additional approved transactions from the API
    this.loadApprovedTransactions();
    
    // Safety net - if loading still true after 10 seconds, set to false
    setTimeout(() => {
      if (this.loading) {
        console.log('Loading timeout reached, setting loading to false');
        this.loading = false;
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadApprovedTransactions(): void {
    this.loading = true;
   
    // Try to load any already approved transactions from the API
    this.adminService.GetPendingAnonymousExchanges().then(result => {
      this.loading = false;
      if (result.success) {
        // Look for transactions with success status
        const approvedFromApi = result.content.filter(
          transaction => transaction.status === PaymentStatus.success
        );
        
        console.log('Found approved transactions from API:', approvedFromApi);
        
        if (approvedFromApi.length > 0) {
          // Add to our local service any approved transactions we found from API
          approvedFromApi.forEach(transaction => {
            this.transactionUpdateService.addApprovedTransaction(transaction);
          });
        }
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error",
          "Could not load approved transactions.",
          AlertType.Error
        ));
      }
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

  // Pagination methods
  updatePagination(): void {
    if (!this.approvedTransactions || this.approvedTransactions.length === 0) {
      this.totalPages = 1;
      this.currentPage = 1;
      this.paginatedTransactions = [];
      return;
    }
    
    this.totalPages = Math.ceil(this.approvedTransactions.length / this.pageSize);
    
    // Ensure current page is within valid range
    if (this.currentPage < 1) this.currentPage = 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    
    // Get items for current page
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.approvedTransactions.length);
    
    // Create a deep copy to avoid reference issues
    this.paginatedTransactions = this.approvedTransactions.slice(startIndex, endIndex).map(t => ({...t}));
    
    console.log(`Pagination updated: page ${this.currentPage} of ${this.totalPages}, showing ${this.paginatedTransactions.length} transactions`);
  }

  changePage(pageNumber: number): void {
    // Reset expanded transaction when changing pages
    this.expandedTransactionId = null;
    
    this.currentPage = pageNumber;
    this.updatePagination();
  }
}