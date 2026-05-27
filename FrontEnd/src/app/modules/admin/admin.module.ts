import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventAnalyticsComponent } from './pages/dashboard/event-analytics.component';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UserListComponent } from './pages/user-list/user-list.component';
import { FormationAdminComponent } from './pages/formation-admin/formation-admin.component';
import { FormationContentComponent } from './pages/formation-content/formation-content.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PartnerDashboardComponent } from './pages/partner-dashboard/partner-dashboard.component';
import { AdminCommunicationComponent } from './pages/admin-communication/admin-communication.component';
import { AdminFeedbackComponent } from './pages/admin-feedback/admin-feedback.component';
import { FormationQuizComponent } from './pages/formation-quiz/formation-quiz.component';
import { PackManagementComponent } from './pages/pack-management/pack-management.component';
import { SubscriptionManagementComponent } from './pages/subscription-management/subscription-management.component';
import { PaymentManagementComponent } from './pages/payment-management/payment-management.component';

@NgModule({
  declarations: [
    AdminLayoutComponent,
    SidebarComponent,
    HeaderComponent,
    DashboardComponent,
    UserListComponent,
    FormationAdminComponent,
    FormationContentComponent,
    PartnerDashboardComponent,
    AdminCommunicationComponent,
    AdminFeedbackComponent,
    FormationQuizComponent,
    PackManagementComponent,
    SubscriptionManagementComponent,
    PaymentManagementComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    EventAnalyticsComponent
  ]
})
export class AdminModule { }
