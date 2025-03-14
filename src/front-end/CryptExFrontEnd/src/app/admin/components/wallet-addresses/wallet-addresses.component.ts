// src/front-end/CryptExFrontEnd/src/app/admin/components/wallet-addresses/wallet-addresses.component.ts
import { Component, OnInit } from '@angular/core';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { WalletType, WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-wallet-addresses',
  templateUrl: './wallet-addresses.component.html',
  styleUrls: ['./wallet-addresses.component.scss']
})
export class WalletAddressesComponent implements OnInit {
  cryptoWallets: WalletViewModel[] = [];
  loading = true;
  walletAddresses: { [key: string]: string } = {};
  savingWallets: { [key: string]: boolean } = {};

  constructor(
    private adminService: AdminService, 
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    this.loadWallets();
  }

  async loadWallets() {
    try {
      const result = await this.adminService.GetCryptoWallets();
      if (result.success) {
        // Filter to get only crypto wallets
        this.cryptoWallets = result.content.filter(wallet => wallet.type === WalletType.Crypto);
        
        // Initialize form values
        this.cryptoWallets.forEach(wallet => {
          // Initialize with empty string or the current address if it exists
          this.walletAddresses[wallet.id] = '';
          this.savingWallets[wallet.id] = false;
        });
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Failed to load cryptocurrency wallets", 
          AlertType.Error
        ));
      }
    } catch (error) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "An unexpected error occurred while loading wallets", 
        AlertType.Error
      ));
    } finally {
      this.loading = false;
    }
  }

  async saveWalletAddress(walletId: string) {
    const address = this.walletAddresses[walletId];
    
    if (!address || address.trim() === '') {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Validation Error", 
        "Wallet address cannot be empty", 
        AlertType.Warning
      ));
      return;
    }

    this.savingWallets[walletId] = true;
    
    try {
      const result = await this.adminService.SetWalletAddress(walletId, address);
      
      if (result.success) {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Success", 
          `Wallet address for ${this.getWalletName(walletId)} has been updated`, 
          AlertType.Success
        ));
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Failed to update wallet address", 
          AlertType.Error
        ));
      }
    } catch (error) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "An unexpected error occurred", 
        AlertType.Error
      ));
    } finally {
      this.savingWallets[walletId] = false;
    }
  }

  getWalletName(walletId: string): string {
    const wallet = this.cryptoWallets.find(w => w.id === walletId);
    return wallet ? wallet.fullName : 'Unknown Wallet';
  }
}