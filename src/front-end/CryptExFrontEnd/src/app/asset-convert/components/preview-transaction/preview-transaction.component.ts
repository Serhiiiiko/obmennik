import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-preview-transaction',
  templateUrl: './preview-transaction.component.html',
  styleUrls: ['./preview-transaction.component.scss']
})
export class PreviewTransactionComponent implements OnInit {
  dto: AssetConverssionDto = {} as AssetConverssionDto;
  lock: AssetConversionLockViewModel;
  left: UserWalletViewModel;
  right: UserWalletViewModel;
  timeLeft: number = 60;
  timeLeftDate: number;
  timeout: NodeJS.Timeout;
  sub: Subscription;
  
  constructor(
    private service: AssetConvertService, 
    private walletService: WalletService, 
    private snack: SnackbarService, 
    private router: Router, 
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
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
  }

  amountChanged(amount: number): void {
    this.dto.amount = amount;
  }

  getResultPrice(): number {
    return Math.round(((this.dto.amount * this.lock.pair.rate) + Number.EPSILON) * 100000) / 100000
  }

  doConvert(): void {
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