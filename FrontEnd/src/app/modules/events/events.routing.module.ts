import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { EventListComponent } from './components/event-list/event-list.component';
import { EventCreateComponent } from './components/event-create/event-create.component';
import { EventDetailComponent } from './components/event-detail/event-detail.component';
import { EventPartnersComponent } from './components/event-partners/event-partners.component';
import { EventPublicComponent } from './components/event-public/event-public.component';
import { AdminEventRegistrationsComponent } from './components/admin-event-registrations/admin-event-registrations.component';
import { EventCalendarComponent } from './components/event-calendar/event-calendar.component';
import { EventTicketComponent } from './components/event-ticket/event-ticket.component';
import { EventValidatorComponent } from './components/event-validator/event-validator.component';
import { PartnerInvitationsComponent } from './components/partner-invitations/partner-invitations.component';
import { EventAiPageComponent } from './components/event-ai-page/event-ai-page.component';

const routes: Routes = [
  { path: '', component: EventPublicComponent },
  { path: 'calendar', component: EventCalendarComponent },
  { path: 'partner/invitations', component: PartnerInvitationsComponent, canActivate: [authGuard] },
  { path: 'admin/list', component: EventListComponent },
  { path: 'admin/create', component: EventCreateComponent },
  { path: 'admin/edit/:id', component: EventCreateComponent },
  { path: 'admin/partners/:id', component: EventPartnersComponent },
  { path: 'admin/registrations/:id', component: AdminEventRegistrationsComponent },
  { path: 'admin/validator', component: EventValidatorComponent },
  { path: 'admin/scan', component: EventValidatorComponent, canActivate: [authGuard] },
  { path: 'admin/calendar', component: EventCalendarComponent, canActivate: [authGuard] },
  { path: 'admin/ai', component: EventAiPageComponent, canActivate: [authGuard] },
  { path: ':id/ticket', component: EventTicketComponent },
  { path: ':id', component: EventDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EventsRoutingModule { }
