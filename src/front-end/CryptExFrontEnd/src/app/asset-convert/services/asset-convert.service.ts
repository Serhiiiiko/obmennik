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
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AssetConvertService {
  public transaction: AssetConverssionViewModel;
  private guestTransactions: Map<string, AssetConversionLockViewModel> = new Map();
  private hubConnection: signalR.HubConnection;
  private anonymousExchangeHubConnection: signalR.HubConnection;
  
  // Fallback rates for cryptocurrencies in USD
  private fallbackRates = {
    "XRP": 0.55,
    "ADA": 0.45,
    "ATOM": 9.25,
    "TON": 5.95,
    "USDT": 1.00,
    "USDT-BEP20": 1.00,
    "UST-TRC20": 1.00
  };

  constructor(
    private http: CustomHttpClientService, 
    private auth: AuthService, 
    private env: EnvironmentService,
    private snackbar: SnackbarService
  ) {
    this.buildAnonymousExchangeConnection();
  }

  // Построение подключения для анонимных обменов
  private buildAnonymousExchangeConnection(): void {
    const options: signalR.IHttpConnectionOptions = {
      transport: signalR.HttpTransportType.LongPolling,
      accessTokenFactory: () => {
        if (this.auth.IsAuthenticated)
          return this.auth.JWToken;
        else
          return null
      }
    };

    this.anonymousExchangeHubConnection = new signalR.HubConnectionBuilder()
      .withAutomaticReconnect()
      .withUrl(this.env.apiBaseUrl + "feed/anonymousexchange", options)
      .build();

    this.anonymousExchangeHubConnection.on('anonymousexchangedata', (data) => {
      this.handleExchangeStatusUpdate(data);
    });

    this.anonymousExchangeHubConnection.start()
      .catch(err => console.error('Error starting Anonymous Exchange SignalR connection:', err));
  }

  // Обработка обновления статуса обмена
  private handleExchangeStatusUpdate(data: any): void {
    const statusMap = {
      '-1': 'Not Processed',
      '0': 'Failed',
      '1': 'Success',
      '2': 'Pending',
      '3': 'Awaiting Verification'
    };

    this.snackbar.ShowSnackbar(new SnackBarCreate(
      "Exchange Status Update", 
      `Your exchange ${data.exchangeId} status is now: ${statusMap[data.status]}`, 
      data.status === 1 ? AlertType.Success : 
      data.status === 0 ? AlertType.Error : 
      AlertType.Info
    ));
  }

  // Существующие методы остаются без изменений
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
        let exchangeRate: number;
        try {
          const rateResponse = await this.http.Get<number>("PublicExchange/exchangeRate", {
            params: new HttpParams()
              .set("sourceWalletId", dto.leftAssetId)
              .set("destinationWalletId", dto.rightAssetId)
          });
          
          if (rateResponse.success && typeof rateResponse.content === 'number' && rateResponse.content > 0) {
            exchangeRate = rateResponse.content;
          } else {
            throw new Error("Invalid exchange rate returned");
          }
        } catch (error) {
          console.warn("API exchange rate fetch failed, using fallback rate", error);
          
          // Use fallback rates if API call fails
          if (rightWallet.ticker === "USD") {
            exchangeRate = this.fallbackRates[leftWallet.ticker] || 1.0;
          } else if (leftWallet.ticker === "USD") {
            exchangeRate = 1.0 / (this.fallbackRates[rightWallet.ticker] || 1.0);
          } else if (this.fallbackRates[leftWallet.ticker] && this.fallbackRates[rightWallet.ticker]) {
            // Cross-currency conversion using USD as intermediary
            exchangeRate = this.fallbackRates[leftWallet.ticker] / this.fallbackRates[rightWallet.ticker];
          } else {
            exchangeRate = 1.0; // Default fallback if no rates available
            console.error("No fallback rate available for", leftWallet.ticker, rightWallet.ticker);
          }
        }
        
        // Create a mock lock for guest users
        const mockLock: AssetConversionLockViewModel = {
          id: this.generateUUID(),
          expirationUtc: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
          pair: {
            left: leftWallet,
            right: rightWallet,
            rate: exchangeRate
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
  // Add this method to your asset-convert.service.ts
  public async GetAnonymousExchanges(): Promise<ApiResult<any[]>> {
    return this.http.Get("Admin/anonymousExchanges");
  }
  public async GetExchangeInfo(id: string): Promise<ApiResult<any>> {
    return this.http.Get(`PublicExchange/exchange/${id}`);
  }
}