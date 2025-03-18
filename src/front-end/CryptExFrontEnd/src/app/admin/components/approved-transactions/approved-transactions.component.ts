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
    console.log('ApprovedTransactionsComponent initialized');
    
    // Subscribe first to get any transactions stored in memory/localStorage
    this.subscription = this.transactionUpdateService.approvedTransactions$.subscribe(transactions => {
      console.log('Received approved transactions from service:', transactions);
      // Always update the transactions list, even if empty
      this.approvedTransactions = transactions;
      if (transactions.length > 0) {
        this.loading = false;
      }
    });
    
    // Then try to get any additional approved transactions from the API
    this.loadApprovedTransactions();
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