import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { UserWalletViewModel } from 'src/app/wallet/models/user-wallet-view-model';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConversionLockViewModel } from '../../models/asset-conversion-lock-view-model';
import { AssetConverssionDto } from '../../models/asset-converssion-dto';
import { AssetConvertService } from '../../services/asset-convert.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { AdminService } from 'src/app/admin/services/admin.service';

@Component({
  selector: 'app-preview-transaction',
  templateUrl: './preview-transaction.component.html',
  styleUrls: ['./preview-transaction.component.scss']
})
export class PreviewTransactionComponent implements OnInit, OnDestroy {
  dto: AssetConverssionDto = {} as AssetConverssionDto;
  lock: AssetConversionLockViewModel;
  left: UserWalletViewModel;
  right: UserWalletViewModel;
  timeLeft: number = 60;
  timeLeftDate: number;
  timeout: NodeJS.Timeout;
  sub: Subscription;
  minimumUsdValue: number = 99; // Default value, will be updated from admin settings
  amountError: string = ''; // Error message for amount validation
  
  // Listen for minimum amount changes
  private minimumAmountChangedListener: any;
  
  // Cryptocurrency prices in USD (fallback values if API doesn't provide)
  cryptoPrices: {[key: string]: number} = {
    'BTC': 87500.00,
    'ETH': 2014.90,
    'LTC': 92.50,
    'XRP': 2.35,
    'ADA': 0.74,
    'ATOM': 4.85,
    'ZEC': 37.91,
    'BNB': 639.75,
    'TON': 3.95,
    'USDT': 1.00,
    'USDT-BEP20': 1.00,
    'UST-TRC20': 1.00
  };
  
  constructor(
    private service: AssetConvertService, 
    private walletService: WalletService, 
    private snack: SnackbarService, 
    private router: Router, 
    private route: ActivatedRoute,
    private authService: AuthService,
    private adminService: AdminService
  ) {
    // Set up event listener for minimum amount changes
    this.minimumAmountChangedListener = (event: CustomEvent) => {
      if (event.detail && event.detail.amount) {
        this.minimumUsdValue = event.detail.amount;
        console.log(`Minimum transaction amount updated to $${this.minimumUsdValue}`);
        // Revalidate the current amount
        if (this.dto.amount) {
          this.validateAmount(this.dto.amount);
        }
      }
    };
    
    window.addEventListener('minimum-transaction-amount-changed', this.minimumAmountChangedListener);
  }

  ngOnInit(): void {
    // Get the admin-configured minimum amount
    this.loadMinimumTransactionAmount();
    
    this.sub = this.route.params.subscribe(params => {
      const id = params["id"];

      if (id == null) {
        this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not load transaction lock.", AlertType.Error));
        this.router.navigate(['buy-sell']);
        return;
      }

      this.loadLock(id);
    });
  }
  
  // Load the minimum transaction amount from admin settings
  private loadMinimumTransactionAmount(): void {
    this.adminService.getMinimumTransactionAmount().then(result => {
      if (result.success) {
        this.minimumUsdValue = result.content;
        console.log(`Loaded minimum transaction amount: $${this.minimumUsdValue}`);
      }
    });
  }

  loadLock(id: string): void {
    this.dto.transactionLockId = id;
    this.service.GetTransactionLock(id).then(async x => {
      if (x.success) {
        this.lock = x.content;
        console.log("Lock loaded:", this.lock);

        this.timeLeftDate = Date.parse(x.content.expirationUtc);
        this.timeout = setInterval(() => this.getTimeLeft(), 1000);

        // For guest users, create mock user wallet view models
        if (!this.authService.IsAuthenticated) {
          console.log("Creating mock wallet view models for guest user");
          this.left = {
            ...this.lock.pair.left,
            amount: 0
          } as UserWalletViewModel;
          
          this.right = {
            ...this.lock.pair.right,
            amount: 0
          } as UserWalletViewModel;
        } else {
          // For authenticated users
          try {
            const wallets = await this.walletService.GetUserWallets();
            if (wallets.success) {
              this.left = wallets.content.find(x => x.id == this.lock.pair.left.id);
              this.right = wallets.content.find(x => x.id == this.lock.pair.right.id);
            }
          } catch (error) {
            console.error("Error loading user wallets:", error);
          }
        }
      } else {
        this.router.navigate(['buy-sell']);
        this.snack.ShowSnackbar(new SnackBarCreate("Error", "This price lock has expired, please try again.", AlertType.Error));
      }
    }).catch(error => {
      console.error("Error getting transaction lock:", error);
      this.router.navigate(['buy-sell']);
      this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not load transaction details.", AlertType.Error));
    });
  }

  getTimeLeft(): void {
    var nowDate = new Date(Date.now());
    const current = (Date.now()) + nowDate.getTimezoneOffset() * 60 * 1000;

    this.timeLeft = Math.round((this.timeLeftDate - current) / 1000);

    if (this.timeLeft <= 0) {
      clearTimeout(this.timeout);
      this.router.navigate(['buy-sell']);
      this.snack.ShowSnackbar(new SnackBarCreate("Error", "This price lock has expired, please try again.", AlertType.Error));
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    
    if (this.timeout != null)
      clearTimeout(this.timeout);
      
    // Remove event listener
    window.removeEventListener('minimum-transaction-amount-changed', this.minimumAmountChangedListener);
  }

  // Calculate the USD value of the transaction
  calculateUsdValue(amount: number): number {
    if (!amount || !this.lock || !this.lock.pair || !this.lock.pair.left) {
      return 0;
    }
    
    const cryptoTicker = this.lock.pair.left.ticker;
    let usdPrice = this.cryptoPrices[cryptoTicker] || 0;
    
    return amount * usdPrice;
  }
  
  // Validate amount against minimum USD requirement
  validateAmount(amount: number): boolean {
    if (!amount || amount <= 0) {
      this.amountError = 'Please enter a valid amount';
      return false;
    }
    
    // Calculate the USD value
    const usdValue = this.calculateUsdValue(amount);
    
    // Check if the amount meets the minimum USD requirement
    if (usdValue < this.minimumUsdValue) {
      const minimumCryptoAmount = this.minimumUsdValue / this.cryptoPrices[this.lock.pair.left.ticker];
      this.amountError = `Minimum transaction value is $${this.minimumUsdValue} (approximately ${minimumCryptoAmount.toFixed(8)} ${this.lock.pair.left.ticker})`;
      return false;
    }
    
    this.amountError = '';
    return true;
  }

  // Updated to check for minimum USD value
  amountChanged(value: any): void {
    // Convert the input to a number
    const amount = parseFloat(value);
    
    // Validate that it's a valid number
    if (!isNaN(amount) && amount > 0) {
      this.dto.amount = amount;
      this.validateAmount(amount);
    } else {
      // If invalid, set to null or 0
      this.dto.amount = null;
      this.amountError = 'Please enter a valid amount';
    }
  }

  // Check if the amount is valid based on USD value
  isAmountValid(): boolean {
    if (!this.dto.amount) return false;
    
    const usdValue = this.calculateUsdValue(this.dto.amount);
    return usdValue >= this.minimumUsdValue;
  }

  // Get minimum required crypto amount
  getMinimumCryptoAmount(): string {
    if (!this.lock || !this.lock.pair || !this.lock.pair.left) return '0';
    
    const ticker = this.lock.pair.left.ticker;
    const usdPrice = this.cryptoPrices[ticker] || 1;
    const minAmount = this.minimumUsdValue / usdPrice;
    
    return minAmount.toFixed(8);
  }

  // Make sure getResultPrice handles null or undefined amounts
  getResultPrice(): number {
    if (!this.dto.amount) return 0;
    return Math.round(((this.dto.amount * this.lock.pair.rate) + Number.EPSILON) * 100000) / 100000;
  }

  doConvert(): void {
    // First check if the amount meets the minimum USD requirement
    if (!this.isAmountValid()) {
      this.snack.ShowSnackbar(new SnackBarCreate(
        "Error", 
        `Minimum transaction value is $${this.minimumUsdValue}`, 
        AlertType.Error
      ));
      return;
    }
    
    console.log("doConvert called, authenticated:", this.authService.IsAuthenticated);
    if (this.authService.IsAuthenticated) {
      // For authenticated users, use the normal flow
      this.service.Convert(this.dto).then(x => {
        if (x.success) {
          this.router.navigate(['buy-sell/transaction', x.content]);
          this.snack.ShowSnackbar(new SnackBarCreate("Success", "Transaction started.", AlertType.Success));
        } else {
          this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not convert assets.", AlertType.Error));
        }
      });
    } else {
      // For guest users, go to manual deposit page
      console.log("Redirecting guest user to manual deposit page");
      
      // Navigate to manual deposit page with relevant parameters
      this.router.navigate(['/buy-sell/manual-deposit', this.lock.pair.right.id], { 
        queryParams: { 
          amount: this.dto.amount,
          sourceCurrency: this.lock.pair.left.ticker
        }
      });
      
      // Remove lock since we're not using it
      this.service.RemoveTransactionLock(this.lock.id);
      
      this.snack.ShowSnackbar(new SnackBarCreate("Success", "Proceeding to manual deposit", AlertType.Success));
    }
  }

  doCancel(): void {
    this.service.RemoveTransactionLock(this.lock.id);
    this.router.navigate(['buy-sell']);
    this.snack.ShowSnackbar(new SnackBarCreate("Success", "Transaction successfully cancelled.", AlertType.Success));
  }
}