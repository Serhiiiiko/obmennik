import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CustomHttpClientService } from 'src/app/api/custom-http-client/custom-http-client.service';
import { ApiResult } from 'src/app/api/models/api-result';
import { BankAccountStatus, BankAccountViewModel } from 'src/app/deposit-withdraw/models/bank-account-view-model';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';
import { UserViewModel } from 'src/app/user/models/user-view-model';
import { FullDepositViewModel } from '../models/full-deposit-view-model';
import { AccountStatus, FullUserViewModel } from '../models/full-user-view-model';
import { StatsViewModel } from '../models/stats-view-model';
import { WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { AssetConverssionViewModel } from 'src/app/asset-convert/models/asset-converssion-view-model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(private http: CustomHttpClientService) { }

  public async SetWalletAddress(walletId: string, address: string): Promise<ApiResult> {
    return this.http.Post("Admin/setWalletAddress", null, { 
      params: new HttpParams()
        .set("walletId", walletId)
        .set("address", address) 
    });
  }
  
  public async GetCryptoWallets(): Promise<ApiResult<WalletViewModel[]>> {
    return this.http.Get("Wallets/list");
  }
  
  public async GetFullUser(id: string): Promise<ApiResult<FullUserViewModel>> {
    return this.http.Get("Admin/user", { params: new HttpParams().set("userId", id) });
  }

  public async SearchUser(query: string): Promise<ApiResult<UserViewModel[]>> {
    return this.http.Get("Admin/searchUser", { params: new HttpParams().set("query", query) });
  }

  public async GetStats(): Promise<ApiResult<StatsViewModel>> {
    return this.http.Get("Admin/stats");
  }

  public async GetDeposits(): Promise<ApiResult<FullDepositViewModel[]>> {
    return this.http.Get("Admin/deposits");
  }

  public async SetPaymentStatus(sessionId: string, status: PaymentStatus): Promise<ApiResult> {
    return this.http.Post("Admin/setPaymentStatus", null, { params: new HttpParams().set("sessionId", sessionId).set("status", status.toString()) });
  }

  public async GetPendingBankAccounts(): Promise<ApiResult<BankAccountViewModel[]>> {
    return this.http.Get("Admin/pendingBankAccounts");
  }

  public async SetBankAccountStatus(bankAccountId: string, status: BankAccountStatus): Promise<ApiResult> {
    return this.http.Post("Admin/setBankAccountStatus", null, { params: new HttpParams().set("bankAccountId", bankAccountId).set("status", status.toString()) });
  }

  public async SetAccountStatus(id: string, accountStatus: AccountStatus): Promise<ApiResult> {
    return this.http.Post("Admin/setAccountStatus", null, { params: new HttpParams().set("userId", id).set("status", accountStatus.toString()) });
  }

  // New methods for pending transactions
  public async GetPendingTransactions(): Promise<ApiResult<AssetConverssionViewModel[]>> {
    return this.http.Get("Admin/pendingTransactions");
  }

  public async SetTransactionStatus(transactionId: string, status: PaymentStatus): Promise<ApiResult> {
    return this.http.Post("Admin/setTransactionStatus", null, { 
      params: new HttpParams()
        .set("transactionId", transactionId)
        .set("status", status.toString()) 
    });
  }
}