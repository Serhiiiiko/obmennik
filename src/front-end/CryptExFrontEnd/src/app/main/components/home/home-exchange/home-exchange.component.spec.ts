import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeExchangeComponent } from './home-exchange.component';

describe('HomeExchangeComponent', () => {
  let component: HomeExchangeComponent;
  let fixture: ComponentFixture<HomeExchangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HomeExchangeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeExchangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
