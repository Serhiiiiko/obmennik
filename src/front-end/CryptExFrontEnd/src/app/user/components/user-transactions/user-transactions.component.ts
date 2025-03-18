import { Component, OnInit, OnDestroy } from '@angular/core';
import { AssetConvertService } from 'src/app/asset-convert/services/asset-convert.service';
import { AdminService } from 'src/app/admin/services/admin.service';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-user-transactions',
  templateUrl: './user-transactions.component.html',
  styleUrls: ['./user-transactions.component.scss']
})
export class UserTransactionsComponent implements OnInit, OnDestroy {
  transactions: any[] = [];
  expandedTransactionId: string | null = null;
  loading = true;
  paymentStatusRef = PaymentStatus;
  debugInfo: string = '';
  
  // For auto-refresh functionality
  private refreshSubscription: Subscription;
  private signalRSubscription: Subscription;
  
  constructor(
    private assetConvertService: AssetConvertService,
    private adminService: AdminService,
    private snackbar: SnackbarService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('UserTransactionsComponent initialized');
    this.loadTransactions();
    
    // Set up auto-refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.refreshTransactions();
    });
    
    // Subscribe to SignalR updates from AssetConvertService
    this.subscribeToTransactionUpdates();
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
  }
  
  subscribeToTransactionUpdates(): void {
    // Check if there's a transactionUpdated$ observable in the service
    if (this.assetConvertService.transactionUpdated$) {
      this.signalRSubscription = this.assetConvertService.transactionUpdated$.subscribe(updatedTransaction => {
        console.log('Received transaction update via SignalR:', updatedTransaction);
        
        if (updatedTransaction) {
          // Find and update the transaction in our list
          this.updateTransactionInList(updatedTransaction);
        }
      });
    }
  }
  
  updateTransactionInList(updatedTransaction: any): void {
    const index = this.transactions.findIndex(t => t.id === updatedTransaction.id);
    
    if (index !== -1) {
      // Update existing transaction
      this.transactions[index] = {...this.transactions[index], ...updatedTransaction};
      
      // Show notification to user
      const statusText = this.getTransactionStatusText(updatedTransaction.status);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Transaction Updated",
        `Transaction status changed to: ${statusText}`,
        updatedTransaction.status === PaymentStatus.success ? AlertType.Success :
        updatedTransaction.status === PaymentStatus.failed ? AlertType.Error :
        AlertType.Info
      ));
    } else {
      // This is a new transaction, add it to the list
      this.transactions.push(updatedTransaction);
    }
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
    // Try the first approach - getting all transactions
    this.assetConvertService.GetTransactions(null).then(result => {
      this.handleTransactionResult(result, 'Method 1: GetTransactions(null)', showLoading);
    }).catch(error => {
      console.error('Error in Method 1:', error);
      this.debugInfo += '\nMethod 1 failed: ' + JSON.stringify(error);
      
      // If that fails, try a different approach - might be a function in AdminService
      if (this.adminService.GetUserTransactions) {
        this.adminService.GetUserTransactions().then(result => {
          this.handleTransactionResult(result, 'Method 2: AdminService.GetUserTransactions()', showLoading);
        }).catch(adminError => {
          console.error('Error in Method 2:', adminError);
          this.debugInfo += '\nMethod 2 failed: ' + JSON.stringify(adminError);
          if (showLoading) this.showLoadingError();
        });
      } else {
        if (showLoading) this.showLoadingError();
      }
    }).finally(() => {
      // Regardless of success/failure, try to get pending anonymous exchanges 
      // if they exist in the API
      this.tryLoadAnonymousExchanges();
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
      } else {
        console.warn('Expected array but got:', typeof result.content);
        this.debugInfo += `\nUnexpected response format: ${typeof result.content}`;
        // Try to convert to array if possible
        this.mergeTransactions([result.content]);
      }
    } else if (showLoading) {
      this.showLoadingError();
    }
  }
  
  mergeTransactions(newTransactions: any[]): void {
    if (!newTransactions || newTransactions.length === 0) return;
    
    // Create a map of existing transactions by ID for quick lookup
    const existingTransactionsMap = new Map(
      this.transactions.map(transaction => [transaction.id, transaction])
    );
    
    // Update existing transactions and collect new ones
    for (const newTransaction of newTransactions) {
      if (newTransaction && newTransaction.id) {
        if (existingTransactionsMap.has(newTransaction.id)) {
          // Update existing transaction
          const index = this.transactions.findIndex(t => t.id === newTransaction.id);
          if (index !== -1) {
            // If status changed, show notification
            const oldStatus = this.transactions[index].status;
            const newStatus = newTransaction.status;
            
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
            
            this.transactions[index] = { ...this.transactions[index], ...newTransaction };
          }
        } else {
          // Add new transaction
          this.transactions.push(newTransaction);
        }
      }
    }
  }

  tryLoadAnonymousExchanges(): void {
    // Check if anonymous exchanges API is available
    if (this.assetConvertService.GetAnonymousExchanges) {
      this.assetConvertService.GetAnonymousExchanges().then(result => {
        console.log('Anonymous exchanges result:', result);
        this.debugInfo += '\nAnonymous exchanges result: ' + JSON.stringify(result);
        
        if (result && result.success && Array.isArray(result.content)) {
          // Merge with existing transactions
          this.mergeTransactions(result.content);
          console.log('Added anonymous exchanges, total transactions:', this.transactions.length);
        }
      }).catch(error => {
        console.error('Error loading anonymous exchanges:', error);
      });
    }
    
    // Also check local storage for any saved transactions
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage(): void {
    try {
      const storedTransactions = localStorage.getItem('anonymousTransactions');
      if (storedTransactions) {
        const localTransactions = JSON.parse(storedTransactions);
        console.log('Local storage transactions:', localTransactions);
        this.debugInfo += '\nLocal storage transactions: ' + storedTransactions;
        
        // Merge with existing transactions
        this.mergeTransactions(localTransactions);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
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
    
    return new Date(dateString).toLocaleString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
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
  
  // Method to manually refresh transactions
  manualRefresh(): void {
    this.loading = true;
    this.loadTransactions();
    this.snackbar.ShowSnackbar(new SnackBarCreate(
      "Refreshing",
      "Refreshing transaction list...",
      AlertType.Info
    ));
  }
}