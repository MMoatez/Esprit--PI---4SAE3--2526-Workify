import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { ClientProfilesComponent } from './client-profiles.component';
import { ConversationService } from '../../core/services/conversation.service';
import { MessageService } from '../../core/services/message.service';

const routes: Routes = [
  { path: '', component: ClientProfilesComponent }
];

@NgModule({
  declarations: [ClientProfilesComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  providers: [ConversationService, MessageService]
})
export class ClientsModule { }
