import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ConversationListComponent } from './components/conversation-list/conversation-list.component';
import { MessageThreadComponent } from './components/message-thread/message-thread.component';
import { MessagesLayoutComponent } from './components/messages-layout/messages-layout.component';

const routes: Routes = [
  {
    path: '',
    component: MessagesLayoutComponent,
    children: [
      {
        path: '',
        component: ConversationListComponent
      },
      {
        path: ':id',
        component: MessageThreadComponent
      }
    ]
  }
];


@NgModule({
  declarations: [
    ConversationListComponent,
    MessageThreadComponent,
    MessagesLayoutComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RouterModule.forChild(routes)
  ],
  exports: []
})
export class CommunicationModule { }
