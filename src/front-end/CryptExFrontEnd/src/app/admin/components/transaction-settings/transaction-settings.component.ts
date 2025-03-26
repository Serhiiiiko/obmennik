import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertType, SnackBarCreate } from 'src/app/components/snackbar/snack-bar';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-transaction-settings',
  templateUrl: './transaction-settings.component.html',
  styleUrls: ['./transaction-settings.component.scss']
})
export class TransactionSettingsComponent implements OnInit {
  settingsForm: FormGroup;
  loading = false;
  submitted = false;
  currentMinimumAmount: number;
  
  constructor(
    private formBuilder: FormBuilder,
    private adminService: AdminService,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    this.settingsForm = this.formBuilder.group({
      minimumTransactionAmount: [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+(\\.[0-9]{1,2})?$')]]
    });
    
    // Load current setting
    this.loadCurrentSettings();
  }
  
  // Convenience getter for easy access to form fields
  get f() { return this.settingsForm.controls; }
  
  loadCurrentSettings(): void {
    this.loading = true;
    this.adminService.getMinimumTransactionAmount().then(result => {
      this.loading = false;
      if (result.success) {
        this.currentMinimumAmount = result.content;
        this.settingsForm.patchValue({
          minimumTransactionAmount: this.currentMinimumAmount
        });
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Could not load current settings", 
          AlertType.Error
        ));
      }
    });
  }
  
  onSubmit(): void {
    this.submitted = true;
    
    // stop here if form is invalid
    if (this.settingsForm.invalid) {
      return;
    }
    
    this.loading = true;
    const newAmount = parseFloat(this.settingsForm.value.minimumTransactionAmount);
    
    this.adminService.setMinimumTransactionAmount(newAmount).then(result => {
      this.loading = false;
      
      if (result.success) {
        this.currentMinimumAmount = newAmount;
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Success", 
          `Minimum transaction amount updated to $${newAmount}`, 
          AlertType.Success
        ));
      } else {
        this.snackbar.ShowSnackbar(new SnackBarCreate(
          "Error", 
          "Failed to update minimum transaction amount", 
          AlertType.Error
        ));
      }
    });
  }
}