import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CustomHttpClientService } from 'src/app/api/custom-http-client/custom-http-client.service';
import { ApiResult } from 'src/app/api/models/api-result';
import { UserWalletViewModel } from '../models/user-wallet-view-model';
import { WalletViewModel } from '../models/wallet-view-model';
import { TotalsViewModel } from '../models/totals-view-model';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  constructor(private http: CustomHttpClientService) { }

  public async GetWalletList(): Promise<ApiResult<WalletViewModel[]>> {
    return this.http.Get<WalletViewModel[]>("Wallets/list");
  }

  public async GetUserWallets(): Promise<ApiResult<UserWalletViewModel[]>> {
    return this.http.Get<UserWalletViewModel[]>("Wallets");
  }

  public async GetTotals(): Promise<ApiResult<TotalsViewModel>> {
    return this.http.Get<TotalsViewModel>("Wallets/totals");
  }
  
  public async GetWalletInfo(walletId: string): Promise<ApiResult<WalletViewModel>> {
    return this.http.Get<WalletViewModel>(`Wallets/wallet/${walletId}`);
  }
  // Add this method to your WalletService class:

  public async GetWalletByTicker(ticker: string): Promise<ApiResult<WalletViewModel>> {
    const walletsResponse = await this.GetWalletList();
    
    if (walletsResponse.success) {
      const wallet = walletsResponse.content.find(w => w.ticker === ticker);
      if (wallet) {
        return {
          success: true,
          content: wallet,
          error: null
        };
      }
    }
    
    return {
      success: false,
      content: null,
      error: new HttpErrorResponse({ error: `Wallet with ticker ${ticker} not found` })
    };
  }
}