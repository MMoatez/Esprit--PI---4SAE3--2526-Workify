import { TestBed } from '@angular/core/testing';

import { MyProjectsService } from './my-projects.service';

describe('MyProjectsService', () => {
  let service: MyProjectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyProjectsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
