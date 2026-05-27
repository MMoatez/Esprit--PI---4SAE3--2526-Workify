import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormationAdminComponent } from './formation-admin.component';

describe('FormationAdminComponent', () => {
  let component: FormationAdminComponent;
  let fixture: ComponentFixture<FormationAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormationAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormationAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
