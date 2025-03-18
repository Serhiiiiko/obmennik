import { Component, OnInit } from '@angular/core';
import { AssetConvertService } from 'src/app/asset-convert/services/asset-convert.service';
import { AdminService } from 'src/app/admin/services/admin.service';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
  selector: 'app-user-transactions',
  templateUrl: './user-transactions.component.html',
  styleUrls: ['./user-transactions.component.scss']
})
export class UserTransactionsComponent implements OnInit {
  transactions: any[] = [];
  expandedTransactionId: string | null = null;
  loading = true;
  paymentStatusRef = PaymentStatus;
  debugInfo: string = ''; // For debugging
 
  constructor(
    private assetConvertService: AssetConvertService,
    private adminService: AdminService,
    private snackbar: SnackbarService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('UserTransactionsComponent initialized');
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading = true;
    this.debugInfo = 'Starting to load transactions...';
    console.log('Loading transactions, auth status:', this.authService.IsAuthenticated);
   
    // Try different approaches to get transactions
    this.tryMultipleApproaches();
  }

  tryMultipleApproaches(): void {
    // Try the first approach - getting all transactions
    this.assetConvertService.GetTransactions(null).then(result => {
      this.handleTransactionResult(result, 'Method 1: GetTransactions(null)');
    }).catch(error => {
      console.error('Error in Method 1:', error);
      this.debugInfo += '\nMethod 1 failed: ' + JSON.stringify(error);
      
      // If that fails, try a different approach - might be a function in AdminService
      if (this.adminService.GetUserTransactions) {
        this.adminService.GetUserTransactions().then(result => {
          this.handleTransactionResult(result, 'Method 2: AdminService.GetUserTransactions()');
        }).catch(adminError => {
          console.error('Error in Method 2:', adminError);
          this.debugInfo += '\nMethod 2 failed: ' + JSON.stringify(adminError);
          this.showLoadingError();
        });
      } else {
        this.showLoadingError();
      }
    }).finally(() => {
      // Regardless of success/failure, try to get pending anonymous exchanges 
      // if they exist in the API
      this.tryLoadAnonymousExchanges();
    });
  }

  handleTransactionResult(result: any, methodName: string): void {
    this.loading = false;
    console.log(`${methodName} result:`, result);
    this.debugInfo += `\n${methodName} result: ${JSON.stringify(result)}`;
    
    if (result && result.success) {
      if (Array.isArray(result.content)) {
        this.transactions = result.content;
        console.log('Transactions loaded successfully, count:', this.transactions.length);
        this.debugInfo += `\nLoaded ${this.transactions.length} transactions`;
      } else {
        console.warn('Expected array but got:', typeof result.content);
        this.debugInfo += `\nUnexpected response format: ${typeof result.content}`;
        // Try to convert to array if possible
        this.transactions = [result.content];
      }
    } else {
      this.showLoadingError();
    }
  }

  tryLoadAnonymousExchanges(): void {
    // Check if anonymous exchanges API is available
    if (this.assetConvertService.GetAnonymousExchanges) {
      this.assetConvertService.GetAnonymousExchanges().then(result => {
        console.log('Anonymous exchanges result:', result);
        this.debugInfo += '\nAnonymous exchanges result: ' + JSON.stringify(result);
        
        if (result && result.success && Array.isArray(result.content)) {
          const anonTransactions = result.content;
          // Add these to the transactions array
          this.transactions = [...this.transactions, ...anonTransactions];
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
        
        // Add these to the transactions array
        this.transactions = [...this.transactions, ...localTransactions];
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