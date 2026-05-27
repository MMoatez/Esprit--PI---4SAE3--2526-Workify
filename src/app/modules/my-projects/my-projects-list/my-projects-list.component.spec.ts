import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyProjectsListComponent } from './my-projects-list.component';

describe('MyProjectsListComponent', () => {
  let component: MyProjectsListComponent;
  let fixture: ComponentFixture<MyProjectsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyProjectsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyProjectsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
