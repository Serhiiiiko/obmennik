import { Component, OnInit } from '@angular/core';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { WalletType, WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { WalletService } from 'src/app/wallet/services/wallet.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
 
  assets: WalletViewModel[];

  constructor(private _walletService: WalletService, private snack: SnackbarService) { }

  ngOnInit(): void {
    this._walletService.GetWalletList().then(x => {
      if (x.success){
        this.assets= x.content.filter(x => x.type == WalletType.Crypto);
      } else {
        this.snack.ShowSnackbar(new SnackBarCreate("Error", "Could not load crypto-currencies data.", AlertType.Error));
      }
    });
  }
}
