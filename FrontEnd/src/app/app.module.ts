import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessengerPopupComponent } from './modules/communication/components/messenger-popup/messenger-popup.component';
import { NotificationToastComponent } from './core/components/notification-toast/notification-toast.component';
import { FeedbackNotificationToastComponent } from './core/components/feedback-notification-toast/feedback-notification-toast.component';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { RecaptchaModule, RECAPTCHA_SETTINGS, RecaptchaSettings } from 'ng-recaptcha';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    MessengerPopupComponent,
    NotificationToastComponent,
    FeedbackNotificationToastComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    RecaptchaModule,
     CommonModule
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: environment.recaptcha.siteKey,
        enterprise: false,
      } as RecaptchaSettings,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
