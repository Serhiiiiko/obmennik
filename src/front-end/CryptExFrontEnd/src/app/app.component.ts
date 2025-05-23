import { Component } from '@angular/core';
import { UserService } from './user/services/user.service';
import { TranslateService } from '@ngx-translate/core'
import { TidioChatService } from './services/tidio-chat.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'CryptEx';

  constructor(private userService: UserService, private translateService: TranslateService, private tidioChatService: TidioChatService) { }

  ngOnInit(): void {
    if (!this.userService.IsLangSet) {
      const browserLang = this.translateService.getBrowserLang();

      const langIndex = this.userService.languages.findIndex((x) => { x.Id == browserLang});

      if (langIndex != -1) {
        const lang = this.userService.languages[langIndex];

        this.userService.UpdateLanguage(lang.Id);
      }
    } else {
      this.translateService.use(this.userService.SelectedLang);
    }
    this.tidioChatService.initialize();
  }

  isDarkMode(): boolean {
    return localStorage.getItem("dark") == "true";
  }
}
