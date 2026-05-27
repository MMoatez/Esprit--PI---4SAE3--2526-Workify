import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthCallbackComponent } from './auth-callback.component';
import { AuthLoginComponent } from './auth-login.component';
import { AuthRegisterComponent } from './auth-register.component';
import { AuthRoutingModule } from './auth-routing.module';
import { RecaptchaModule, RECAPTCHA_SETTINGS, RecaptchaSettings } from 'ng-recaptcha';
import { environment } from '../../../environments/environment';

@NgModule({
  declarations: [
    AuthRegisterComponent,
    AuthCallbackComponent,
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    RecaptchaModule,
  ],
  providers: [],
})
export class AuthModule { }
