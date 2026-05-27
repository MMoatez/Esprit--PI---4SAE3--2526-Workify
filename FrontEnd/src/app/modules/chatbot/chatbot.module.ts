import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ChatbotComponent } from './chatbot.component';

const routes: Routes = [
  { path: '', component: ChatbotComponent }
];

@NgModule({
  declarations: [ChatbotComponent],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(routes)
  ]
})
export class ChatbotModule {}
