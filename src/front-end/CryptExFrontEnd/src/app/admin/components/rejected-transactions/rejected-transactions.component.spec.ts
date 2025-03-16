import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectedTransactionsComponent } from './rejected-transactions.component';

describe('RejectedTransactionsComponent', () => {
  let component: RejectedTransactionsComponent;
  let fixture: ComponentFixture<RejectedTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RejectedTransactionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RejectedTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
