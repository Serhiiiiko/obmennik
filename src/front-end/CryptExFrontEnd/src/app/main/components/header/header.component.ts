import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('dropdownAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class HeaderComponent implements OnInit {
  isOpen = false;
  showMobileMenu = false;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
  }

  IsAuthenticated(): boolean {
    return this.authService.IsAuthenticated;
  }

  IsAdmin(): boolean {
    return this.authService.IsInRole("admin")
  }

  isPremium(): boolean {
    return this.authService.HasClaim("premium");
  }

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.showMobileMenu = false;
    }
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    if (this.showMobileMenu) {
      this.isOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    var el = event.target as HTMLElement;
    
    if (el == null || el.nodeName == "path")
      return;
    
    if (el.parentElement?.className?.includes("dp-btn")) {
      this.showMobileMenu = false;
      return;
    }

    if(this.isOpen && !el.parentElement?.className.includes("user-dropdown")){
      this.showMobileMenu = false;
      this.isOpen = false;
    } else {
      this.showMobileMenu = false;
      this.isOpen = false;
    }
  }
}