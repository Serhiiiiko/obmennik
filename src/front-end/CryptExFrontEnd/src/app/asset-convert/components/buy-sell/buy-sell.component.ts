import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { UserService } from 'src/app/user/services/user.service';
import { WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConversionLockDto } from '../../models/asset-conversion-lock-dto';
import { AssetConvertService } from '../../services/asset-convert.service';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
  selector: 'app-buy-sell',
  templateUrl: './buy-sell.component.html',
  styleUrls: ['./buy-sell.component.scss']
})
export class BuySellComponent implements OnInit {
  assets: WalletViewModel[];
  dto: AssetConversionLockDto = {} as AssetConversionLockDto;
  selectedRightAsset: WalletViewModel;
  selectedLeftAsset: WalletViewModel;

  constructor(
    private walletService: WalletService,
    private service: AssetConvertService,
    private snack: SnackbarService,
    public user: UserService,
    private router: Router,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.walletService.GetWalletList().then(x => {
      if (x.success) {
        this.assets = x.content;

        // Set default assets - use SelectedCurrency from UserService for both authorized and unauthorized users
        const leftAsset = this.assets.find(x => x.ticker == this.user.SelectedCurrency);
        if (leftAsset) {
          this.dto.leftAssetId = leftAsset.id;
          this.selectedLeftAsset = leftAsset;
        }
        
        const btcAsset = this.assets.find(x => x.ticker == "BTC");
        if (btcAsset) {
          this.dto.rightAssetId = btcAsset.id;
          this.selectedRightAsset = btcAsset;
        }
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not load assets.", AlertType.Error));
      }
    });
  }

  leftAssetChanged($event: any): void {
    this.dto.leftAssetId = $event.target.value;
    this.selectedLeftAsset = this.assets.find(asset => asset.id === $event.target.value);
  }

  rightAssetChanged($event: any): void {
    this.dto.rightAssetId = $event.target.value;
    this.selectedRightAsset = this.assets.find(asset => asset.id === $event.target.value);
  }

  doLock(): void {
    // Store both assets in localStorage for guest users
    if (!this.authService.IsAuthenticated) {
      if (this.selectedLeftAsset && this.selectedRightAsset) {
        localStorage.setItem('sourceAsset', JSON.stringify(this.selectedLeftAsset));
        localStorage.setItem('destinationAsset', JSON.stringify(this.selectedRightAsset));
      }
    }

    // Allow both authenticated and guest users to continue
    this.service.LockTransaction(this.dto).then(x => {
      if (x.success) {
        // If successful, proceed to preview page regardless of auth status
        this.router.navigate(['/buy-sell/preview', x.content.id]);
        this.snack.ShowSnackbar(new SnackBarCreate("Success", "Price locked, set an amount and confirm...", AlertType.Success));
      } else {
        // Handle errors
        if (x.error.status == 400) {
          this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not process your request.", AlertType.Error));
        } else {
          this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not lock transaction", AlertType.Error));
        }
      }
    });
  }
}