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
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { AssetConvertService } from 'src/app/asset-convert/services/asset-convert.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  // Constants for localStorage keys
  private readonly MINIMUM_TRANSACTION_AMOUNT_KEY = 'cryptex-minimum-transaction-amount';
  private readonly DEFAULT_MINIMUM_AMOUNT = 99; // Default value if not set

  constructor(
    private http: CustomHttpClientService,
    private snackbar: SnackbarService,
    private assetConvertService?: AssetConvertService // Optional injection to avoid circular dependency
  ) { }

  // Get the minimum transaction amount
  public async getMinimumTransactionAmount(): Promise<ApiResult<number>> {
    try {
      // First try to get from localStorage
      const storedValue = localStorage.getItem(this.MINIMUM_TRANSACTION_AMOUNT_KEY);
      let amount = this.DEFAULT_MINIMUM_AMOUNT;
      
      if (storedValue) {
        amount = parseFloat(storedValue);
      }
      
      // Simulate an API response
      return {
        success: true,
        content: amount,
        error: null
      };
    } catch (error) {
      console.error('Error getting minimum transaction amount:', error);
      return {
        success: false,
        content: this.DEFAULT_MINIMUM_AMOUNT,
        error: error.message
        }
      };
    }
  
  
  // Set the minimum transaction amount
  public async setMinimumTransactionAmount(amount: number): Promise<ApiResult<boolean>> {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Store in localStorage
      localStorage.setItem(this.MINIMUM_TRANSACTION_AMOUNT_KEY, amount.toString());
      
      // Broadcast an event to notify other components
      const event = new CustomEvent('minimum-transaction-amount-changed', { 
        detail: { amount } 
      });
      window.dispatchEvent(event);
      
      console.log(`Minimum transaction amount set to $${amount}`);
      
      // Simulate an API response
      return {
        success: true,
        content: true,
        error: null
      };
    } catch (error) {
      console.error('Error setting minimum transaction amount:', error);
      return {
        success: false,
        content: false,
        error:  error.message
        }
      };
    }
  
  

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

  public async GetWallets(): Promise<ApiResult<WalletViewModel[]>> {
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
    return this.http.Post("Admin/setPaymentStatus", null, { 
      params: new HttpParams()
        .set("sessionId", sessionId)
        .set("status", status.toString()) 
    });
  }

  public async GetPendingBankAccounts(): Promise<ApiResult<BankAccountViewModel[]>> {
    return this.http.Get("Admin/pendingBankAccounts");
  }

  public async SetBankAccountStatus(bankAccountId: string, status: BankAccountStatus): Promise<ApiResult> {
    return this.http.Post("Admin/setBankAccountStatus", null, { 
      params: new HttpParams()
        .set("bankAccountId", bankAccountId)
        .set("status", status.toString()) 
    });
  }

  public async SetAccountStatus(id: string, accountStatus: AccountStatus): Promise<ApiResult> {
    return this.http.Post("Admin/setAccountStatus", null, { 
      params: new HttpParams()
        .set("userId", id)
        .set("status", accountStatus.toString()) 
    });
  }

  // Method to get pending anonymous exchanges
  public async GetPendingAnonymousExchanges(): Promise<ApiResult<any[]>> {
    return this.http.Get("Admin/anonymousExchanges");
  }

  // Improved method to update anonymous exchange status with better error handling and notifications
  public async UpdateAnonymousExchangeStatus(exchangeId: string, status: PaymentStatus, adminNotes?: string): Promise<ApiResult> {
    try {
      console.log(`Updating exchange ${exchangeId} to status ${status}, notes: ${adminNotes || 'none'}`);
      
      // First get the exchange info to have complete data
      const exchangeInfo = await this.http.Get(`PublicExchange/exchange/${exchangeId}`);
      if (!exchangeInfo.success) {
        console.error("Failed to get exchange info:", exchangeInfo.error);
        return exchangeInfo; // Return the error
      }
      
      // Store the current data
      const originalData = exchangeInfo.content;
      
      // Use correct parameter names and formatting
      const result = await this.http.Post(
        "Admin/anonymousExchanges/update", 
        JSON.stringify(adminNotes || ''),
        { 
          params: new HttpParams()
            .set("exchangeId", exchangeId)
            .set("status", status.toString()),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (result.success) {
        // Show success message
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Success", 
          `Transaction status updated to ${this.getStatusText(status)}`, 
          AlertType.Success
        ));
        
        // Create a complete transaction object with the updated status
        const updatedTransaction: { id: string; status: PaymentStatus; adminNotes?: string } = {
          ...(typeof originalData === 'object' && originalData !== null ? originalData : {}),
          id: exchangeId,
          status: status
        };
        
        if (adminNotes) {
          updatedTransaction.adminNotes = adminNotes;
        }
        
        // Use local storage to ensure persistence
        try {
          // Get existing transactions
          const storedData = localStorage.getItem('anonymousTransactions') || '[]';
          const transactions = JSON.parse(storedData);
          
          // Find and update the transaction
          const index = transactions.findIndex(t => t.id === exchangeId);
          if (index !== -1) {
            transactions[index] = {
              ...transactions[index],
              ...updatedTransaction
            };
          } else {
            transactions.push(updatedTransaction);
          }
          
          // Save back to storage
          localStorage.setItem('anonymousTransactions', JSON.stringify(transactions));
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error updating transaction status:", error);
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Failed to update transaction status. Please try again.", 
        AlertType.Error
      ));
      
      return {
        success: false,
        content: undefined,
        error: error.message
      };
    }
  }
  
  private getStatusText(status: PaymentStatus): string {
    switch(status) {
      case PaymentStatus.success: return "Success";
      case PaymentStatus.failed: return "Failed";
      case PaymentStatus.pending: return "Pending";
      case PaymentStatus.notProcessed: return "Not Processed";
      case PaymentStatus.awaitingVerification: return "Awaiting Verification";
      default: return `Unknown (${status})`;
    }
  }

  // For backward compatibility
  public async GetPendingTransactions(): Promise<ApiResult<any[]>> {
    return this.GetPendingAnonymousExchanges();
  }
  
  public async GetApprovedTransactions(): Promise<ApiResult<any[]>> {
    return this.http.Get("Admin/allAnonymousExchanges", { 
      params: new HttpParams().set("status", PaymentStatus.success.toString()) 
    });
  }
  
  public async GetRejectedTransactions(): Promise<ApiResult<any[]>> {
    return this.http.Get("Admin/allAnonymousExchanges", { 
      params: new HttpParams().set("status", PaymentStatus.failed.toString()) 
    });
  }
  
  public async GetAllTransactions(): Promise<ApiResult<any[]>> {
    return this.http.Get("Admin/allAnonymousExchanges");
  }
  
  // Add this to admin.service.ts
  public async GetUserTransactions(): Promise<ApiResult<any[]>> {
    // This fetches all transactions but we'll filter by the current user on the client-side
    return this.http.Get("Admin/allAnonymousExchanges");
  }
  
  // For backward compatibility
  public async SetTransactionStatus(transactionId: string, status: PaymentStatus): Promise<ApiResult> {
    return this.UpdateAnonymousExchangeStatus(transactionId, status);
  }
}