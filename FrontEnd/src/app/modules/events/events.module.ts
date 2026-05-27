import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EventsRoutingModule } from './events.routing.module';
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
import { EventAiAssistantComponent } from './components/event-ai-assistant/event-ai-assistant.component';

@NgModule({
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, EventsRoutingModule,
    EventListComponent, EventCreateComponent, EventDetailComponent,
    EventPartnersComponent, EventPublicComponent, AdminEventRegistrationsComponent,
    EventCalendarComponent, EventTicketComponent, EventValidatorComponent,
    PartnerInvitationsComponent, EventAiAssistantComponent
  ]
})
export class EventsModule {}
