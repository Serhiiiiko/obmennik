import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { UserService } from 'src/app/user/services/user.service';
import { WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConversionLockDto } from '../../models/asset-conversion-lock-dto';
import { AssetConvertService } from '../../services/asset-convert.service';

@Component({
  selector: 'app-buy-sell',
  templateUrl: './buy-sell.component.html',
  styleUrls: ['./buy-sell.component.scss']
})
export class BuySellComponent implements OnInit {
  assets: WalletViewModel[];
  dto: AssetConversionLockDto = {} as AssetConversionLockDto;
  selectedRightAsset: WalletViewModel;

  constructor(
    private walletService: WalletService,
    private service: AssetConvertService,
    private snack: SnackbarService,
    public user: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.walletService.GetWalletList().then(x => {
      if (x.success) {
        this.assets = x.content;

        this.dto.leftAssetId = this.assets.find(x => x.ticker == this.user.SelectedCurrency).id;
        const btcAsset = this.assets.find(x => x.ticker == "BTC");
        this.dto.rightAssetId = btcAsset.id;
        this.selectedRightAsset = btcAsset;
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not load assets.", AlertType.Error));
      }
    })
  }

  leftAssetChanged($event: any): void {
    this.dto.leftAssetId = $event.target.value;
  }

  rightAssetChanged($event: any): void {
    this.dto.rightAssetId = $event.target.value;
    this.selectedRightAsset = this.assets.find(asset => asset.id === $event.target.value);
  }

  doLock(): void {
    
    this.router.navigate(['/buy-sell/manual-deposit', this.selectedRightAsset.id]);
  }
}