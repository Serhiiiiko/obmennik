// src/app/user/components/user-transactions/user-transactions.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AssetConvertService } from 'src/app/asset-convert/services/asset-convert.service';
import { AdminService } from 'src/app/admin/services/admin.service';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Subscription, interval } from 'rxjs';
import { AnonymousExchangeConfirmationDto } from 'src/app/asset-convert/models/anonymous-exchange-request-dto';

@Component({
  selector: 'app-user-transactions',
  templateUrl: './user-transactions.component.html',
  styleUrls: ['./user-transactions.component.scss']
})
export class UserTransactionsComponent implements OnInit, OnDestroy {
  transactions: any[] = [];
  paginatedTransactions: any[] = []; // For displaying on the current page
  expandedTransactionId: string | null = null;
  loading = true;
  paymentStatusRef = PaymentStatus;
  debugInfo: string = '';
  showDebugPanel: boolean = false;
  signalRStatus: string = 'Unknown';
  lastUpdate: string = null;
  userEmail: string = '';
  newTransactionHash: string = '';
  isConfirming: boolean = false;
  
  // Pagination properties
  pageSize: number = 5; // Use smaller page size for user transactions since they're more detailed
  currentPage: number = 1;
  totalPages: number = 1;
  
  // Add Math object to use in template
  Math = Math;
  
  private subscription: Subscription;
  private refreshSubscription: Subscription;
  private signalRSubscription: Subscription;
  private connectionStatusSubscription: Subscription;

  constructor(
    private assetConvertService: AssetConvertService,
    private adminService: AdminService,
    private snackbar: SnackbarService,
    public authService: AuthService
  ) { }

  ngOnInit() {
    this.debugInfo = 'Component initialized at ' + new Date().toISOString();
    console.log('User transactions component initialized');
    
    // Get user email from localStorage for guest users
    if (!this.authService.IsAuthenticated) {
      try {
        const storedTransactions = localStorage.getItem('anonymousTransactions');
        if (storedTransactions) {
          const transactions = JSON.parse(storedTransactions);
          if (transactions.length > 0 && transactions[0].userEmail) {
            this.userEmail = transactions[0].userEmail;
            this.debugInfo += '\nFound user email in stored transactions: ' + this.userEmail;
          }
        }
      } catch (error) {
        console.error('Error reading stored transactions:', error);
      }
    }
    
    // Subscribe to transaction updates first
    this.subscription = this.assetConvertService.transactionUpdated$.subscribe(updatedTransaction => {
      if (updatedTransaction) {
        console.log('Received transaction update:', updatedTransaction);
        this.updateTransactionInList(updatedTransaction);
      }
    });
    
    // Monitor connection status
    if (this.assetConvertService['connectionStatus$']) {
      this.connectionStatusSubscription = this.assetConvertService['connectionStatus$'].subscribe(status => {
        this.signalRStatus = status;
        this.debugInfo += `\nSignalR connection status changed to: ${status}`;
      });
    }
    
    // Then load initial transactions
    this.loadTransactions();
    
    // Set up auto-refresh every 60 seconds
    this.refreshSubscription = interval(60000).subscribe(() => {
      this.refreshTransactions();
    });
    
    // Safety net - if loading still true after 10 seconds, set to false
    setTimeout(() => {
      if (this.loading) {
        console.log('Loading timeout reached, setting loading to false');
        this.loading = false;
      }
    }, 10000);
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
    
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }
  }
  
  // Helper method to sort transactions by date in descending order (newest first)
  private sortTransactionsByDateDesc(transactions: any[]): any[] {
    if (!transactions || transactions.length === 0) return transactions;
    
    return transactions.sort((a, b) => {
      const dateA = new Date(a.creationDate || a.date || 0);
      const dateB = new Date(b.creationDate || b.date || 0);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });
  }
  
  checkSignalRConnection(): void {
    // Get the current connection status directly from the service
    const status = this.assetConvertService['getConnectionStatus'] ? 
                   this.assetConvertService['getConnectionStatus']() : 'Unknown';
    this.signalRStatus = status;
    this.debugInfo += `\nSignalR current status: ${status}`;
    
    this.snackbar.ShowSnackbar(new SnackBarCreate(
      "SignalR Status", 
      `Connection is ${status}`, 
      status === 'Connected' ? AlertType.Success : AlertType.Warning
    ));
    
    // If not connected, try to restart
    if (status !== 'Connected' && this.assetConvertService['rebuildConnection']) {
      this.debugInfo += '\nAttempting to rebuild SignalR connection...';
      this.assetConvertService['rebuildConnection']();
    }
  }
  
  clearLocalStorage(): void {
    try {
      localStorage.removeItem('anonymousTransactions');
      this.debugInfo += '\nLocal storage cleared';
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Cache Cleared", 
        "Local transaction cache has been cleared", 
        AlertType.Success
      ));
      
      // Reload transactions from server
      setTimeout(() => {
        this.refreshTransactionsFromServer();
      }, 500);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      this.debugInfo += `\nError clearing localStorage: ${error.message}`;
    }
  }
  
  updateTransactionInList(updatedTransaction: any): void {
    this.lastUpdate = new Date().toLocaleTimeString();
    
    // Add to debug info
    this.debugInfo += `\n${this.lastUpdate} - Updated transaction ${updatedTransaction.id} to status ${updatedTransaction.status}`;

    if (!updatedTransaction || !updatedTransaction.id) {
      console.warn('Received invalid transaction update:', updatedTransaction);
      return;
    }
    
    console.log('Updating transaction in list:', updatedTransaction);
    console.log('Current transaction list:', this.transactions);
    
    const index = this.transactions.findIndex(t => t.id === updatedTransaction.id);
    
    if (index !== -1) {
      console.log(`Found transaction at index ${index}, current status: ${this.transactions[index].status}, new status: ${updatedTransaction.status}`);
      
      // Only update if the status has actually changed
      const oldStatus = this.transactions[index].status;
      const newStatus = updatedTransaction.status;
      
      // Create a deep copy of the transaction to ensure all properties are preserved
      const updatedTx = {
        ...this.transactions[index],  // Keep all original properties
        ...updatedTransaction         // Update with new properties
      };
      
      console.log('Updated transaction object:', updatedTx);
      
      // Replace the transaction in the array
      this.transactions[index] = updatedTx;
      
      // Show notification to user if status changed
      if (oldStatus !== newStatus) {
        const statusText = this.getTransactionStatusText(newStatus);
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Transaction Updated",
          `Transaction status changed to: ${statusText}`,
          newStatus === PaymentStatus.success ? AlertType.Success :
          newStatus === PaymentStatus.failed ? AlertType.Error :
          AlertType.Info
        ));
      }
      
      // Sort the transactions by date (newest first)
      this.transactions = this.sortTransactionsByDateDesc(this.transactions);
      
      // Force Angular change detection and update pagination
      this.transactions = [...this.transactions];
      this.updatePagination();
    } else {
      // This is a new transaction, add it to the list
      console.log('New transaction, adding to list:', updatedTransaction);
      
      // Only add the transaction if:
      // 1. User is authenticated, or
      // 2. User is guest but the transaction matches their email
      if (this.authService.IsAuthenticated || 
          (updatedTransaction.userEmail && this.userEmail && 
           updatedTransaction.userEmail.toLowerCase() === this.userEmail.toLowerCase())) {
        this.transactions.push(updatedTransaction);
        
        // Sort the transactions by date (newest first)
        this.transactions = this.sortTransactionsByDateDesc(this.transactions);
        
        // Force Angular change detection and update pagination
        this.transactions = [...this.transactions];
        this.updatePagination();
        
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "New Transaction", 
          "A new transaction has been added to your list", 
          AlertType.Info
        ));
      }
    }
  }
  
  // Add a specific method to force refresh from the server
  refreshTransactionsFromServer(): void {
    console.log('Forcing refresh from server');
    this.loading = true;
    
    // Make specific API calls to get the latest transaction status
    this.assetConvertService.forceRefreshTransactions().then(result => {
      this.loading = false;
      if (result.success && Array.isArray(result.content)) {
        console.log('Retrieved latest transactions from server:', result.content.length);
        
        // Filter transactions based on user authentication
        let relevantTransactions = result.content;
        
        // For guest users, filter by email
        if (!this.authService.IsAuthenticated && this.userEmail) {
          relevantTransactions = result.content.filter(tx => 
            tx.userEmail && tx.userEmail.toLowerCase() === this.userEmail.toLowerCase()
          );
          console.log('Filtered for guest user, found:', relevantTransactions.length);
        }
        
        // Update existing transactions with fresh data
        for (const freshTx of relevantTransactions) {
          if (freshTx && freshTx.id) {
            const index = this.transactions.findIndex(t => t.id === freshTx.id);
            if (index !== -1) {
              // Update with fresh data
              this.transactions[index] = {
                ...this.transactions[index],
                ...freshTx
              };
            } else {
              // Add new transaction
              this.transactions.push(freshTx);
            }
          }
        }
        
        // Sort the transactions by date (newest first)
        this.transactions = this.sortTransactionsByDateDesc(this.transactions);
        
        // Force Angular change detection and update pagination
        this.transactions = [...this.transactions];
        this.updatePagination();
        
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Refresh Complete", 
          "Transaction list updated from server", 
          AlertType.Success
        ));
      }
    }).catch(error => {
      this.loading = false;
      console.error('Error refreshing from server:', error);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Refresh Error", 
        "Could not retrieve latest transaction data", 
        AlertType.Error
      ));
    });
  }
  
  // Modify manualRefresh to use the new method
  manualRefresh(): void {
    this.refreshTransactionsFromServer();
  }
  
  // Add lifecycle hook to force refresh when component becomes active
  ngAfterViewInit() {
    // Force a refresh shortly after the component initializes
    setTimeout(() => {
      this.refreshTransactionsFromServer();
    }, 1000);
  }

  refreshTransactions(): void {
    console.log('Refreshing transactions automatically');
    // We don't set loading=true here to avoid UI flickering during refresh
    this.tryMultipleApproaches(false);
  }

  loadTransactions(): void {
    this.loading = true;
    this.debugInfo = 'Starting to load transactions...';
    console.log('Loading transactions, auth status:', this.authService.IsAuthenticated);
   
    // Try different approaches to get transactions
    this.tryMultipleApproaches(true);
  }

  tryMultipleApproaches(showLoading: boolean = true): void {
    // First, load transactions from all possible sources and combine them
    Promise.all([
      // 1. Try to get transactions from asset convert service
      this.assetConvertService.GetTransactions(null).catch(error => {
        console.warn('Error fetching from GetTransactions:', error);
        return { success: false, content: [] };
      }),
      
      // 2. Try to get anonymous exchanges (approved and pending)
      this.assetConvertService.GetAnonymousExchanges().catch(error => {
        console.warn('Error fetching from GetAnonymousExchanges:', error);
        return { success: false, content: [] };
      }),
      
      // 3. Try to get user transactions from admin service if available
      this.adminService.GetUserTransactions ? 
        this.adminService.GetUserTransactions().catch(error => {
          console.warn('Error fetching from GetUserTransactions:', error);
          return { success: false, content: [] };
        }) : 
        Promise.resolve({ success: false, content: [] })
    ]).then(results => {
      // Process results from all sources
      let allTransactions = [];
      
      results.forEach((result, index) => {
        if (result.success && Array.isArray(result.content)) {
          console.log(`Source ${index + 1} returned ${result.content.length} transactions`);
          allTransactions = [...allTransactions, ...result.content];
        }
      });
      
      // Also add any approved/rejected transactions from localStorage
      this.loadFromLocalStorage();
      
      // Process all fetched transactions
      if (allTransactions.length > 0) {
        this.mergeTransactions(allTransactions);
        console.log(`Combined ${allTransactions.length} transactions from all sources`);
      } else {
        console.log('No transactions found from API sources');
      }
      
      if (showLoading) {
        this.loading = false;
        this.updatePagination();
      }
    }).catch(error => {
      console.error('Error in combined transaction fetch:', error);
      if (showLoading) {
        this.loading = false;
        this.showLoadingError();
      }
    });
  }
  
  handleTransactionResult(result: any, methodName: string, showLoading: boolean): void {
    if (showLoading) this.loading = false;
    console.log(`${methodName} result:`, result);
    this.debugInfo += `\n${methodName} result: ${JSON.stringify(result)}`;
    
    if (result && result.success) {
      if (Array.isArray(result.content)) {
        // Merge with existing transactions, updating status for existing ones
        this.mergeTransactions(result.content);
        console.log('Transactions loaded successfully, count:', this.transactions.length);
        this.debugInfo += `\nLoaded ${this.transactions.length} transactions`;
        this.updatePagination();
      } else {
        console.warn('Expected array but got:', typeof result.content);
        this.debugInfo += `\nUnexpected response format: ${typeof result.content}`;
        // Try to convert to array if possible
        this.mergeTransactions([result.content]);
        this.updatePagination();
      }
    } else if (showLoading) {
      this.showLoadingError();
    }
  }
  
  mergeTransactions(newTransactions: any[]): void {
    if (!newTransactions || newTransactions.length === 0) return;
    
    // For guest users, filter by email
    if (!this.authService.IsAuthenticated && this.userEmail) {
      newTransactions = newTransactions.filter(tx => 
        tx.userEmail && tx.userEmail.toLowerCase() === this.userEmail.toLowerCase()
      );
      console.log('Filtered transactions for guest user:', newTransactions.length);
    }
    
    // Create a deep copy of existing transactions to avoid reference issues
    let updatedTransactions = [...this.transactions];
    
    // Process each new transaction
    for (const newTransaction of newTransactions) {
      if (newTransaction && newTransaction.id) {
        const existingIndex = updatedTransactions.findIndex(t => t.id === newTransaction.id);
        
        if (existingIndex >= 0) {
          // Update existing transaction - CRITICAL: preserve status if newer transaction doesn't have it
          const existingStatus = updatedTransactions[existingIndex].status;
          
          // Only update status if:
          // 1. New transaction has a defined status AND
          // 2. Either the existing transaction has no status OR the new status is more final
          const shouldUpdateStatus = 
            newTransaction.status !== undefined && 
            (existingStatus === undefined || 
             this.isMoreFinalStatus(newTransaction.status, existingStatus));
          
          updatedTransactions[existingIndex] = {
            ...updatedTransactions[existingIndex],  
            ...newTransaction,                     
            
            status: shouldUpdateStatus ? newTransaction.status : existingStatus
          };
          
          if (shouldUpdateStatus && existingStatus !== newTransaction.status) {
            this.showStatusChangeNotification(existingStatus, newTransaction.status);
          }
        } else {
          updatedTransactions.push(newTransaction);
        }
      }
    }
    
    // Sort transactions by date (newest first)
    updatedTransactions = this.sortTransactionsByDateDesc(updatedTransactions);
    
    // Replace the transactions array (creates a new reference for Angular change detection)
    this.transactions = updatedTransactions;
    this.updatePagination();
  }
  
  // Helper method to determine if a status is more "final" than another
  isMoreFinalStatus(newStatus: PaymentStatus, oldStatus: PaymentStatus): boolean {
    // Define status priority (higher number = more final)
    const statusPriority = {
      [PaymentStatus.notProcessed]: 1,
      [PaymentStatus.awaitingVerification]: 2,
      [PaymentStatus.pending]: 3,
      [PaymentStatus.failed]: 4,
      [PaymentStatus.success]: 5
    };
    
    // A status is more final if it has higher priority
    return statusPriority[newStatus] > statusPriority[oldStatus];
  }
  
  formatExchangeRate(transaction: any): string {
    // Get the exchange rate from either pair.rate or exchangeRate property
    const rate = transaction.pair?.rate || transaction.exchangeRate || 0;
    
    // Format the rate based on its magnitude for better readability
    if (rate === 0) return '0';
    
    if (rate < 0.0001) return rate.toExponential(4);
    if (rate < 0.01) return rate.toFixed(6);
    if (rate < 1) return rate.toFixed(4);
    if (rate < 100) return rate.toFixed(2);
    
    // For very large rates, round to 2 decimal places
    return rate.toLocaleString(undefined, { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  }
  
  // Add this method to calculate the resulting amount
  calculateResultAmount(transaction: any): string {
    const amount = transaction.amount || transaction.sourceAmount || 0;
    const rate = transaction.pair?.rate || transaction.exchangeRate || 0;
    const result = amount * rate;
    
    // Format result based on its magnitude
    if (result === 0) return '0';
    
    if (result < 0.0001) return result.toExponential(4);
    if (result < 0.01) return result.toFixed(6);
    if (result < 1000) return result.toFixed(4);
    
    // For larger numbers, use locale string with 2 decimal places
    return result.toLocaleString(undefined, { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  }
  
  // Add method to show notification about status changes
  showStatusChangeNotification(oldStatus: PaymentStatus, newStatus: PaymentStatus): void {
    // Don't show notifications for certain status transitions
    if (oldStatus === newStatus) return;
    
    // Only show notifications for transitions to final states
    if (newStatus === PaymentStatus.success || newStatus === PaymentStatus.failed) {
      const statusText = this.getTransactionStatusText(newStatus);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Transaction Updated",
        `Transaction status changed to: ${statusText}`,
        newStatus === PaymentStatus.success ? AlertType.Success : AlertType.Error
      ));
    }
  }

  loadFromLocalStorage(): void {
    try {
      const storedTransactions = localStorage.getItem('anonymousTransactions');
      if (storedTransactions) {
        const localTransactions = JSON.parse(storedTransactions);
        console.log('Local storage transactions:', localTransactions);
        this.debugInfo += '\nLocal storage transactions found: ' + localTransactions.length;
        
        // For guest users, set the email if found
        if (!this.authService.IsAuthenticated && localTransactions.length > 0) {
          const firstTx = localTransactions[0];
          if (firstTx && firstTx.userEmail && !this.userEmail) {
            this.userEmail = firstTx.userEmail;
            this.debugInfo += '\nExtracted user email: ' + this.userEmail;
          }
        }
        
        // Merge with existing transactions
        this.mergeTransactions(localTransactions);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.debugInfo += '\nError loading from localStorage: ' + error.message;
    }
  }

  showLoadingError(): void {
    this.loading = false;
    this.snackbar.ShowSnackbar(new SnackBarCreate(
      "Error",
      "Could not load transactions. Please try again later.",
      AlertType.Error
    ));
  }

  toggleTransactionDetails(transactionId: string): void {
    if (this.expandedTransactionId === transactionId) {
      this.expandedTransactionId = null; // Collapse if already expanded
    } else {
      this.expandedTransactionId = transactionId; // Expand this transaction
    }
  }

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

  getFormattedDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleString([], {
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

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Success",
        "Copied to clipboard!",
        AlertType.Success
      ));
    }).catch(() => {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error",
        "Failed to copy to clipboard",
        AlertType.Error
      ));
    });
  }
  
  // Add helper methods to safely get image paths and data
  hasValidCurrencies(transaction: any): boolean {
    return (
      (transaction?.pair?.left?.ticker || transaction?.sourceWalletTicker) &&
      (transaction?.pair?.right?.ticker || transaction?.destinationWalletTicker)
    );
  }

  getSourceTicker(transaction: any): string {
    return transaction?.sourceWallet?.ticker || 
           transaction?.pair?.left?.ticker || 
           transaction?.sourceWalletTicker || 
           'Unknown';
  }

  getDestinationTicker(transaction: any): string {
    return transaction?.destinationWallet?.ticker || 
           transaction?.pair?.right?.ticker || 
           transaction?.destinationWalletTicker || 
           'Unknown';
  }

  getSourceAmount(transaction: any): string {
    const amount = transaction?.amount || transaction?.sourceAmount || 0;
    return typeof amount === 'number' ? amount.toLocaleString() : amount.toString();
  }
 
  // New method to confirm transaction manually
  confirmTransaction(transaction: any): void {
    if (!transaction || this.isConfirming) return;
    if (!this.newTransactionHash) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Input Required",
        "Please enter a transaction hash",
        AlertType.Warning
      ));
      return;
    }
    
    this.isConfirming = true;
    
    const confirmData: AnonymousExchangeConfirmationDto = {
      exchangeId: transaction.id,
      transactionHash: this.newTransactionHash,
      senderWalletAddress: transaction.senderWalletAddress || `sender-${Math.random().toString(36).substring(2, 15)}`
    };
    
    this.assetConvertService.ConfirmAnonymousTransaction(confirmData)
      .then(result => {
        this.isConfirming = false;
        if (result.success) {
          this.snackbar.ShowSnackbar(new SnackBarCreate(
            "Success",
            "Transaction confirmed successfully",
            AlertType.Success
          ));
          this.newTransactionHash = '';
          
          // Auto-refresh transactions
          setTimeout(() => this.refreshTransactionsFromServer(), 1000);
        } else {
          this.snackbar.ShowSnackbar(new SnackBarCreate(
            "Error",
            "Failed to confirm transaction: " + (result.error?.message || "Unknown error"),
            AlertType.Error
          ));
        }
      })
      .catch(error => {
        this.isConfirming = false;
        console.error('Error confirming transaction:', error);
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error",
          "Failed to confirm transaction. Please try again.",
          AlertType.Error
        ));
      });
  }

  // Pagination methods
  updatePagination(): void {
    if (!this.transactions || this.transactions.length === 0) {
      this.totalPages = 1;
      this.currentPage = 1;
      this.paginatedTransactions = [];
      return;
    }
    
    // Make sure transactions are always sorted by date (newest first)
    this.transactions = this.sortTransactionsByDateDesc(this.transactions);
    
    this.totalPages = Math.ceil(this.transactions.length / this.pageSize);
    
    // Ensure current page is within valid range
    if (this.currentPage < 1) this.currentPage = 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    
    // Get items for current page
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.transactions.length);
    
    // Create a deep copy to avoid reference issues
    this.paginatedTransactions = this.transactions.slice(startIndex, endIndex).map(t => ({...t}));
    
    console.log(`Pagination updated: page ${this.currentPage} of ${this.totalPages}, showing ${this.paginatedTransactions.length} transactions`);
  }

  changePage(pageNumber: number): void {
    // Close any expanded transaction when changing pages
    this.expandedTransactionId = null;
    
    this.currentPage = pageNumber;
    this.updatePagination();
  }
}