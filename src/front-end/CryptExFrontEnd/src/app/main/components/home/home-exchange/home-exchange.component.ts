import { Component, OnInit } from '@angular/core';
import { WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { AssetConversionLockDto } from '../../../../asset-convert/models/asset-conversion-lock-dto';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AssetConvertService } from '../../../../asset-convert/services/asset-convert.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { UserService } from 'src/app/user/services/user.service';
import { Router } from '@angular/router';
import { SnackBarCreate, AlertType } from 'src/app/components/snackbar/snack-bar';

@Component({
  selector: 'app-home-exchange',
  templateUrl: './home-exchange.component.html',
  styleUrls: ['./home-exchange.component.scss'],
})
export class HomeExchangeComponent implements OnInit {
  assets: WalletViewModel[];
  dto: AssetConversionLockDto = {} as AssetConversionLockDto;

  constructor(
    private walletService: WalletService,
    private service: AssetConvertService,
    private snack: SnackbarService,
    public user: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Загружаем список доступных активов
    this.walletService.GetWalletList().then(x => {
      if (x.success) {
        this.assets = x.content;
        // Задаём начальные значения (например, слева - фиат, справа - BTC)
        this.dto.leftAssetId = this.assets.find(a => a.ticker == this.user.SelectedCurrency)?.id;
        this.dto.rightAssetId = this.assets.find(a => a.ticker == 'BTC')?.id;
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not load assets.", AlertType.Error));
      }
    });
  }

  leftAssetChanged($event: any): void {
    this.dto.leftAssetId = $event.target.value;
  }

  rightAssetChanged($event: any): void {
    this.dto.rightAssetId = $event.target.value;
  }

  doLock(): void {
    this.service.LockTransaction(this.dto).then(x => {
      if (x.success) {
        // Переходим на страницу предпросмотра
        this.router.navigate(['/buy-sell/preview', x.content.id]);
        this.snack.ShowSnackbar(new SnackBarCreate("Success", "Price locked, set an amount and confirm...", AlertType.Success));
      } else {
        if (x.error.status == 400) {
          this.snack.ShowSnackbar(new SnackBarCreate("Insufficient funds", "Not enough funds.", AlertType.Error));
        } else {
          this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not convert assets.", AlertType.Error));
        }
      }
    });
  }
}
