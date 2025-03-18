// src/app/admin/components/rejected-transactions/rejected-transactions.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AdminService } from '../../services/admin.service';
import { TransactionUpdateService } from '../../services/transaction-update.service';

@Component({
  selector: 'app-rejected-transactions',
  templateUrl: './rejected-transactions.component.html',
  styleUrls: ['./rejected-transactions.component.scss']
})
export class RejectedTransactionsComponent implements OnInit, OnDestroy {
  rejectedTransactions: any[] = [];
  loading = true;
  paymentStatusRef = PaymentStatus;
  private subscription: Subscription;
 
  constructor(
    private adminService: AdminService,
    private snackbar: SnackbarService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private transactionUpdateService: TransactionUpdateService
  ) { }

  ngOnInit(): void {
    console.log('RejectedTransactionsComponent initialized');
    
    // Subscribe first to get any transactions stored in memory/localStorage
    this.subscription = this.transactionUpdateService.rejectedTransactions$.subscribe(transactions => {
      console.log('Received rejected transactions from service:', transactions);
      // Always update the transactions list, even if empty
      this.rejectedTransactions = transactions;
      if (transactions.length > 0) {
        this.loading = false;
      }
    });
    
    // Then try to get any additional rejected transactions from the API
    this.loadRejectedTransactions();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadRejectedTransactions(): void {
    this.loading = true;
   
    // Try to load any already rejected transactions from the API
    this.adminService.GetPendingAnonymousExchanges().then(result => {
      this.loading = false;
      if (result.success) {
        // Look for transactions with failed status
        const rejectedFromApi = result.content.filter(
          transaction => transaction.status === PaymentStatus.failed
        );
        
        console.log('Found rejected transactions from API:', rejectedFromApi);
        
        if (rejectedFromApi.length > 0) {
          // Add to our local service any rejected transactions we found from API
          rejectedFromApi.forEach(transaction => {
            this.transactionUpdateService.addRejectedTransaction(transaction);
          });
        }
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error",
          "Could not load rejected transactions.",
          AlertType.Error
        ));
      }
    });
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