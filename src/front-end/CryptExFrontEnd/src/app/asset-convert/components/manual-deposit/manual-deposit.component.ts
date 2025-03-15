import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
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
  senderWalletAddress: string = ''; // Keep track of a separate senderWalletAddress
  transactionHash: string = '';
  amount: number = 0;
  sourceCurrency: string = '';
  targetCurrency: string = '';
  isLoading: boolean = true;
  isSubmitted: boolean = false;
  exchangeId: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletService: WalletService,
    private assetConvertService: AssetConvertService,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.destinationWalletId = params['id'];
      
      // Get query parameters
      this.route.queryParams.subscribe(queryParams => {
        this.transactionHash = queryParams['transactionHash'] || '';
        this.amount = queryParams['amount'] ? parseFloat(queryParams['amount']) : 0;
        this.sourceCurrency = queryParams['sourceCurrency'] || '';
        
        console.log("Retrieved parameters:", { 
          destinationWalletId: this.destinationWalletId,
          transactionHash: this.transactionHash,
          amount: this.amount,
          sourceCurrency: this.sourceCurrency
        });
        
        this.loadWalletInfo();
      });
    });
  }

  async loadWalletInfo(): Promise<void> {
    try {
      // Get destination wallet info
      const destinationResponse = await this.walletService.GetWalletInfo(this.destinationWalletId);
      
      if (destinationResponse.success) {
        this.targetCurrency = destinationResponse.content.ticker;
        
        // Get source wallet info
        const sourceWalletResponse = await this.walletService.GetWalletByTicker(this.sourceCurrency);
        
        if (sourceWalletResponse.success) {
          this.sourceWalletId = sourceWalletResponse.content.id;
          
          // Check if admin wallet address is configured
          if (!sourceWalletResponse.content.adminWalletAddress) {
            this.snackbar.ShowSnackbar(new SnackBarCreate(
              "Address Not Configured", 
              `No deposit address has been configured for ${this.sourceCurrency}. Please contact support.`, 
              AlertType.Error
            ));
            this.router.navigate(['/buy-sell']);
            return;
          }
          
          this.adminWalletAddress = sourceWalletResponse.content.adminWalletAddress;
          this.isLoading = false;
        } else {
          this.handleError("Could not get source wallet information");
        }
      } else {
        this.handleError("Could not get destination wallet information");
      }
    } catch (error) {
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

    try {
      // Use a temporary placeholder for senderWalletAddress that will be updated later
      // This is to prevent database errors since the field is required
      this.senderWalletAddress = "pending-" + this.generateRandomId();
      
      console.log("Creating anonymous exchange with data:", {
        sourceWalletId: this.sourceWalletId,
        destinationWalletId: this.destinationWalletId,
        amount: this.amount,
        userEmail: this.userEmail,
        destinationWalletAddress: this.destinationWalletAddress,
        senderWalletAddress: this.senderWalletAddress
      });
      
      // Create an anonymous exchange request
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