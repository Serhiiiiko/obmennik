import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualDepositComponent } from './manual-deposit.component';

describe('ManualDepositComponent', () => {
  let component: ManualDepositComponent;
  let fixture: ComponentFixture<ManualDepositComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManualDepositComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManualDepositComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
