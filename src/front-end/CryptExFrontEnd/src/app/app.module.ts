import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CryptoModule } from './asset-convert/asset-convert.module';
import { AuthModule } from './auth/auth.module';
import { MainModule } from './main/main.module';
import { UserModule } from './user/user.module';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RequestInterceptor } from './interceptor/request.interceptor';
import { SnackbarComponent } from './components/snackbar/snackbar.component';
import { CurrencyInterceptor } from './interceptor/currency.interceptor';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AdminModule } from './admin/admin.module';
import { PremiumModule } from './premium/premium.module';
import { HomeExchangeComponent } from './main/components/home/home-exchange/home-exchange.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    SnackbarComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    CryptoModule,
    AuthModule,
    MainModule,
    UserModule,
    AdminModule,
    PremiumModule,
    AppRoutingModule, //This must be the last module loaded, otherwise other routes will be ignored.
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
      defaultLanguage: 'ru-ru'
    })
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CurrencyInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }