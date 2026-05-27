import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UserListComponent } from './pages/user-list/user-list.component';
import { FormationAdminComponent } from './pages/formation-admin/formation-admin.component';
import { FormationContentComponent } from './pages/formation-content/formation-content.component';
import { PartnerDashboardComponent } from './pages/partner-dashboard/partner-dashboard.component';
import { AdminCommunicationComponent } from './pages/admin-communication/admin-communication.component';
import { AdminFeedbackComponent } from './pages/admin-feedback/admin-feedback.component';
import { FormationQuizComponent } from './pages/formation-quiz/formation-quiz.component';
import { PackManagementComponent } from './pages/pack-management/pack-management.component';
import { SubscriptionManagementComponent } from './pages/subscription-management/subscription-management.component';
import { PaymentManagementComponent } from './pages/payment-management/payment-management.component';

import { superAdminGuard } from '../../core/guards/super-admin.guard';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [superAdminGuard] },
      { path: 'partner-dashboard', component: PartnerDashboardComponent },
      { path: 'users', component: UserListComponent, canActivate: [superAdminGuard] },
      { path: 'formations', component: FormationAdminComponent },
      { path: 'formations/:id/content', component: FormationContentComponent },
      { path: 'communication', component: AdminCommunicationComponent, canActivate: [superAdminGuard] },
      { path: 'feedback', component: AdminFeedbackComponent, canActivate: [superAdminGuard] },
      { path: 'formations/:id/quiz', component: FormationQuizComponent },
      { path: 'packs', component: PackManagementComponent, canActivate: [superAdminGuard] },
      { path: 'subscriptions', component: SubscriptionManagementComponent, canActivate: [superAdminGuard] },
      { path: 'payments', component: PaymentManagementComponent, canActivate: [superAdminGuard] }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
