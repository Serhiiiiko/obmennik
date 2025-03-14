// src/front-end/CryptExFrontEnd/src/app/admin/admin.module.ts
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
    WalletAddressesComponent
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