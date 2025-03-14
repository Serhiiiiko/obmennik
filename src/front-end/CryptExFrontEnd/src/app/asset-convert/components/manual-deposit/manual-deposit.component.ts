import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConvertService } from '../../services/asset-convert.service';

@Component({
  selector: 'app-manual-deposit',
  templateUrl: './manual-deposit.component.html',
  styleUrls: ['./manual-deposit.component.scss']
})
export class ManualDepositComponent implements OnInit {
  walletId: string;
  walletTicker: string;
  walletAddress: string = '';
  userEmail: string = '';
  isLoading: boolean = true;
  isSubmitted: boolean = false;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletService: WalletService,
    private assetConvertService: AssetConvertService,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.walletId = params['id'];
      this.loadWalletInfo();
    });
  }

  async loadWalletInfo(): Promise<void> {
    try {
      const response = await this.walletService.GetWalletInfo(this.walletId);
      
      if (response.success) {
        this.walletTicker = response.content.ticker;
        this.walletAddress = response.content.adminWalletAddress;
        
        if (!this.walletAddress) {
          this.snackbar.ShowSnackbar(new SnackBarCreate(
            "Address Not Configured", 
            "No deposit address has been configured for this currency. Please contact support.", 
            AlertType.Error
          ));
          this.router.navigate(['/buy-sell']);
        }
        
        this.isLoading = false;
      } else {
        this.handleError();
      }
    } catch {
      this.handleError();
    }
  }

  handleError(): void {
    this.snackbar.ShowSnackbar(new SnackBarCreate(
      "Error", 
      "Could not load wallet information. Please try again later.", 
      AlertType.Error
    ));
    this.router.navigate(['/buy-sell']);
  }

  async submitDepositRequest(): Promise<void> {
    if (!this.userEmail) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Missing Information", 
        "Please provide your email address", 
        AlertType.Warning
      ));
      return;
    }

    try {
      const response = await this.assetConvertService.NotifyManualDeposit({
        email: this.userEmail,
        walletId: this.walletId,
        amount: 0 // Using 0 as a placeholder since amount will be tracked elsewhere
      });

      if (response.success) {
        this.isSubmitted = true;
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Request Submitted", 
          "We've received your deposit notification. Please complete the transaction to the provided address.", 
          AlertType.Success
        ));
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not submit your request. Please try again later.", 
          AlertType.Error
        ));
      }
    } catch {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Could not submit your request. Please try again later.", 
        AlertType.Error
      ));
    }
  }

  goBack(): void {
    this.router.navigate(['/buy-sell']);
  }
}