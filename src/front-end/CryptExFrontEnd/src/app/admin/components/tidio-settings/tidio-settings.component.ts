import { Component, OnInit } from '@angular/core';
import { TidioChatService } from '../../../services/tidio-chat.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';

@Component({
  selector: 'app-tidio-settings',
  templateUrl: './tidio-settings.component.html',
  styleUrls: ['./tidio-settings.component.scss']
})
export class TidioSettingsComponent implements OnInit {
  tidioChatKey: string = '';
  isSaving: boolean = false;

  constructor(
    private tidioChatService: TidioChatService,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    // Get current Tidio chat key
    this.tidioChatKey = this.tidioChatService.getTidioChatKey();
  }

  saveSettings(): void {
    this.isSaving = true;
    
    // Basic validation
    if (!this.tidioChatKey || this.tidioChatKey.trim().length < 10) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Please enter a valid Tidio chat key (at least 10 characters)", 
        AlertType.Error
      ));
      this.isSaving = false;
      return;
    }
    
    // Save the new key and update the script
    const success = this.tidioChatService.setTidioChatKey(this.tidioChatKey.trim());
    
    if (success) {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Success", 
        "Tidio chat settings saved successfully. Changes will be visible on page refresh.", 
        AlertType.Success
      ));
    } else {
      this.snackbar.ShowSnackbar(new SnackBarCreate(
        "Error", 
        "Failed to update Tidio chat settings", 
        AlertType.Error
      ));
    }
    
    this.isSaving = false;
  }
}