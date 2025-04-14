import { Component, OnInit, OnDestroy } from '@angular/core';
import { AssetConvertService } from 'src/app/asset-convert/services/asset-convert.service';
import { AdminService } from 'src/app/admin/services/admin.service';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Subscription, interval } from 'rxjs';
import { AnonymousExchangeConfirmationDto } from 'src/app/asset-convert/models/anonymous-exchange-request-dto';
import { Router } from '@angular/router';

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
  lastUpdate: string = null;
  userEmail: string = '';
  newTransactionHash: string = '';
  isConfirming: boolean = false;
  userId: string = null;
  
  // Pagination properties
  pageSize: number = 5;
  currentPage: number = 1;
  totalPages: number = 1;
  
  // Add Math object to use in template
  Math = Math;
  
  private subscription: Subscription;
  private refreshSubscription: Subscription;
  private connectionStatusSubscription: Subscription;

  constructor(
    private assetConvertService: AssetConvertService,
    private adminService: AdminService,
    private snackbar: SnackbarService,
    public authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    console.log('User transactions component initialized');
    
    // Get authenticated user ID if available
    if (this.authService.IsAuthenticated) {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        if (userData && userData.id) {
          this.userId = userData.id;
          console.log('Authenticated user ID:', this.userId);
        }
      } catch (error) {
        console.error('Error retrieving user data:', error);
      }
    }
    
    // For guest users, get email from localStorage for filtering
    if (!this.authService.IsAuthenticated) {
      try {
        // Create a hash of the session/device to use with guest transactions
        this.generateGuestIdentifier();
        
        const storedTransactions = localStorage.getItem('anonymousTransactions');
        if (storedTransactions) {
          const transactions = JSON.parse(storedTransactions);
          if (transactions.length > 0 && transactions[0].userEmail) {
            this.userEmail = transactions[0].userEmail;
          }
        }
      } catch (error) {
        console.error('Error reading stored transactions:', error);
      }
    }
    
    // Subscribe to transaction updates
    this.subscription = this.assetConvertService.transactionUpdated$.subscribe(updatedTransaction => {
      if (updatedTransaction) {
        // Only update if this transaction belongs to the current user
        if (this.isUserTransaction(updatedTransaction)) {
          console.log('Received valid transaction update:', updatedTransaction);
          this.updateTransactionInList(updatedTransaction);
        }
      }
    });
    
    // Monitor connection status if available
    if (this.assetConvertService['connectionStatus$']) {
      this.connectionStatusSubscription = this.assetConvertService['connectionStatus$'].subscribe(status => {
        // Connection status updates
      });
    }
    
    // Load initial transactions
    this.loadTransactions();
    
    // Set up auto-refresh every 60 seconds
    this.refreshSubscription = interval(60000).subscribe(() => {
      this.refreshTransactions();
    });
    
    // Safety timeout
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
      }
    }, 10000);
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }
  }
  
  // Generate a unique identifier for guest users based on their browser fingerprint
  private generateGuestIdentifier(): string {
    if (this.userEmail) return this.userEmail;
    
    let guestId = localStorage.getItem('guestIdentifier');
    if (!guestId) {
      // Create a simple fingerprint based on available browser data
      const browserData = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset()
      ].join('|');
      
      // Create a hash from the browser data
      let hash = 0;
      for (let i = 0; i < browserData.length; i++) {
        hash = ((hash << 5) - hash) + browserData.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      
      guestId = `guest-${Math.abs(hash).toString(16)}`;
      localStorage.setItem('guestIdentifier', guestId);
    }
    
    return guestId;
  }
  
  // Check if a transaction belongs to the current user
  private isUserTransaction(transaction: any): boolean {
    if (!transaction) return false;
    
    // For authenticated users, check the userId
    if (this.authService.IsAuthenticated && this.userId) {
      return transaction.userId === this.userId;
    }
    
    // For guest users, check the email or transaction hash
    if (!this.authService.IsAuthenticated) {
      if (this.userEmail && transaction.userEmail) {
        return transaction.userEmail.toLowerCase() === this.userEmail.toLowerCase();
      }
      
      // Alternative check using guest identifier if available
      const guestId = this.generateGuestIdentifier();
      if (transaction.guestIdentifier && transaction.guestIdentifier === guestId) {
        return true;
      }
      
      // For legacy transactions in localStorage
      try {
        const storedTransactions = JSON.parse(localStorage.getItem('anonymousTransactions') || '[]');
        return storedTransactions.some(tx => tx.id === transaction.id);
      } catch (e) {
        return false;
      }
    }
    
    return false;
  }
  
  // Sort transactions by date (newest first)
  private sortTransactionsByDateDesc(transactions: any[]): any[] {
    if (!transactions || transactions.length === 0) return transactions;
    
    return transactions.sort((a, b) => {
      const dateA = new Date(a.creationDate || a.date || 0);
      const dateB = new Date(b.creationDate || b.date || 0);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });
  }
  
  // Update a transaction in the list
  updateTransactionInList(updatedTransaction: any): void {
    this.lastUpdate = new Date().toLocaleTimeString();
    
    if (!updatedTransaction || !updatedTransaction.id) {
      console.warn('Received invalid transaction update:', updatedTransaction);
      return;
    }
    
    // Add security check - verify this transaction belongs to the current user
    if (!this.isUserTransaction(updatedTransaction)) {
      console.warn('Received transaction update for another user, ignoring:', updatedTransaction);
      return;
    }
    
    const index = this.transactions.findIndex(t => t.id === updatedTransaction.id);
    
    if (index !== -1) {
      const oldStatus = this.transactions[index].status;
      const newStatus = updatedTransaction.status;
      
      // Create a deep copy of the transaction for updating
      const updatedTx = {
        ...this.transactions[index],  // Keep all original properties
        ...updatedTransaction         // Update with new properties
      };
      
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
      
      // Sort and update UI
      this.transactions = this.sortTransactionsByDateDesc([...this.transactions]);
      this.updatePagination();
    } else {
      // This is a new transaction, add it only if it belongs to the current user
      if (this.isUserTransaction(updatedTransaction)) {
        this.transactions.push(updatedTransaction);
        this.transactions = this.sortTransactionsByDateDesc([...this.transactions]);
        this.updatePagination();
        
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "New Transaction", 
          "A new transaction has been added to your list", 
          AlertType.Info
        ));
      }
    }
  }
  
  // Force refresh from server
  refreshTransactionsFromServer(): void {
    console.log('Forcing refresh from server');
    this.loading = true;
    
    // Use different approaches for authenticated vs guest users
    if (this.authService.IsAuthenticated) {
      // For authenticated users, get their transactions through the API
      this.assetConvertService.GetTransactions(null).then(result => {
        this.loading = false;
        if (result.success && Array.isArray(result.content)) {
          this.transactions = this.sortTransactionsByDateDesc(result.content);
          this.updatePagination();
          
          this.snackbar.ShowSnackbar(new SnackBarCreate(
            "Refresh Complete", 
            "Transaction list updated", 
            AlertType.Success
          ));
        }
      }).catch(error => {
        this.loading = false;
        this.handleErrorResponse(error);
      });
    } else {
      // For guest users, try to get exchanges they created
      this.loadGuestTransactions();
      
      // We can also try to get updates from the API, but only for exchanges they created
      this.assetConvertService.forceRefreshTransactions().then(result => {
        this.loading = false;
        if (result.success && Array.isArray(result.content)) {
          // Filter transactions to only include those with matching email
          const relevantTransactions = result.content.filter(tx => 
            this.isUserTransaction(tx)
          );
          
          // Update the transactions list
          for (const tx of relevantTransactions) {
            this.updateTransactionInList(tx);
          }
          
          this.snackbar.ShowSnackbar(new SnackBarCreate(
            "Refresh Complete", 
            "Transaction list updated", 
            AlertType.Success
          ));
        }
      }).catch(error => {
        this.loading = false;
        this.handleErrorResponse(error);
      });
    }
  }
  
  // Manual refresh button handler
  manualRefresh(): void {
    this.refreshTransactionsFromServer();
  }
  
  // Automatic refresh (less aggressive)
  refreshTransactions(): void {
    console.log('Refreshing transactions automatically');
    this.tryMultipleApproaches(false);
  }

  // Initial load of transactions
  loadTransactions(): void {
    this.loading = true;
    console.log('Loading transactions, auth status:', this.authService.IsAuthenticated);
    this.tryMultipleApproaches(true);
  }

  // Load guest transactions from localStorage
  loadGuestTransactions(): void {
    try {
      const storedTransactions = localStorage.getItem('anonymousTransactions');
      if (storedTransactions) {
        const localTransactions = JSON.parse(storedTransactions);
        
        // Filter transactions to only those belonging to this user/email
        const filteredTransactions = localTransactions.filter(tx => this.isUserTransaction(tx));
        
        console.log(`Loaded ${filteredTransactions.length} guest transactions from localStorage`);
        
        // Update transactions safely
        this.mergeTransactions(filteredTransactions);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  // Try multiple approaches to get transactions safely
  tryMultipleApproaches(showLoading: boolean = true): void {
    if (this.authService.IsAuthenticated) {
      // For authenticated users, use the regular API endpoints
      this.assetConvertService.GetTransactions(null).then(result => {
        if (showLoading) this.loading = false;
        
        if (result.success && Array.isArray(result.content)) {
          // We can trust these transactions as they're from the authenticated API
          this.mergeTransactions(result.content);
        } else if (showLoading) {
          this.showLoadingError();
        }
      }).catch(error => {
        if (showLoading) {
          this.loading = false;
          this.handleErrorResponse(error);
        }
      });
    } else {
      // For guest users, just load from localStorage
      if (showLoading) this.loading = false;
      this.loadGuestTransactions();
    }
  }
  
  // Error handler
  handleErrorResponse(error: any): void {
    console.error('API error:', error);
    
    if (error && error.status === 401) {
      // Unauthorized - redirect to login
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Authentication Required", 
        "Please log in to view your transactions", 
        AlertType.Warning
      ));
      this.router.navigate(['/login']);
    } else if (error && error.status === 403) {
      // Forbidden - user doesn't have permission
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Access Denied", 
        "You don't have permission to view these transactions", 
        AlertType.Error
      ));
    } else {
      // Generic error
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Could not load transactions. Please try again later.", 
        AlertType.Error
      ));
    }
  }
  
  // Safely merge transactions, ensuring we only get user's transactions
  mergeTransactions(newTransactions: any[]): void {
    if (!newTransactions || newTransactions.length === 0) return;
    
    // Filter to only include the current user's transactions
    newTransactions = newTransactions.filter(tx => this.isUserTransaction(tx));
    
    // Create a deep copy of existing transactions
    let updatedTransactions = [...this.transactions];
    
    // Process each new transaction
    for (const newTransaction of newTransactions) {
      if (newTransaction && newTransaction.id) {
        const existingIndex = updatedTransactions.findIndex(t => t.id === newTransaction.id);
        
        if (existingIndex >= 0) {
          // Update existing transaction
          const existingStatus = updatedTransactions[existingIndex].status;
          
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
    
    // Sort and update
    this.transactions = this.sortTransactionsByDateDesc(updatedTransactions);
    this.updatePagination();
  }
  
  // Determine if a status is more "final" than another
  isMoreFinalStatus(newStatus: PaymentStatus, oldStatus: PaymentStatus): boolean {
    const statusPriority = {
      [PaymentStatus.notProcessed]: 1,
      [PaymentStatus.awaitingVerification]: 2,
      [PaymentStatus.pending]: 3,
      [PaymentStatus.failed]: 4,
      [PaymentStatus.success]: 5
    };
    
    return statusPriority[newStatus] > statusPriority[oldStatus];
  }
  
  // Format exchange rate
  formatExchangeRate(transaction: any): string {
    const rate = transaction.pair?.rate || transaction.exchangeRate || 0;
    
    if (rate === 0) return '0';
    
    if (rate < 0.0001) return rate.toExponential(4);
    if (rate < 0.01) return rate.toFixed(6);
    if (rate < 1) return rate.toFixed(4);
    if (rate < 100) return rate.toFixed(2);
    
    return rate.toLocaleString(undefined, { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  }
  
  // Calculate the resulting amount
  calculateResultAmount(transaction: any): string {
    const amount = transaction.amount || transaction.sourceAmount || 0;
    const rate = transaction.pair?.rate || transaction.exchangeRate || 0;
    const result = amount * rate;
    
    if (result === 0) return '0';
    
    if (result < 0.0001) return result.toExponential(4);
    if (result < 0.01) return result.toFixed(6);
    if (result < 1000) return result.toFixed(4);
    
    return result.toLocaleString(undefined, { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  }
  
  // Handle status change notifications
  showStatusChangeNotification(oldStatus: PaymentStatus, newStatus: PaymentStatus): void {
    if (oldStatus === newStatus) return;
    
    if (newStatus === PaymentStatus.success || newStatus === PaymentStatus.failed) {
      const statusText = this.getTransactionStatusText(newStatus);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Transaction Updated",
        `Transaction status changed to: ${statusText}`,
        newStatus === PaymentStatus.success ? AlertType.Success : AlertType.Error
      ));
    }
  }
  
  // Error message
  showLoadingError(): void {
    this.loading = false;
    this.snackbar.ShowSnackbar(new SnackBarCreate(
      "Error",
      "Could not load transactions. Please try again later.",
      AlertType.Error
    ));
  }

  // Toggle transaction details view
  toggleTransactionDetails(transactionId: string): void {
    if (this.expandedTransactionId === transactionId) {
      this.expandedTransactionId = null;
    } else {
      this.expandedTransactionId = transactionId;
    }
  }

  // Get CSS class for transaction status
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

  // Get text for transaction status
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

  // Format date for display
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

  // Copy to clipboard
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
  
  // Helper methods for accessing transaction data safely
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
 
  // Confirm transaction manually
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
    
    this.totalPages = Math.ceil(this.transactions.length / this.pageSize);
    
    // Ensure current page is within valid range
    if (this.currentPage < 1) this.currentPage = 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    
    // Get items for current page
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.transactions.length);
    
    // Create a deep copy to avoid reference issues
    this.paginatedTransactions = this.transactions.slice(startIndex, endIndex).map(t => ({...t}));
  }

  changePage(pageNumber: number): void {
    // Close any expanded transaction when changing pages
    this.expandedTransactionId = null;
    
    this.currentPage = pageNumber;
    this.updatePagination();
  }
}