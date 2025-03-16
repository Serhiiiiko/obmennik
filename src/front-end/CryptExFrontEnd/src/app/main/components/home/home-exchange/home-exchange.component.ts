// Update home-exchange.component.ts
import { Component, OnInit } from '@angular/core';
import { WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { AssetConversionLockDto } from '../../../../asset-convert/models/asset-conversion-lock-dto';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConvertService } from '../../../../asset-convert/services/asset-convert.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { UserService } from 'src/app/user/services/user.service';
import { Router } from '@angular/router';
import { SnackBarCreate, AlertType } from 'src/app/components/snackbar/snack-bar';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
  selector: 'app-home-exchange',
  templateUrl: './home-exchange.component.html',
  styleUrls: ['./home-exchange.component.scss'],
})
export class HomeExchangeComponent implements OnInit {
  assets: WalletViewModel[];
  dto: AssetConversionLockDto = {} as AssetConversionLockDto;
  selectedLeftWallet: WalletViewModel;
  selectedRightWallet: WalletViewModel;

  constructor(
    private walletService: WalletService,
    private service: AssetConvertService,
    private snack: SnackbarService,
    public user: UserService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Загружаем список доступных активов
    this.walletService.GetWalletList().then(x => {
      if (x.success) {
        this.assets = x.content;
        // Задаём начальные значения (например, слева - фиат, справа - BTC)
        const leftAsset = this.assets.find(a => a.ticker == this.user.SelectedCurrency);
        if (leftAsset) {
          this.dto.leftAssetId = leftAsset.id;
          this.selectedLeftWallet = leftAsset;
        }
        
        const rightAsset = this.assets.find(a => a.ticker == 'BTC');
        if (rightAsset) {
          this.dto.rightAssetId = rightAsset.id;
          this.selectedRightWallet = rightAsset;
        }
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not load assets.", AlertType.Error));
      }
    });
  }

  leftAssetChanged($event: any): void {
    this.dto.leftAssetId = $event.target.value;
    this.selectedLeftWallet = this.assets.find(asset => asset.id === $event.target.value);
  }

  rightAssetChanged($event: any): void {
    this.dto.rightAssetId = $event.target.value;
    this.selectedRightWallet = this.assets.find(asset => asset.id === $event.target.value);
  }

  doLock(): void {
    // Store wallet info for guest users
    if (!this.authService.IsAuthenticated && this.selectedLeftWallet && this.selectedRightWallet) {
      localStorage.setItem('sourceAsset', JSON.stringify(this.selectedLeftWallet));
      localStorage.setItem('destinationAsset', JSON.stringify(this.selectedRightWallet));
    }

    this.service.LockTransaction(this.dto).then(x => {
      if (x.success) {
        // Переходим на страницу предпросмотра
        this.router.navigate(['/buy-sell/preview', x.content.id]);
        this.snack.ShowSnackbar(new SnackBarCreate("Success", "Price locked, set an amount and confirm...", AlertType.Success));
      } else {
        if (x.error && x.error.status == 400) {
          this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not process your request.", AlertType.Error));
        } else {
          this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not convert assets.", AlertType.Error));
        }
      }
    }).catch(error => {
      console.error("Error in doLock:", error);
      this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not process your request.", AlertType.Error));
    });
  }
}