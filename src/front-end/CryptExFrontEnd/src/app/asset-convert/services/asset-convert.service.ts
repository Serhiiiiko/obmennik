import { Injectable } from '@angular/core';
import { CustomHttpClientService } from 'src/app/api/custom-http-client/custom-http-client.service';
import { ApiResult } from 'src/app/api/models/api-result';
import { AssetConverssionDto } from '../models/asset-converssion-dto';
import * as signalR from "@microsoft/signalr";
import { AssetConverssionViewModel } from '../models/asset-converssion-view-model';
import { AuthService } from 'src/app/auth/services/auth.service';
import { EnvironmentService } from 'src/environments/service/environment.service';
import { HttpParams } from '@angular/common/http';
import { AssetConversionLockDto } from '../models/asset-conversion-lock-dto';
import { AssetConversionLockViewModel } from '../models/asset-conversion-lock-view-model';
import { ManualDepositNotificationDto } from '../models/manual-deposit-notification-dto';
import { AnonymousExchangeConfirmationDto, AnonymousExchangeRequestDto } from '../models/anonymous-exchange-request-dto';
import { WalletViewModel } from '../../wallet/models/wallet-view-model';

@Injectable({
  providedIn: 'root'
})
export class AssetConvertService {
  public transaction: AssetConverssionViewModel;
  private guestTransactions: Map<string, AssetConversionLockViewModel> = new Map();
  private hubConnection: signalR.HubConnection;

  constructor(private http: CustomHttpClientService, private auth: AuthService, private env: EnvironmentService) { }

  public async BeginSignalR(id: string): Promise<void> {
    const transaction = await this.GetTransaction(id);
    if (transaction.success)
      this.transaction = transaction.content;
    
    this.buildConnection();
    await this.hubConnection.start();
    this.listen();
  }

  private buildConnection(): void {
    const options: signalR.IHttpConnectionOptions = {
      transport: signalR.HttpTransportType.LongPolling,
      accessTokenFactory: () => {
        if (this.auth.IsAuthenticated)
          return this.auth.JWToken;
        else
          return null
      }
    };

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withAutomaticReconnect()
      .withUrl(this.env.apiBaseUrl + "feed/assetconversion", options)
      .build();
  }

  private listen(): void {
    this.hubConnection?.on('assetconversiondata', (data) => {
      console.log("data received", data);
      this.transaction = data as AssetConverssionViewModel;
    })
  }

  public async GetTransactionLock(id: string): Promise<ApiResult<AssetConversionLockViewModel>> {
    // Check if we have a stored guest transaction
    if (this.guestTransactions.has(id)) {
      return {
        success: true,
        content: this.guestTransactions.get(id)
      } as ApiResult<AssetConversionLockViewModel>;
    }
    return this.http.Get("AssetConvert/lock", { params: new HttpParams().set("id", id) });
  }
  
  public async LockTransaction(dto: AssetConversionLockDto): Promise<ApiResult<AssetConversionLockViewModel>> {
    try {
      if (this.auth.IsAuthenticated) {
        // For authenticated users, use the normal API
        return this.http.Post("AssetConvert/lock", dto);
      } else {
        // For unauthenticated users, get source and destination wallet info from localStorage
        let leftWallet: WalletViewModel;
        let rightWallet: WalletViewModel;
        
        // Try to get wallets from localStorage first
        const sourceAssetJson = localStorage.getItem('sourceAsset');
        const destAssetJson = localStorage.getItem('destinationAsset');
        
        if (sourceAssetJson && destAssetJson) {
          leftWallet = JSON.parse(sourceAssetJson);
          rightWallet = JSON.parse(destAssetJson);
        } else {
          // If not in localStorage, fetch from API
          const sourceWalletResponse = await this.http.Get<WalletViewModel>(`Wallets/wallet/${dto.leftAssetId}`);
          const destWalletResponse = await this.http.Get<WalletViewModel>(`Wallets/wallet/${dto.rightAssetId}`);
          
          if (!sourceWalletResponse.success || !destWalletResponse.success) {
            throw new Error("Could not get wallet information");
          }
          
          leftWallet = sourceWalletResponse.content;
          rightWallet = destWalletResponse.content;
          
          // Store for future use
          localStorage.setItem('sourceAsset', JSON.stringify(leftWallet));
          localStorage.setItem('destinationAsset', JSON.stringify(rightWallet));
        }
        
        // Get exchange rate
        const rateResponse = await this.http.Get<number>("PublicExchange/exchangeRate", {
          params: new HttpParams()
            .set("sourceWalletId", dto.leftAssetId)
            .set("destinationWalletId", dto.rightAssetId)
        });
        
        if (!rateResponse.success || typeof rateResponse.content !== 'number') {
          throw new Error("Could not get exchange rate");
        }
        
        // Create a mock lock for guest users
        const mockLock: AssetConversionLockViewModel = {
          id: this.generateUUID(),
          expirationUtc: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
          pair: {
            left: leftWallet,
            right: rightWallet,
            rate: rateResponse.content
          }
        };
        
        // Store it for later reference
        this.guestTransactions.set(mockLock.id, mockLock);
        
        return {
          success: true,
          content: mockLock
        } as ApiResult<AssetConversionLockViewModel>;
      }
    } catch (error) {
      console.error("Error locking transaction:", error);
      return {
        success: false,
        error: {
          status: 500,
          statusText: "Internal Server Error",
          error: error.message
        }
      } as ApiResult<AssetConversionLockViewModel>;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public async RemoveTransactionLock(id: string): Promise<ApiResult> {
    // Check if this is a guest transaction
    if (this.guestTransactions.has(id)) {
      this.guestTransactions.delete(id);
      return { success: true } as ApiResult;
    }
    
    return this.http.Delete("AssetConvert/lock", { params: new HttpParams().set("id", id) });
  }

  public async Convert(dto: AssetConverssionDto): Promise<ApiResult<string>> {
    return this.http.Post("AssetConvert/convert", dto);
  }

  public async GetTransaction(id: string): Promise<ApiResult<AssetConverssionViewModel>> {
    return this.http.Get("AssetConvert/transaction", { params: new HttpParams().set("id", id) });
  }

  public async GetTransactions(id: string): Promise<ApiResult<AssetConverssionViewModel[]>> {
    return this.http.Get("AssetConvert/transactions", { params: new HttpParams().set("id", id) });
  }
  
  public async NotifyManualDeposit(dto: ManualDepositNotificationDto): Promise<ApiResult> {
    console.log("Sending to API:", dto);
    return this.http.Post("Payment/crypto/notify", dto);
  }

  // Methods for anonymous exchanges - these endpoints don't require authentication
  public async CreateAnonymousExchange(dto: AnonymousExchangeRequestDto): Promise<ApiResult<any>> {
    return this.http.Post("PublicExchange/createExchange", dto);
  }

  public async ConfirmAnonymousTransaction(dto: AnonymousExchangeConfirmationDto): Promise<ApiResult> {
    return this.http.Post("PublicExchange/confirmTransaction", dto);
  }

  public async GetExchangeInfo(id: string): Promise<ApiResult<any>> {
    return this.http.Get(`PublicExchange/exchange/${id}`);
  }
}