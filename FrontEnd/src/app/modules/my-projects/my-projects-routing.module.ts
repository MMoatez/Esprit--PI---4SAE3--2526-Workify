import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyProjectsListComponent } from './my-projects-list/my-projects-list.component';
import { MyProjectDetailsComponent } from './my-project-details/my-project-details.component';
import { ProjectPlanningComponent } from './project-planning/project-planning.component';

const routes: Routes = [
  {
    path: '',
    component: MyProjectsListComponent
  },
  {
    path: ':id',
    component: MyProjectDetailsComponent
  },
  {
    path: ':id/planning',
    component: ProjectPlanningComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyProjectsRoutingModule { }