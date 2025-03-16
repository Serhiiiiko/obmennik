import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminGuard } from '../guards/admin.guard';
import { AuthenticationGuard } from '../guards/authentication.guard';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ApprovedTransactionsComponent } from './components/approved-transactions/approved-transactions.component';
import { DepositsComponent } from './components/deposits/deposits.component';
import { HomeComponent } from './components/home/home.component';
import { PendingBankAccountsComponent } from './components/pending-bank-accounts/pending-bank-accounts.component';
import { PendingTransactionsComponent } from './components/pending-transactions/pending-transactions.component';
import { RejectedTransactionsComponent } from './components/rejected-transactions/rejected-transactions.component';
import { SearchUserComponent } from './components/search-user/search-user.component';
import { UserPageComponent } from './components/user-page/user-page.component';
import { WalletAddressesComponent } from './components/wallet-addresses/wallet-addresses.component';

const routes: Routes = [
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [AuthenticationGuard, AdminGuard],
    children: [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: 'search-user',
        component: SearchUserComponent
      },
      {
        path: 'user/:id',
        component: UserPageComponent
      },
      {
        path: 'deposits',
        component: DepositsComponent
      },
      {
        path: 'bank-accounts',
        component: PendingBankAccountsComponent
      },
      {
        path: 'wallet-addresses',
        component: WalletAddressesComponent
      },
      {
        path: 'pending-transactions',
        component: PendingTransactionsComponent
      },
      {
        path: 'approved-transactions',
        component: ApprovedTransactionsComponent
      },
      {
        path: 'rejected-transactions',
        component: RejectedTransactionsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }