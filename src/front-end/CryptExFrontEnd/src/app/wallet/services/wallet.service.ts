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
  
  public async GetWalletInfo(id: string): Promise<ApiResult<WalletViewModel>> {
    console.log("Getting wallet info for ID:", id);
    if (!id) {
      console.error("Invalid wallet ID provided");
      return {
        success: false,
        error: new HttpErrorResponse({ error: "Invalid wallet ID", status: 400, statusText: 'Bad Request' }),
        content: null
      };
    }
    return this.http.Get(`Wallets/wallet/${id}`);
  }
  
  public async GetWalletByTicker(ticker: string): Promise<ApiResult<WalletViewModel>> {
    console.log("Getting wallet by ticker:", ticker);
    if (!ticker) {
      console.error("Invalid ticker provided");
      return {
        success: false,
        error: new HttpErrorResponse({ error: "Invalid ticker", status: 400, statusText: 'Bad Request' }),
        content: null
      };
    }
    
    // Get all wallets and find by ticker
    const walletsResponse = await this.GetWalletList();
    if (walletsResponse.success) {
      const wallet = walletsResponse.content.find(w => w.ticker === ticker);
      if (wallet) {
        return {
          success: true,
          content: wallet,
          error: null // Add the error propert
        };
      } else {
        console.error(`Wallet with ticker ${ticker} not found`);
        return {
          success: false,
          error: new HttpErrorResponse({ error: `Wallet with ticker ${ticker} not found`, status: 404, statusText: 'Not Found' }),
          content: null
        };
      }
    }
    return {
      success: false,
      error: walletsResponse.error,
      content: null
    };
  }
}