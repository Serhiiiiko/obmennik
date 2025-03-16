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
    this.loadRejectedTransactions();
    
    // Subscribe to rejected transactions from the service
    this.subscription = this.transactionUpdateService.rejectedTransactions$.subscribe(transactions => {
      if (transactions.length > 0) {
        this.rejectedTransactions = transactions;
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadRejectedTransactions(): void {
    this.loading = true;
   
    // Try to load any already rejected transactions from the API
    // (though likely none will be returned from GetPendingAnonymousExchanges)
    this.adminService.GetPendingAnonymousExchanges().then(result => {
      this.loading = false;
      if (result.success) {
        const rejectedFromApi = result.content.filter(
          transaction => transaction.status === PaymentStatus.failed
        );
        
        if (rejectedFromApi.length > 0) {
          this.rejectedTransactions = rejectedFromApi;
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