import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreelancerSubscriptionComponent } from './freelancer-subscription.component';

describe('FreelancerSubscriptionComponent', () => {
  let component: FreelancerSubscriptionComponent;
  let fixture: ComponentFixture<FreelancerSubscriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FreelancerSubscriptionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreelancerSubscriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
