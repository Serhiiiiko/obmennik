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
  wallets: WalletViewModel[] = [];
  cryptoWallets: WalletViewModel[] = [];
  fiatWallets: WalletViewModel[] = [];
  loading = true;
  walletAddresses: { [key: string]: string } = {};
  savingWallets: { [key: string]: boolean } = {};
  errorMessages: { [key: string]: string } = {};
  
  constructor(
    private adminService: AdminService, 
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    this.loadWallets();
  }

  async loadWallets() {
    try {
      const result = await this.adminService.GetWallets();
      if (result.success) {
        // Store all wallets
        this.wallets = result.content;
        
        // Filter wallets by type
        this.cryptoWallets = this.wallets.filter(wallet => wallet.type === WalletType.Crypto);
        this.fiatWallets = this.wallets.filter(wallet => wallet.type === WalletType.Fiat);
        
        // Initialize form values for all wallets
        this.wallets.forEach(wallet => {
          // Initialize with existing address or empty string
          this.walletAddresses[wallet.id] = wallet.adminWalletAddress || '';
          this.savingWallets[wallet.id] = false;
          this.errorMessages[wallet.id] = null;
        });
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Failed to load wallets", 
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
    const wallet = this.wallets.find(w => w.id === walletId);
    
    // Clear previous error message
    this.errorMessages[walletId] = null;
    
    if (!address || address.trim() === '') {
      this.errorMessages[walletId] = "Wallet address cannot be empty";
      return;
    }

    this.savingWallets[walletId] = true;
    
    try {
      const result = await this.adminService.SetWalletAddress(walletId, address);
      
      if (result.success) {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Success", 
          `Wallet address updated successfully`, 
          AlertType.Success
        ));
        
        // Update the wallet address in our local data
        if (wallet) {
          wallet.adminWalletAddress = address;
          wallet.isAddressConfigured = true;
        }
      } else {
        // Show error message on the specific wallet
        this.errorMessages[walletId] = "Failed to update wallet address";
      }
    } catch (error) {
      this.errorMessages[walletId] = "Failed to update wallet address";
    } finally {
      this.savingWallets[walletId] = false;
    }
  }

  getWalletName(walletId: string): string {
    const wallet = this.wallets.find(w => w.id === walletId);
    return wallet ? wallet.fullName : 'Unknown Wallet';
  }
}