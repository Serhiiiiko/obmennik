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
  showDebugPanel: boolean = false;
signalRStatus: string = 'Unknown';
lastUpdate: string = null;
  
  private subscription: Subscription;
  private refreshSubscription: Subscription;
  private signalRSubscription: Subscription;
  
  constructor(
    private assetConvertService: AssetConvertService,
    private adminService: AdminService,
    private snackbar: SnackbarService,
    public authService: AuthService
  ) { }

  ngOnInit() {
    // Subscribe to transaction updates first
    this.subscription = this.assetConvertService.transactionUpdated$.subscribe(updatedTransaction => {
      if (updatedTransaction) {
        console.log('Received transaction update:', updatedTransaction);
        this.updateTransactionInList(updatedTransaction);
      }
    });
    
    // Then load initial transactions
    this.loadTransactions();
    
    // Set up auto-refresh every 60 seconds
    this.refreshSubscription = interval(60000).subscribe(() => {
      this.refreshTransactions();
    });
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
  }
  checkSignalRConnection(): void {
    // Try to check the connection status via the AssetConvertService
    if (this.assetConvertService['anonymousExchangeHubConnection']) {
      const connection = this.assetConvertService['anonymousExchangeHubConnection'];
      const connectionState = connection.state;
      
      this.signalRStatus = connectionState;
      this.debugInfo += `\nSignalR connection state: ${connectionState}`;
      
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "SignalR Status", 
        `Connection is ${connectionState}`, 
        connectionState === 'Connected' ? AlertType.Success : AlertType.Warning
      ));
      
      // If not connected, try to restart
      if (connectionState !== 'Connected') {
        this.debugInfo += '\nAttempting to restart SignalR connection...';
        if (typeof this.assetConvertService['startAnonymousExchangeConnection'] === 'function') {
          this.assetConvertService['startAnonymousExchangeConnection']();
        }
      }
    } else {
      this.signalRStatus = 'Not Available';
      this.debugInfo += '\nSignalR connection object not available';
      
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "SignalR Status", 
        "Connection not available", 
        AlertType.Error
      ));
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
      
      if (oldStatus !== newStatus) {
        // Create a deep copy of the transaction to ensure all properties are preserved
        const updatedTx = {
          ...this.transactions[index],  // Keep all original properties
          status: newStatus             // Update the status
        };
        
        // Add any additional properties from the update
        if (updatedTransaction.adminNotes) updatedTx.adminNotes = updatedTransaction.adminNotes;
        if (updatedTransaction.transactionHash) updatedTx.transactionHash = updatedTransaction.transactionHash;
        
        console.log('Updated transaction object:', updatedTx);
        
        // Replace the transaction in the array
        this.transactions[index] = updatedTx;
        
        // Show notification to user
        const statusText = this.getTransactionStatusText(newStatus);
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Transaction Updated",
          `Transaction status changed to: ${statusText}`,
          newStatus === PaymentStatus.success ? AlertType.Success :
          newStatus === PaymentStatus.failed ? AlertType.Error :
          AlertType.Info
        ));
        
        // Force Angular change detection
        this.transactions = [...this.transactions];
      } else {
        console.log('Transaction status unchanged, no update needed');
      }
    } else {
      // This is a new transaction, add it to the list
      console.log('New transaction, adding to list:', updatedTransaction);
      this.transactions.push(updatedTransaction);
      
      // Force Angular change detection
      this.transactions = [...this.transactions];
    }
  }
  
  // Add a specific method to force refresh from the server
  refreshTransactionsFromServer(): void {
    console.log('Forcing refresh from server');
    this.loading = true;
    
    // Make specific API calls to get the latest transaction status
    if (this.adminService.GetAllTransactions) {
      this.adminService.GetAllTransactions().then(result => {
        this.loading = false;
        if (result.success && Array.isArray(result.content)) {
          console.log('Retrieved latest transactions from server:', result.content.length);
          
          // Update existing transactions with fresh data
          for (const freshTx of result.content) {
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
          
          // Force Angular change detection
          this.transactions = [...this.transactions];
          
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
      
      if (showLoading) this.loading = false;
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
    
    // Flag to check if we need to sort transactions
    let listChanged = false;
    
    // Process each new transaction
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
            
            // IMPORTANT FIX: Keep all original properties and just update what's new
            this.transactions[index] = {
              ...this.transactions[index],
              ...newTransaction
            };
            
            // Make sure we have essential properties
            if (!this.transactions[index].pair && newTransaction.pair) {
              this.transactions[index].pair = newTransaction.pair;
            }
            
            listChanged = true;
          }
        } else {
          // Add new transaction
          console.log('Adding new transaction to list:', newTransaction);
          this.transactions.push(newTransaction);
          listChanged = true;
        }
      }
    }
    
    // If we changed the list, sort transactions by date (newest first)
    if (listChanged) {
      this.transactions.sort((a, b) => {
        const dateA = new Date(a.creationDate || a.date || 0);
        const dateB = new Date(b.creationDate || b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
    }
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
  
}
