import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthCallbackComponent } from './auth-callback.component';
import { AuthLoginComponent } from './auth-login.component';
import { AuthRegisterComponent } from './auth-register.component';
import { AuthForgotPasswordComponent } from './auth-forgot-password.component';
import { AuthResetPasswordComponent } from './auth-reset-password.component';

const routes: Routes = [
  { path: 'login', component: AuthLoginComponent },
  { path: 'register', component: AuthRegisterComponent },
  { path: 'forgot-password', component: AuthForgotPasswordComponent },
  { path: 'reset-password', component: AuthResetPasswordComponent },
  { path: 'callback', component: AuthCallbackComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule { }
