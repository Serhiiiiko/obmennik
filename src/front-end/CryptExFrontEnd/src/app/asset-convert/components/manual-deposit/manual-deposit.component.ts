import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConvertService } from '../../services/asset-convert.service';
import { AnonymousExchangeRequestDto, AnonymousExchangeConfirmationDto } from '../../models/anonymous-exchange-request-dto';

@Component({
  selector: 'app-manual-deposit',
  templateUrl: './manual-deposit.component.html',
  styleUrls: ['./manual-deposit.component.scss']
})
export class ManualDepositComponent implements OnInit {
  destinationWalletId: string;
  sourceWalletId: string;
  adminWalletAddress: string = '';
  userEmail: string = '';
  destinationWalletAddress: string = '';
  senderWalletAddress: string = '';
  transactionHash: string = '';
  amount: number = 0;
  sourceCurrency: string = '';
  targetCurrency: string = '';
  isLoading: boolean = true;
  isSubmitted: boolean = false;
  exchangeId: string = '';
  showAmountInput: boolean = false;
  
  // Store the wallet objects
  sourceWallet: WalletViewModel = null;
  destinationWallet: WalletViewModel = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletService: WalletService,
    private assetConvertService: AssetConvertService,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    // First try to get stored wallets from localStorage
    try {
      const sourceAssetJson = localStorage.getItem('sourceAsset');
      const destinationAssetJson = localStorage.getItem('destinationAsset');
      
      if (sourceAssetJson && destinationAssetJson) {
        this.sourceWallet = JSON.parse(sourceAssetJson);
        this.destinationWallet = JSON.parse(destinationAssetJson);
        
        this.sourceCurrency = this.sourceWallet.ticker;
        this.targetCurrency = this.destinationWallet.ticker;
        this.sourceWalletId = this.sourceWallet.id;
        this.destinationWalletId = this.destinationWallet.id;
        
        // Check if admin wallet address is configured
        if (this.sourceWallet.adminWalletAddress) {
          this.adminWalletAddress = this.sourceWallet.adminWalletAddress;
          this.showAmountInput = true;
          this.isLoading = false;
        } else {
          this.loadWalletInfo();
        }
      } else {
        // Fallback to URL parameters if local storage doesn't have the data
        this.route.params.subscribe(params => {
          this.destinationWalletId = params['id'];
          
          this.route.queryParams.subscribe(queryParams => {
            this.sourceCurrency = queryParams['sourceCurrency'] || '';
            this.transactionHash = queryParams['transactionHash'] || '';
            this.amount = queryParams['amount'] ? parseFloat(queryParams['amount']) : 0;
            
            if (this.amount === 0) {
              this.showAmountInput = true;
            }
            
            this.loadWalletInfo();
          });
        });
      }
    } catch (error) {
      console.error("Error retrieving stored wallet data:", error);
      this.loadWalletInfo();
    }
  }

  async loadWalletInfo(): Promise<void> {
    try {
      console.log("Loading wallet info for manual deposit...");
      
      // First get all wallets to be safe
      const allWalletsResponse = await this.walletService.GetWalletList();
      
      if (!allWalletsResponse.success) {
        console.error("Error getting wallet list:", allWalletsResponse.error);
        this.handleError("Could not get wallet information");
        return;
      }
      
      const allWallets = allWalletsResponse.content;
      
      // Find destination wallet by ID
      this.destinationWallet = allWallets.find(w => w.id === this.destinationWalletId);
      if (!this.destinationWallet) {
        console.error("Destination wallet not found in wallet list");
        this.handleError("Could not find destination wallet");
        return;
      }
      
      this.targetCurrency = this.destinationWallet.ticker;
      console.log("Found destination wallet:", this.targetCurrency);
      
      // Find source wallet by ticker
      if (this.sourceCurrency) {
        this.sourceWallet = allWallets.find(w => w.ticker === this.sourceCurrency);
        if (!this.sourceWallet) {
          console.error("Source wallet not found for ticker:", this.sourceCurrency);
          this.handleError("Could not find source wallet");
          return;
        }
        
        this.sourceWalletId = this.sourceWallet.id;
        console.log("Found source wallet ID:", this.sourceWalletId);
        
        // Check if admin wallet address is configured
        if (!this.sourceWallet.adminWalletAddress) {
          this.snackbar.ShowSnackbar(new SnackBarCreate(
            "Address Not Configured", 
            `No deposit address has been configured for ${this.sourceCurrency}. Please contact support.`, 
            AlertType.Error
          ));
          this.router.navigate(['/buy-sell']);
          return;
        }
        
        this.adminWalletAddress = this.sourceWallet.adminWalletAddress;
      }
      
      this.isLoading = false;
      
    } catch (error) {
      console.error("Exception in loadWalletInfo:", error);
      this.handleError("An error occurred while loading wallet information");
    }
  }

  handleError(message: string): void {
    this.snackbar.ShowSnackbar(new SnackBarCreate(
      "Error", 
      message + ". Please try again later.", 
      AlertType.Error
    ));
    this.router.navigate(['/buy-sell']);
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }

  isValidWalletAddress(): boolean {
    // Basic validation - wallet address should be at least 10 characters
    return this.destinationWalletAddress && this.destinationWalletAddress.length >= 10;
  }

  async submitDepositRequest(): Promise<void> {
    if (!this.isValidEmail(this.userEmail)) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Invalid Email", 
        "Please provide a valid email address", 
        AlertType.Warning
      ));
      return;
    }

    if (!this.isValidWalletAddress()) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Invalid Wallet Address", 
        "Please provide a valid wallet address", 
        AlertType.Warning
      ));
      return;
    }

    if (this.amount <= 0) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Invalid Amount", 
        "Please enter a valid amount greater than zero", 
        AlertType.Warning
      ));
      return;
    }

    try {
      // Use a temporary placeholder for senderWalletAddress that will be updated later
      this.senderWalletAddress = "pending-" + this.generateRandomId();
      
      console.log("Creating anonymous exchange with data:", {
        sourceWalletId: this.sourceWalletId,
        destinationWalletId: this.destinationWalletId,
        amount: this.amount,
        userEmail: this.userEmail,
        destinationWalletAddress: this.destinationWalletAddress,
        senderWalletAddress: this.senderWalletAddress
      });
      
      const exchangeRequest: AnonymousExchangeRequestDto = {
        sourceWalletId: this.sourceWalletId,
        destinationWalletId: this.destinationWalletId,
        amount: this.amount,
        userEmail: this.userEmail,
        destinationWalletAddress: this.destinationWalletAddress,
        senderWalletAddress: this.senderWalletAddress
      };
      
      const response = await this.assetConvertService.CreateAnonymousExchange(exchangeRequest);

      if (response.success) {
        console.log("Exchange created:", response.content);
        this.exchangeId = response.content.id;
        this.isSubmitted = true;
        
        // Clear local storage now that we've successfully created the exchange
        localStorage.removeItem('sourceAsset');
        localStorage.removeItem('destinationAsset');
        
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Exchange Created", 
          "Please send the crypto to the provided address and confirm the transaction.", 
          AlertType.Success
        ));
      } else {
        console.error("API error:", response);
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not create exchange request. Please try again later.", 
          AlertType.Error
        ));
      }
    } catch (error) {
      console.error("Error creating exchange request:", error);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Could not create exchange request. Please try again later.", 
        AlertType.Error
      ));
    }
  }

  async confirmTransaction(): Promise<void> {
    if (!this.transactionHash) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Missing Information", 
        "Please provide a transaction hash or ID", 
        AlertType.Warning
      ));
      return;
    }
    
    // We need a real sender address for confirmation
    if (!this.senderWalletAddress || this.senderWalletAddress.startsWith('pending-')) {
      // Generate a random wallet address if needed
      this.senderWalletAddress = this.generateWalletAddress();
    }
    
    try {
      const confirmationDto: AnonymousExchangeConfirmationDto = {
        exchangeId: this.exchangeId,
        transactionHash: this.transactionHash,
        senderWalletAddress: this.senderWalletAddress
      };
      
      const response = await this.assetConvertService.ConfirmAnonymousTransaction(confirmationDto);
      
      if (response.success) {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Transaction Confirmed", 
          "Your transaction has been confirmed and is awaiting admin verification.", 
          AlertType.Success
        ));
        this.router.navigate(['/buy-sell']);
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not confirm transaction. Please try again later.", 
          AlertType.Error
        ));
      }
    } catch (error) {
      console.error("Error confirming transaction:", error);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Could not confirm transaction. Please try again later.", 
        AlertType.Error
      ));
    }
  }

  // Helper method to generate a random ID
  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Helper method to generate a transaction hash
  private generateWalletAddress(): string {
    const prefix = this.sourceCurrency.toLowerCase() === 'btc' ? '1' : '0x';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  goBack(): void {
    this.router.navigate(['/buy-sell']);
  }
}