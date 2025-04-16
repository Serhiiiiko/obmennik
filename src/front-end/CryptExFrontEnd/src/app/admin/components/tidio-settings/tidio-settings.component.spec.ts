import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TidioSettingsComponent } from './tidio-settings.component';

describe('TidioSettingsComponent', () => {
  let component: TidioSettingsComponent;
  let fixture: ComponentFixture<TidioSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TidioSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TidioSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
