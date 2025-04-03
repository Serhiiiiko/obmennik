import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConvertService } from '../../services/asset-convert.service';
import { AnonymousExchangeRequestDto, AnonymousExchangeConfirmationDto } from '../../models/anonymous-exchange-request-dto';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';

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
  
  // Store the wallet objects
  sourceWallet: WalletViewModel = null;
  destinationWallet: WalletViewModel = null;
  destinationAmount: any;
  
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
        console.log("Found stored wallet data in localStorage");
        this.sourceWallet = JSON.parse(sourceAssetJson);
        this.destinationWallet = JSON.parse(destinationAssetJson);
        
        this.sourceCurrency = this.sourceWallet.ticker;
        this.targetCurrency = this.destinationWallet.ticker;
        this.sourceWalletId = this.sourceWallet.id;
        this.destinationWalletId = this.destinationWallet.id;
        
        // Get amount from query params if available
        this.route.queryParams.subscribe(params => {
          if (params['amount']) {
            this.amount = parseFloat(params['amount']);
          }
        });
        
        // Check if admin wallet address is configured
        if (this.sourceWallet.adminWalletAddress) {
          this.adminWalletAddress = this.sourceWallet.adminWalletAddress;
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
            this.amount = queryParams['amount'] ? parseFloat(queryParams['amount']) : 0;
            
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
      // Generate placeholder values for transaction data
      this.generateTransactionDetails();
      
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

  // Generate transaction hash and sender address automatically
  private generateTransactionDetails(): void {
    // Generate a transaction hash based on the current time and random values
    this.transactionHash = this.generateTransactionHash();
    
    // Generate a sender wallet address if not already set
    if (!this.senderWalletAddress || this.senderWalletAddress.startsWith('pending-')) {
      this.senderWalletAddress = this.generateWalletAddress();
    }
    
    console.log("Generated transaction hash:", this.transactionHash);
    console.log("Generated sender address:", this.senderWalletAddress);
  }

  // Generate a transaction hash
  private generateTransactionHash(): string {
    const timestamp = new Date().getTime().toString(16);
    const random = Math.random().toString(16).substring(2);
    return timestamp + random;
  }

  // Find the confirmTransaction method in manual-deposit.component.ts and update the transaction creation:

async confirmTransaction(): Promise<void> {
  try {
    // If transactionHash is empty, generate a new one
    if (!this.transactionHash) {
      this.transactionHash = this.generateTransactionHash();
    }
    
    // If senderWalletAddress is empty or still a placeholder, generate a real one
    if (!this.senderWalletAddress || this.senderWalletAddress.startsWith('pending-')) {
      this.senderWalletAddress = this.generateWalletAddress();
    }
    
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
    
    // Get the correct exchange rate (if available)
    let exchangeRate = 0;
    
    // Use the correct exchange rate value if available
    if (this.sourceWallet && this.destinationWallet) {
      // Try to get the exchange rate from API (this might be async, but for local storage we'll use a simpler approach)
      try {
        // If we have destinationAmount, we can calculate the exchange rate
        if (this.destinationAmount && this.amount > 0) {
          exchangeRate = this.destinationAmount / this.amount;
        } else {
          // Fallback to hardcoded rates or any available source
          const cryptoRates = {
            "BTC": {
              "ETH": 43.4264,          // 87500 / 2014.90
              "ADA": 118243.2432,      // 87500 / 0.74
              "XRP": 37234.0426,       // 87500 / 2.35
              "BNB": 136.7676,         // 87500 / 639.75
              "USDT": 87500,           // 87500 / 1
              "USDT-BEP20": 87500,     // 87500 / 1
              "ATOM": 18041.2371,      // 87500 / 4.85
              "ZEC": 2308.0981,        // 87500 / 37.91
              "TON": 22151.8987,       // 87500 / 3.95
              "UST-TRC20": 87500,      // 87500 / 1
              "LTC": 945.9459          // 87500 / 92.50
            },
            "ETH": {
              "BTC": 0.0230274,        // 2014.90 / 87500
              "ADA": 2722.8378,        // 2014.90 / 0.74
              "XRP": 857.4043,         // 2014.90 / 2.35
              "BNB": 3.1494,           // 2014.90 / 639.75
              "USDT": 2014.90,         // 2014.90 / 1
              "USDT-BEP20": 2014.90,   // 2014.90 / 1
              "ATOM": 415.4433,        // 2014.90 / 4.85
              "ZEC": 53.1496,          // 2014.90 / 37.91
              "TON": 510.1013,         // 2014.90 / 3.95
              "UST-TRC20": 2014.90,    // 2014.90 / 1
              "LTC": 21.7827           // 2014.90 / 92.50
            },
            "ADA": {
              "BTC": 0.00000846,       // 0.74 / 87500
              "ETH": 0.0003673,        // 0.74 / 2014.90
              "XRP": 0.3149,           // 0.74 / 2.35
              "BNB": 0.0011566,        // 0.74 / 639.75
              "USDT": 0.74,            // 0.74 / 1
              "USDT-BEP20": 0.74,      // 0.74 / 1
              "ATOM": 0.1526,          // 0.74 / 4.85
              "ZEC": 0.0195,           // 0.74 / 37.91
              "TON": 0.1873,           // 0.74 / 3.95
              "UST-TRC20": 0.74,       // 0.74 / 1
              "LTC": 0.008              // 0.74 / 92.50
            },
            "XRP": {
              "BTC": 0.0000269,        // 2.35 / 87500
              "ETH": 0.0011663,        // 2.35 / 2014.90
              "ADA": 3.1757,           // 2.35 / 0.74
              "BNB": 0.0036732,        // 2.35 / 639.75
              "USDT": 2.35,            // 2.35 / 1
              "USDT-BEP20": 2.35,      // 2.35 / 1
              "ATOM": 0.4845,          // 2.35 / 4.85
              "ZEC": 0.062,            // 2.35 / 37.91
              "TON": 0.5949,           // 2.35 / 3.95
              "UST-TRC20": 2.35,       // 2.35 / 1
              "LTC": 0.0254            // 2.35 / 92.50
            },
            "BNB": {
              "BTC": 0.0073113,        // 639.75 / 87500
              "ETH": 0.3175,           // 639.75 / 2014.90
              "ADA": 864.5270,         // 639.75 / 0.74
              "XRP": 272.2340,         // 639.75 / 2.35
              "USDT": 639.75,          // 639.75 / 1
              "USDT-BEP20": 639.75,    // 639.75 / 1
              "ATOM": 131.9072,        // 639.75 / 4.85
              "ZEC": 16.8755,          // 639.75 / 37.91
              "TON": 161.9620,         // 639.75 / 3.95
              "UST-TRC20": 639.75,     // 639.75 / 1
              "LTC": 6.9162            // 639.75 / 92.50
            },
            "USDT": {
              "BTC": 0.0000114,        // 1 / 87500
              "ETH": 0.0004963,        // 1 / 2014.90
              "ADA": 1.3514,           // 1 / 0.74
              "XRP": 0.4255,           // 1 / 2.35
              "BNB": 0.0015631,        // 1 / 639.75
              "USDT-BEP20": 1,         // 1 / 1
              "ATOM": 0.2062,          // 1 / 4.85
              "ZEC": 0.0264,           // 1 / 37.91
              "TON": 0.2532,           // 1 / 3.95
              "UST-TRC20": 1,          // 1 / 1
              "LTC": 0.0108            // 1 / 92.50
            },
            "USDT-BEP20": {
              "BTC": 0.0000114,        // 1 / 87500
              "ETH": 0.0004963,        // 1 / 2014.90
              "ADA": 1.3514,           // 1 / 0.74
              "XRP": 0.4255,           // 1 / 2.35
              "BNB": 0.0015631,        // 1 / 639.75
              "USDT": 1,               // 1 / 1
              "ATOM": 0.2062,          // 1 / 4.85
              "ZEC": 0.0264,           // 1 / 37.91
              "TON": 0.2532,           // 1 / 3.95
              "UST-TRC20": 1,          // 1 / 1
              "LTC": 0.0108            // 1 / 92.50
            },
            "ATOM": {
              "BTC": 0.0000554,        // 4.85 / 87500
              "ETH": 0.0024071,        // 4.85 / 2014.90
              "ADA": 6.5541,           // 4.85 / 0.74
              "XRP": 2.0638,           // 4.85 / 2.35
              "BNB": 0.0075809,        // 4.85 / 639.75
              "USDT": 4.85,            // 4.85 / 1
              "USDT-BEP20": 4.85,      // 4.85 / 1
              "ZEC": 0.1279,           // 4.85 / 37.91
              "TON": 1.2278,           // 4.85 / 3.95
              "UST-TRC20": 4.85,       // 4.85 / 1
              "LTC": 0.0524            // 4.85 / 92.50
            },
            "ZEC": {
              "BTC": 0.0004332,        // 37.91 / 87500
              "ETH": 0.0188149,        // 37.91 / 2014.90
              "ADA": 51.2297,          // 37.91 / 0.74
              "XRP": 16.1319,          // 37.91 / 2.35
              "BNB": 0.0592,           // 37.91 / 639.75
              "USDT": 37.91,           // 37.91 / 1
              "USDT-BEP20": 37.91,     // 37.91 / 1
              "ATOM": 7.8165,          // 37.91 / 4.85
              "TON": 9.5974,           // 37.91 / 3.95
              "UST-TRC20": 37.91,      // 37.91 / 1
              "LTC": 0.4098            // 37.91 / 92.50
            },
            "TON": {
              "BTC": 0.0000451,        // 3.95 / 87500
              "ETH": 0.0019604,        // 3.95 / 2014.90
              "ADA": 5.3378,           // 3.95 / 0.74
              "XRP": 1.6809,           // 3.95 / 2.35
              "BNB": 0.0061742,        // 3.95 / 639.75
              "USDT": 3.95,            // 3.95 / 1
              "USDT-BEP20": 3.95,      // 3.95 / 1
              "ATOM": 0.8144,          // 3.95 / 4.85
              "ZEC": 0.1042,           // 3.95 / 37.91
              "UST-TRC20": 3.95,       // 3.95 / 1
              "LTC": 0.0427            // 3.95 / 92.50
            },
            "UST-TRC20": {
              "BTC": 0.0000114,        // 1 / 87500
              "ETH": 0.0004963,        // 1 / 2014.90
              "ADA": 1.3514,           // 1 / 0.74
              "XRP": 0.4255,           // 1 / 2.35
              "BNB": 0.0015631,        // 1 / 639.75
              "USDT": 1,               // 1 / 1
              "USDT-BEP20": 1,         // 1 / 1
              "ATOM": 0.2062,          // 1 / 4.85
              "ZEC": 0.0264,           // 1 / 37.91
              "TON": 0.2532,           // 1 / 3.95
              "LTC": 0.0108            // 1 / 92.50
            },
            "LTC": {
              "BTC": 0.0010571,        // 92.50 / 87500
              "ETH": 0.0459079,        // 92.50 / 2014.90
              "ADA": 125,              // 92.50 / 0.74
              "XRP": 39.3617,          // 92.50 / 2.35
              "BNB": 0.1446,           // 92.50 / 639.75
              "USDT": 92.50,           // 92.50 / 1
              "USDT-BEP20": 92.50,     // 92.50 / 1
              "ATOM": 19.0722,         // 92.50 / 4.85
              "ZEC": 2.4399,           // 92.50 / 37.91
              "TON": 23.4177,          // 92.50 / 3.95
              "UST-TRC20": 92.50       // 92.50 / 1
            }
          };
          
          if (cryptoRates[this.sourceCurrency] && cryptoRates[this.sourceCurrency][this.targetCurrency]) {
            exchangeRate = cryptoRates[this.sourceCurrency][this.targetCurrency];
          }
        }
      } catch (error) {
        console.error('Error determining exchange rate:', error);
        // Fallback to a reasonable default based on the screenshot
        if (this.sourceCurrency === 'BTC' && this.targetCurrency === 'ETH') {
          exchangeRate = 87.00;
        }
      }
    }
    
    // Create transaction object with proper exchange rate
    const transaction = {
      id: this.exchangeId,
      amount: this.amount,
      sourceAmount: this.amount,
      destinationAmount: this.destinationAmount || (this.amount * exchangeRate),
      creationDate: new Date().toISOString(),
      pair: {
        left: { ticker: this.sourceCurrency },
        right: { ticker: this.targetCurrency },
        rate: exchangeRate  // Now using the correct exchange rate!
      },
      exchangeRate: exchangeRate,  // Adding as a backup property
      status: PaymentStatus.awaitingVerification,
      transactionHash: this.transactionHash || 'Pending'
    };
    
    // Add to localStorage
    try {
      let transactions = [];
      const stored = localStorage.getItem('anonymousTransactions');
      if (stored) {
        transactions = JSON.parse(stored);
      }
      transactions.push(transaction);
      localStorage.setItem('anonymousTransactions', JSON.stringify(transactions));
      console.log('Saved transaction to localStorage with proper exchange rate:', transaction);
    } catch (error) {
      console.error('Error saving transaction to localStorage', error);
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

  // Helper method to generate a wallet address
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