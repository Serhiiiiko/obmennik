import { Component, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CryptoComponent } from './components/crypto/crypto.component';
import { BuySellComponent } from './components/buy-sell/buy-sell.component';
import { TransactionStatusPageComponent } from './components/transaction-status-page/transaction-status-page.component';
import { AuthenticationGuard } from '../guards/authentication.guard';
import { PreviewTransactionComponent } from './components/preview-transaction/preview-transaction.component';
import { TransactionHistoryComponent } from './components/transaction-history/transaction-history.component';
import { ManualDepositComponent } from './components/manual-deposit/manual-deposit.component';
import { UserTransactionsComponent } from '../user/components/user-transactions/user-transactions.component';


const routes: Routes = [
  {
    path: 'crypto/:identifier',
    component: CryptoComponent
  },
  {
    path: 'buy-sell',
    component: BuySellComponent,
    
  },
  {
    path: 'buy-sell/transaction/:id',
    component: TransactionStatusPageComponent,
    
  },
  {
    path: 'buy-sell/preview/:id',
    component: PreviewTransactionComponent,
    
  },
  {
    path: 'buy-sell/history',
    component: UserTransactionsComponent
  },
  {
    path: 'buy-sell/manual-deposit/:id',
    component: ManualDepositComponent,
    
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class CryptoRouting { }