import { Component, OnInit } from '@angular/core';
import {AddressViewModel} from "../../models/address-view-model";
import {UserViewModel} from "../../models/user-view-model";
import {IbanViewModel} from "../../models/iban-view-model";
import {Router} from "@angular/router";
import {UserService} from "../../services/user.service";

@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit {
  address: AddressViewModel;
  user: UserViewModel;
  userAdresse: AddressViewModel;
  iban: IbanViewModel;

  clicked: boolean = false;
  clickedPhone: boolean = false;
  clickedEmail: boolean = false;
  clickedAddress: boolean = false;
  clickedCountry: boolean = false;
  clickedIban: boolean = false;

  constructor(private router: Router, private userService: UserService) {
    this.address = {} as AddressViewModel;
    this.user = {} as UserViewModel;
    this.userAdresse = {} as AddressViewModel;
    this.iban = {} as IbanViewModel;
  }

  ngOnInit(): void {
    this.userService.RefreshUser().then(x => {
      this.user = this.userService.User;
    })
  }

  updatePhoneNumber(): void {

  }


}
