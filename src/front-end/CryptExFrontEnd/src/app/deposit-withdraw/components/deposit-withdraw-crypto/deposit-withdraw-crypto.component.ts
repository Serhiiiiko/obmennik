import { Component, OnInit } from '@angular/core';
import { NgxQrcodeElementTypes, NgxQrcodeErrorCorrectionLevels } from '@techiediaries/ngx-qrcode';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { UserService } from 'src/app/user/services/user.service';
import { WalletType, WalletViewModel } from 'src/app/wallet/models/wallet-view-model';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CryptoDepositViewModel } from '../../models/crypto-deposit-view-model';
import { DepositWithdrawService } from '../../services/deposit-withdraw.service';
import { CryptoPaymentNotificationDto } from '../../models/crypto-payment-notification-dto';

@Component({
  selector: 'app-deposit-withdraw-crypto',
  templateUrl: './deposit-withdraw-crypto.component.html',
  styleUrls: ['./deposit-withdraw-crypto.component.scss']
})
export class DepositWithdrawCryptoComponent implements OnInit {
  // Current workflow step
  currentStep = 1;
  
  // Cryptocurrency selection
  cryptos: WalletViewModel[];
  selectedCryptoId: string;
  selectedCrypto: WalletViewModel;
  
  // User wallet and transaction details
  receivingWalletAddress: string;
  amountToSend: number;
  transactionHash: string;
  
  // Deposit information
  depositVm: CryptoDepositViewModel;
  
  // QR code settings
  readonly elementType = NgxQrcodeElementTypes.IMG;
  readonly correctionLevel = NgxQrcodeErrorCorrectionLevels.HIGH;

  constructor(
    private depWitService: DepositWithdrawService,
    private walletService: WalletService,
    public userService: UserService,
    private snackBarService: SnackbarService) { }

  ngOnInit(): void {
    this.loadCryptocurrencies();
  }

  // Load available cryptocurrencies
  loadCryptocurrencies(): void {
    this.walletService.GetWalletList().then(x => {
      if (x.success) {
        this.cryptos = x.content.filter(x => x.type == WalletType.Crypto);
        if (this.cryptos.length > 0) {
          this.selectedCryptoId = this.cryptos[0]?.id;
          this.selectedCrypto = this.cryptos[0];
        }
      } else {
        this.snackBarService.ShowSnackbar(new SnackBarCreate("Error", "Could not load cryptocurrency list.", AlertType.Error));
      }
    });
  }

  // Handle crypto selection change
  cryptoChanged($event: any): void {
    this.selectedCryptoId = $event.target.value;
    this.selectedCrypto = this.cryptos.find(c => c.id === this.selectedCryptoId);
  }

  // Navigation methods
  goToNextStep(): void {
    this.currentStep++;
  }

  goToPreviousStep(): void {
    this.currentStep--;
  }

  // Request deposit and get admin wallet address
  requestDeposit(): void {
    this.depWitService.DepositCrypto(this.selectedCryptoId).then(x => {
      if (x.success) {
        this.depositVm = x.content;
        this.currentStep = 3;
        this.snackBarService.ShowSnackbar(new SnackBarCreate("Success", "Deposit address successfully generated.", AlertType.Success));
      } else {
        if (x.error.status == 400)
          this.snackBarService.ShowSnackbar(new SnackBarCreate("Error", "The cryptocurrency you selected is currently unavailable.", AlertType.Error));
        else
          this.snackBarService.ShowSnackbar(new SnackBarCreate("Error", "Could not deposit money.", AlertType.Error));
      }
    });
  }

  // Notify admin that funds have been sent
  notifySentFunds(): void {
    if (!this.depositVm || !this.transactionHash || !this.amountToSend) {
      this.snackBarService.ShowSnackbar(new SnackBarCreate("Error", "Please provide all required information.", AlertType.Error));
      return;
    }

    const notificationDto: CryptoPaymentNotificationDto = {
      depositId: this.depositVm.id,
      senderWalletAddress: this.receivingWalletAddress,
      transactionHash: this.transactionHash,
      amountSent: this.amountToSend
    };

    this.depWitService.NotifyCryptoPayment(notificationDto).then(x => {
      if (x.success) {
        this.currentStep = 4;
        this.snackBarService.ShowSnackbar(new SnackBarCreate("Success", "Payment notification sent successfully. Admin will verify your transaction.", AlertType.Success));
      } else {
        this.snackBarService.ShowSnackbar(new SnackBarCreate("Error", "Failed to notify about your payment. Please try again or contact support.", AlertType.Error));
      }
    });
  }

  // Start new transaction
  startNewTransaction(): void {
    this.currentStep = 1;
    this.receivingWalletAddress = null;
    this.amountToSend = null;
    this.transactionHash = null;
    this.depositVm = null;
  }
}