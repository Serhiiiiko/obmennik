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
    this.loadApprovedTransactions();
    
    // Subscribe to approved transactions from the service
    this.subscription = this.transactionUpdateService.approvedTransactions$.subscribe(transactions => {
      if (transactions.length > 0) {
        this.approvedTransactions = transactions;
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadApprovedTransactions(): void {
    this.loading = true;
   
    // Try to load any already approved transactions from the API
    // (though likely none will be returned from GetPendingAnonymousExchanges)
    this.adminService.GetPendingAnonymousExchanges().then(result => {
      this.loading = false;
      if (result.success) {
        const approvedFromApi = result.content.filter(
          transaction => transaction.status === PaymentStatus.success
        );
        
        if (approvedFromApi.length > 0) {
          this.approvedTransactions = approvedFromApi;
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