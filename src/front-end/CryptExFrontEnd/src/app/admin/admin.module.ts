import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { TranslateModule } from '@ngx-translate/core';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { DepositComponent } from './components/deposit/deposit.component';
import { BankAccountComponent } from './components/bank-account/bank-account.component';
import { PendingBankAccountsComponent } from './components/pending-bank-accounts/pending-bank-accounts.component';
import { SearchUserComponent } from './components/search-user/search-user.component';
import { DepositsComponent } from './components/deposits/deposits.component';
import { HomeComponent } from './components/home/home.component';
import { SearchUserResultComponent } from './components/search-user-result/search-user-result.component';
import { UserPageComponent } from './components/user-page/user-page.component';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { MainModule } from '../main/main.module';
import { WalletAddressesComponent } from './components/wallet-addresses/wallet-addresses.component';
import { PendingTransactionsComponent } from './components/pending-transactions/pending-transactions.component';
import { ApprovedTransactionsComponent } from './components/approved-transactions/approved-transactions.component';
import { RejectedTransactionsComponent } from './components/rejected-transactions/rejected-transactions.component';
import { TransactionSettingsComponent } from './components/transaction-settings/transaction-settings.component';
import { TidioSettingsComponent } from './components/tidio-settings/tidio-settings.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    DepositComponent,
    BankAccountComponent,
    PendingBankAccountsComponent,
    SearchUserComponent,
    DepositsComponent,
    HomeComponent,
    SearchUserResultComponent,
    UserPageComponent,
    WalletAddressesComponent,
    PendingTransactionsComponent,
    ApprovedTransactionsComponent,
    RejectedTransactionsComponent,
    TransactionSettingsComponent,
    TidioSettingsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BrowserModule,
    AdminRoutingModule,
    TranslateModule,
    MainModule
  ]
})
export class AdminModule { }