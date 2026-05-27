import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreelancerProfilesComponent } from './freelancer-profiles.component';

describe('FreelancerProfilesComponent', () => {
  let component: FreelancerProfilesComponent;
  let fixture: ComponentFixture<FreelancerProfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FreelancerProfilesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreelancerProfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
