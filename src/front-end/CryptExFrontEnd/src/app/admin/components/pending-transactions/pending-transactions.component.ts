import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AssetConverssionViewModel } from 'src/app/asset-convert/models/asset-converssion-view-model';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-pending-transactions',
  templateUrl: './pending-transactions.component.html',
  styleUrls: ['./pending-transactions.component.scss']
})
export class PendingTransactionsComponent implements OnInit {
  pendingTransactions: AssetConverssionViewModel[] = [];
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
    this.adminService.GetPendingTransactions().then(result => {
      this.loading = false;
      if (result.success) {
        this.pendingTransactions = result.content;
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
    this.adminService.SetTransactionStatus(id, PaymentStatus.success).then(result => {
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
    this.adminService.SetTransactionStatus(id, PaymentStatus.failed).then(result => {
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

  redirectToUserPage(id: string): void {
    this.router.navigate(["../user", id], { relativeTo: this.activatedRoute });
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