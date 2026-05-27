import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowseProjectsComponent } from './components/browse-projects/browse-projects.component';
import { ProjectDetailsComponent } from './components/project-details/project-details.component';
import { OpenProjectsComponent } from './open-projects/open-projects.component';
import { FavoritesComponent } from './components/Favorites.component';

const routes: Routes = [
  {
    path: '',
    component: BrowseProjectsComponent
  },
  {
    path: 'open',
    component: OpenProjectsComponent
  },
  {
    path: 'favorites',
    component: FavoritesComponent
  },
  {
    path: ':id',
    component: ProjectDetailsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectsRoutingModule { }
