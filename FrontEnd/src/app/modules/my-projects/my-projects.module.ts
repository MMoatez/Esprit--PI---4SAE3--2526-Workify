import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { MyProjectsRoutingModule } from './my-projects-routing.module';
import { MyProjectsListComponent } from './my-projects-list/my-projects-list.component';
import { MyProjectDetailsComponent } from './my-project-details/my-project-details.component';
import { ProjectPlanningComponent } from './project-planning/project-planning.component';

@NgModule({
  declarations: [
    MyProjectsListComponent,
    MyProjectDetailsComponent,
    ProjectPlanningComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MyProjectsRoutingModule
  ]
})
export class MyProjectsModule { }