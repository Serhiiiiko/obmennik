import { Component, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {ContactComponent} from './components/contact/contact.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ForbiddenComponent } from './components/forbidden/forbidden.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { HomeExchangeComponent } from './components/home/home-exchange/home-exchange.component';
import { TestimonialCarouselComponent } from './components/home/testimonial-carousel/testimonial-carousel.component';
import { BuySellComponent } from '../asset-convert/components/buy-sell/buy-sell.component';
import { AmlPolicyComponent } from './components/aml-policy/aml-policy.component';

const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'buySell',
    component: BuySellComponent
  },
  {
    path: 'contact',
    component: ContactComponent
  },
  {
    path: 'notfound',
    component: NotFoundComponent
  },
  {
    path: "unauthorized",
    component: UnauthorizedComponent
  },
  {
    path: 'forbidden',
    component: ForbiddenComponent
  },
  {
    path: 'home-exchange',
    component: HomeExchangeComponent
  },
  {
    path: 'testimonial-carousel',
    component: TestimonialCarouselComponent
  },
  {
    path: 'aml-policy',
    component: AmlPolicyComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class MainRouting { }
