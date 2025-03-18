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
import { BehaviorSubject, Observable } from 'rxjs';
import { PaymentStatus } from 'src/app/deposit-withdraw/models/deposit-view-model';

@Injectable({
  providedIn: 'root'
})
export class AssetConvertService {
  public transaction: AssetConverssionViewModel;
  private guestTransactions: Map<string, AssetConversionLockViewModel> = new Map();
  private hubConnection: signalR.HubConnection;
  private anonymousExchangeHubConnection: signalR.HubConnection;
  
  // Subject to broadcast transaction updates
  private transactionUpdatedSubject = new BehaviorSubject<any>(null);
  public transactionUpdated$ = this.transactionUpdatedSubject.asObservable();
  
  // Connection status tracking
  private connectionStatusSubject = new BehaviorSubject<string>('Disconnected');
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  
  // Fallback rates for cryptocurrencies in USD
  private fallbackRates = {
    "BTC": 61250.00,
    "ETH": 3350.00,
    "LTC": 85.50,
    "XRP": 0.55,
    "ADA": 0.45,
    "ATOM": 9.25,
    "ZEC": 28.75,
    "BNB": 580.00,
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
    
    // Listen for auth status changes to rebuild connection if needed
    
  }

  // Force rebuild the connection (used when auth status changes)
  private rebuildConnection(): void {
    try {
      if (this.anonymousExchangeHubConnection) {
        this.anonymousExchangeHubConnection.stop().then(() => {
          console.log('Stopped connection after auth change');
          this.buildAnonymousExchangeConnection();
        });
      } else {
        this.buildAnonymousExchangeConnection();
      }
    } catch (error) {
      console.error('Error rebuilding connection:', error);
    }
  }

  // Improved connection start with retry logic
  private async startAnonymousExchangeConnection(retryAttempt = 0): Promise<void> {
    try {
      console.log('Starting Anonymous Exchange SignalR connection...');
      await this.anonymousExchangeHubConnection.start();
      console.log('SignalR connected for anonymous exchanges');
      
      this.connectionStatusSubject.next('Connected');
      
      // Only show a notification when reconnecting, not on initial connect
      if (retryAttempt > 0) {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Connection Status", 
          "Real-time transaction updates reconnected", 
          AlertType.Success
        ));
      }
    } catch (err) {
      console.error('Error starting Anonymous Exchange SignalR connection:', err);
      this.connectionStatusSubject.next('Error');
      
      // Retry with exponential backoff up to 5 times
      if (retryAttempt < 5) {
        const delayMs = Math.min(1000 * Math.pow(2, retryAttempt), 30000);
        console.log(`Retrying in ${delayMs}ms...`);
        setTimeout(() => this.startAnonymousExchangeConnection(retryAttempt + 1), delayMs);
      } else {
        // After 5 retries, show a notification to the user
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Connection Error", 
          "Could not connect to real-time updates. Status changes may be delayed.", 
          AlertType.Warning
        ));
      }
    }
  }

  // Enhanced buildAnonymousExchangeConnection method with reconnection handling
  private buildAnonymousExchangeConnection(): void {
    console.log('Building anonymous exchange connection...');
    
    // First stop any existing connection
    if (this.anonymousExchangeHubConnection) {
      try {
        this.anonymousExchangeHubConnection.stop();
      } catch (error) {
        console.error('Error stopping existing connection:', error);
      }
    }
    
    const options: signalR.IHttpConnectionOptions = {
      transport: signalR.HttpTransportType.LongPolling,
      accessTokenFactory: () => {
        if (this.auth.IsAuthenticated)
          return this.auth.JWToken;
        else
          return null;
      }
    };

    this.anonymousExchangeHubConnection = new signalR.HubConnectionBuilder()
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000]) // More aggressive reconnect strategy
      .configureLogging(signalR.LogLevel.Information) // More detailed logging
      .withUrl(this.env.apiBaseUrl + "feed/anonymousexchange", options)
      .build();

    // Reset connection status
    this.connectionStatusSubject.next('Connecting');

    // Listen for the specific message from the server
    this.anonymousExchangeHubConnection.on('anonymousexchangedata', (data) => {
      console.log('RAW SignalR Message Received:', data);
      this.handleExchangeStatusUpdate(data);
    });

    // Handle reconnection events
    this.anonymousExchangeHubConnection.onreconnecting(error => {
      console.log('SignalR connection lost. Attempting to reconnect...', error);
      this.connectionStatusSubject.next('Reconnecting');
    });
    
    this.anonymousExchangeHubConnection.onreconnected(connectionId => {
      console.log('SignalR reconnected with ID:', connectionId);
      this.connectionStatusSubject.next('Connected');
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Connection Restored", 
        "Real-time transaction updates reconnected", 
        AlertType.Success
      ));
    });

    this.anonymousExchangeHubConnection.onclose(error => {
      console.log('SignalR connection closed', error);
      this.connectionStatusSubject.next('Disconnected');
      // Try to restart the connection if it closes
      setTimeout(() => this.startAnonymousExchangeConnection(), 5000);
    });

    // Start the connection with retry logic
    this.startAnonymousExchangeConnection();
  }

  // Completely rewritten handleExchangeStatusUpdate method to handle various data formats
  private handleExchangeStatusUpdate(data: any): void {
    console.log('Received exchange status update:', data);
    
    // Different SignalR implementations might send data in different formats
    // Let's handle different possible formats
    
    let transactionId: string;
    let status: number;
    let adminNotes: string;
    let transactionHash: string;
    
    // Try to extract data based on different possible formats
    if (data) {
      // Format 1: Standard object with id and status
      if (data.id) {
        transactionId = data.id;
        status = data.status;
        adminNotes = data.adminNotes;
        transactionHash = data.transactionHash;
      } 
      // Format 2: Object with exchangeId instead of id
      else if (data.exchangeId) {
        transactionId = data.exchangeId;
        status = data.status;
        adminNotes = data.adminNotes;
        transactionHash = data.transactionHash;
      }
      // Format 3: Object with field containing transaction object
      else if (data.transaction && data.transaction.id) {
        transactionId = data.transaction.id;
        status = data.transaction.status;
        adminNotes = data.transaction.adminNotes;
        transactionHash = data.transaction.transactionHash;
      }
    }
    
    // If we successfully extracted an ID, process the update
    if (transactionId) {
      console.log(`Processing update for transaction ${transactionId} with status ${status}`);
      
      // Create an update object with all the data we have
      const updateData = {
        id: transactionId,
        status: status
      };
      
      // Add optional fields if present
      if (adminNotes) updateData['adminNotes'] = adminNotes;
      if (transactionHash) updateData['transactionHash'] = transactionHash;
      
      // Create a complete transaction by merging with existing data
      const completeTransaction = this.createCompleteTransaction(updateData);
      
      // Log the complete transaction for debugging
      console.log('Complete transaction object created:', completeTransaction);
      
      // Update in localStorage
      this.updateLocalStorageTransaction(completeTransaction);
      
      // Broadcast to all subscribers
      this.transactionUpdatedSubject.next(completeTransaction);
      
      // Show notification
      const statusMap = {
        '-1': 'Not Processed',
        '0': 'Failed',
        '1': 'Success',
        '2': 'Pending',
        '3': 'Awaiting Verification'
      };
      
      if (status !== undefined) {
        const statusText = statusMap[status] || `Status ${status}`;
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Exchange Status Update", 
          `Transaction ${transactionId.substring(0, 8)}... status: ${statusText}`, 
          status === 1 ? AlertType.Success : 
          status === 0 ? AlertType.Error : 
          AlertType.Info
        ));
      }
    } else {
      console.warn('Received SignalR message but could not extract transaction data:', data);
    }
  }

  // New helper method to create a complete transaction object
  private createCompleteTransaction(updateData: any): any {
    // First try to find existing transaction in localStorage
    try {
      const storedTransactionsJson = localStorage.getItem('anonymousTransactions');
      if (storedTransactionsJson) {
        const storedTransactions = JSON.parse(storedTransactionsJson);
        const existingTransaction = storedTransactions.find(t => t.id === updateData.id);
        
        if (existingTransaction) {
          // Merge existing data with update data
          return {
            ...existingTransaction,
            ...updateData
          };
        }
      }
    } catch (error) {
      console.error('Error retrieving transaction from localStorage:', error);
    }
    
    // If no existing transaction found, just return the update data
    return updateData;
  }
  
  // Update transaction in localStorage if it exists
  private updateLocalStorageTransaction(updatedTransaction: any): void {
    if (!updatedTransaction || !updatedTransaction.id) return;
    
    try {
      const storedTransactionsJson = localStorage.getItem('anonymousTransactions');
      let storedTransactions = [];
      
      if (storedTransactionsJson) {
        storedTransactions = JSON.parse(storedTransactionsJson);
        const index = storedTransactions.findIndex(t => t.id === updatedTransaction.id);
        
        if (index !== -1) {
          // Update existing transaction, preserving fields that aren't in the update
          storedTransactions[index] = {
            ...storedTransactions[index],
            ...updatedTransaction
          };
        } else {
          // Add new transaction
          storedTransactions.push(updatedTransaction);
        }
      } else {
        // No existing transactions, create new array
        storedTransactions = [updatedTransaction];
      }
      
      // Save back to localStorage
      localStorage.setItem('anonymousTransactions', JSON.stringify(storedTransactions));
      console.log('Updated transaction in localStorage:', updatedTransaction.id);
    } catch (error) {
      console.error('Error updating localStorage transaction:', error);
    }
  }

  // Get connection status
  public getConnectionStatus(): string {
    return this.connectionStatusSubject.getValue();
  }

  // Existing methods remain unchanged
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
      
      // Also broadcast this update
      this.transactionUpdatedSubject.next(data);
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
    const result = await this.http.Post("PublicExchange/confirmTransaction", dto);
    
    if (result.success) {
      // Create a complete transaction update
      const transactionUpdate = {
        id: dto.exchangeId,
        status: PaymentStatus.pending,
        transactionHash: dto.transactionHash,
        senderWalletAddress: dto.senderWalletAddress
      };
      
      // Use our improved methods to update storage and broadcast
      const completeTransaction = this.createCompleteTransaction(transactionUpdate);
      this.updateLocalStorageTransaction(completeTransaction);
      this.transactionUpdatedSubject.next(completeTransaction);
    }
    
    return result;
  }
  
  public async GetAnonymousExchanges(): Promise<ApiResult<any[]>> {
    return this.http.Get("Admin/anonymousExchanges");
  }
  
  public async GetExchangeInfo(id: string): Promise<ApiResult<any>> {
    return this.http.Get(`PublicExchange/exchange/${id}`);
  }
  
  // Force refresh all transactions from server
  public forceRefreshTransactions(): Promise<ApiResult<any[]>> {
    // For anonymous users, get all exchanges that might be related to them
    return this.http.Get("Admin/allAnonymousExchanges");
  }
  
  // Clear transaction cache
  public clearTransactionCache(): void {
    try {
      localStorage.removeItem('anonymousTransactions');
      console.log('Transaction cache cleared');
    } catch (error) {
      console.error('Error clearing transaction cache:', error);
    }
  }
}