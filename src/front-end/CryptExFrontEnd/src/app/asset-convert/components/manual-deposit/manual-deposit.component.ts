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
  transactionHash: string = '';
  amount: number = 0;
  sourceCurrency: string = '';
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
      
      // Get query parameters
      this.route.queryParams.subscribe(queryParams => {
        this.transactionHash = queryParams['transactionHash'] || '';
        this.amount = queryParams['amount'] ? parseFloat(queryParams['amount']) : 0;
        this.sourceCurrency = queryParams['sourceCurrency'] || '';
        console.log("Retrieved parameters:", { 
          walletId: this.walletId,
          transactionHash: this.transactionHash,
          amount: this.amount,
          sourceCurrency: this.sourceCurrency
        });
      });
      
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
      console.log("Submitting deposit with data:", {
        walletId: this.walletId,
        amount: this.amount,
        email: this.userEmail,
        transactionHash: this.transactionHash
      });
      
      const response = await this.assetConvertService.NotifyManualDeposit({
        depositId: "00000000-0000-0000-0000-000000000000", // Empty GUID for new deposits
        senderWalletAddress: "",
        transactionHash: this.transactionHash,
        transactionId: this.transactionHash, // Set both to ensure one works
        amountSent: this.amount,
        email: this.userEmail,
        walletId: this.walletId
      });

      console.log("API response:", response);

      if (response.success) {
        this.isSubmitted = true;
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Request Submitted", 
          "We've received your deposit notification.", 
          AlertType.Success
        ));
      } else {
        console.error("API error:", response);
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not submit your request. Please try again later.", 
          AlertType.Error
        ));
      }
    } catch (error) {
      console.error("Error submitting deposit request:", error);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Could not submit your request. Please try again later.", 
        AlertType.Error
      ));
    }
  }
// Add this method to the ManualDepositComponent class
isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email);
}
  // Helper method to generate a transaction hash
  private generateTransactionHash(): string {
    // Simple implementation - in real app you might want something more sophisticated
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  goBack(): void {
    this.router.navigate(['/buy-sell']);
  }
}