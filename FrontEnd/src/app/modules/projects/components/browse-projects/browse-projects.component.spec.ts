import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowseProjectsComponent } from './browse-projects.component';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';

describe('BrowseProjectsComponent', () => {
  let component: BrowseProjectsComponent;
  let fixture: ComponentFixture<BrowseProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BrowseProjectsComponent],
      imports: [RouterTestingModule, FormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowseProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
