import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProjectsRoutingModule } from './projects-routing.module';
import { BrowseProjectsComponent } from './components/browse-projects/browse-projects.component';
import { ProjectDetailsComponent } from './components/project-details/project-details.component';
import { OpenProjectsComponent } from './open-projects/open-projects.component';

@NgModule({
  declarations: [
    BrowseProjectsComponent,
    ProjectDetailsComponent,
    OpenProjectsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ProjectsRoutingModule
  ]
})
export class ProjectsModule { }