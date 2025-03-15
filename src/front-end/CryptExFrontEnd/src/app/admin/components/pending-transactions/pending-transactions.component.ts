import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-pending-transactions',
  templateUrl: './pending-transactions.component.html',
  styleUrls: ['./pending-transactions.component.scss']
})
export class PendingTransactionsComponent implements OnInit {
  pendingTransactions: any[] = [];
  loading = true;
  paymentStatusRef = PaymentStatus;
  
  constructor(
    private adminService: AdminService, 
    private snack: SnackbarService, 
    private router: Router, 
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadPendingTransactions();
  }

  loadPendingTransactions(): void {
    this.loading = true;
    this.adminService.GetPendingAnonymousExchanges().then(result => {
      this.loading = false;
      if (result.success) {
        this.pendingTransactions = result.content;
        console.log('Loaded transactions:', this.pendingTransactions);
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not load pending transactions.", 
          AlertType.Error
        ));
      }
    });
  }

  approveTransaction(id: string): void {
    this.adminService.UpdateAnonymousExchangeStatus(id, PaymentStatus.success).then(result => {
      if (result.success) {
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Success", 
          "Transaction was successfully approved.", 
          AlertType.Success
        ));
        this.loadPendingTransactions();
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not approve transaction.", 
          AlertType.Error
        ));
      }
    });
  }
  
  rejectTransaction(id: string): void {
    this.adminService.UpdateAnonymousExchangeStatus(id, PaymentStatus.failed).then(result => {
      if (result.success) {
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Success", 
          "Transaction was successfully rejected.", 
          AlertType.Success
        ));
        this.loadPendingTransactions();
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not reject transaction.", 
          AlertType.Error
        ));
      }
    });
  }

  redirectToUserPage(email: string): void {
    // Since these are anonymous exchanges, we might just want to show the email
    // But keep this method in case you want to implement user lookup by email
    this.snack.ShowSnackbar(new SnackBarCreate(
      "User Email", 
      email, 
      AlertType.Info
    ));
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