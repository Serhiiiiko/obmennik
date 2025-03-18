import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MyAccountComponent } from './components/my-account/my-account.component';
import { UserRouting } from './user-routing';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { MainModule } from '../main/main.module';
import { UserTransactionsComponent } from './components/user-transactions/user-transactions.component';



@NgModule({
  declarations: [
    MyAccountComponent,
    UserTransactionsComponent
  ],
  imports: [
    CommonModule,
    UserRouting,
    FormsModule,
    BrowserModule,
    TranslateModule,
    MainModule
  ]
})
export class UserModule { }
