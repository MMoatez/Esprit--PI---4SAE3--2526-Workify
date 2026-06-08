import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { HostListener } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-auth-register',
  templateUrl: './auth-register.component.html',
  styles: [`
    @keyframes regFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(25px, -15px) scale(1.04); }
      66% { transform: translate(-15px, 10px) scale(0.96); }
    }
    @keyframes regCardEntry {
      0% { opacity: 0; transform: translateY(20px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes regShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes regSpin { to { transform: rotate(360deg); } }
    @keyframes regPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    :host { display: block; }

    .register-page {
      min-height: 100vh;
      display: flex;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 40%, #eef2ff 100%);
    }

    /* Background Orbs */
    .reg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      animation: regFloat 14s ease-in-out infinite;
      pointer-events: none;
    }
    .reg-orb--1 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(13,148,136,0.12), transparent 70%);
      top: -8%; right: 10%;
    }
    .reg-orb--2 {
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(79,70,229,0.08), transparent 70%);
      bottom: -5%; left: 5%;
      animation-delay: -5s;
    }
    .reg-orb--3 {
      width: 200px; height: 200px;
      background: radial-gradient(circle, rgba(13,148,136,0.06), transparent 70%);
      top: 40%; left: 60%;
      animation-delay: -9s;
    }

    /* ===== Left Branding Panel ===== */
    .reg-branding {
      display: none;
      width: 42%;
      background: linear-gradient(160deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%);
      position: relative;
      overflow: hidden;
      padding: 3rem 2.5rem;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    @media (min-width: 1024px) {
      .reg-branding { display: flex; }
    }
    .reg-brand-float-1, .reg-brand-float-2 {
      position: absolute;
      border-radius: 50%;
      animation: regFloat 10s ease-in-out infinite;
    }
    .reg-brand-float-1 {
      width: 180px; height: 180px;
      background: rgba(255,255,255,0.06);
      top: 8%; right: -30px;
      animation-delay: -3s;
    }
    .reg-brand-float-2 {
      width: 140px; height: 140px;
      background: rgba(255,255,255,0.04);
      bottom: 12%; left: -20px;
      animation-delay: -7s;
    }
    .reg-brand-content {
      position: relative;
      z-index: 10;
      text-align: center;
      color: white;
    }
    .reg-brand-logo {
      width: 100px; height: 100px;
      margin: 0 auto 1.5rem;
      filter: brightness(0) invert(1);
      object-fit: contain;
    }
    .reg-brand-title {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }
    .reg-brand-subtitle {
      font-size: 1rem;
      opacity: 0.85;
      line-height: 1.6;
      max-width: 300px;
      margin: 0 auto;
    }
    .reg-brand-steps {
      margin-top: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .reg-brand-step {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      background: rgba(255,255,255,0.06);
      border-radius: 1rem;
      border: 1px solid rgba(255,255,255,0.08);
      transition: all 0.4s ease;
      opacity: 0.5;
    }
    .reg-brand-step--active {
      opacity: 1;
      background: rgba(255,255,255,0.14);
      border-color: rgba(255,255,255,0.2);
    }
    .reg-brand-step-num {
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.15);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
      flex-shrink: 0;
    }
    .reg-brand-step-label {
      font-weight: 700;
      font-size: 0.875rem;
    }
    .reg-brand-step-desc {
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 0.125rem;
    }

    /* ===== Right Form Side ===== */
    .reg-form-side {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      position: relative;
      z-index: 10;
      overflow-y: auto;
    }
    .reg-card-wrapper {
      width: 100%;
      max-width: 560px;
    }

    /* Mobile Stepper */
    .reg-stepper-mobile {
      margin-bottom: 1.5rem;
    }
    @media (min-width: 1024px) {
      .reg-stepper-mobile { display: none; }
    }
    .reg-stepper-track {
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .reg-stepper-progress {
      height: 100%;
      background: linear-gradient(90deg, #0d9488, #14b8a6);
      border-radius: 2px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .reg-stepper-dots {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .reg-stepper-dot {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      background: white;
      color: #94a3b8;
      border: 2px solid #e2e8f0;
      transition: all 0.3s ease;
    }
    .reg-stepper-dot--active {
      background: #0d9488;
      color: white;
      border-color: #0d9488;
    }
    .reg-stepper-dot--current {
      box-shadow: 0 0 0 4px rgba(13,148,136,0.15);
    }
    .reg-stepper-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: #94a3b8;
      font-weight: 500;
    }
    .reg-stepper-labels .active { color: #0d9488; font-weight: 600; }

    /* Card */
    .reg-card {
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 1.75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
      padding: 2rem;
      animation: regCardEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @media (min-width: 640px) {
      .reg-card { padding: 2.5rem; }
    }

    /* Step Content */
    .reg-step-content {
      animation: regCardEntry 0.4s ease-out both;
    }
    .reg-step-header {
      margin-bottom: 1.75rem;
    }
    .reg-step-header h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.375rem;
      letter-spacing: -0.02em;
    }
    .reg-step-header p {
      color: #64748b;
      font-size: 0.9rem;
    }
    .reg-step-header--center { text-align: center; }
    .reg-step-icon-badge {
      width: 64px; height: 64px;
      background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
      border-radius: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      font-size: 2rem;
      box-shadow: 0 4px 12px rgba(13,148,136,0.1);
    }

    /* Grid */
    .reg-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    @media (max-width: 480px) {
      .reg-grid-2 { grid-template-columns: 1fr; }
    }

    /* Input Groups */
    .reg-input-group { margin-bottom: 1rem; }
    .reg-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.375rem;
      margin-left: 0.125rem;
    }
    .reg-input-wrapper { position: relative; }
    .reg-input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.5rem;
      background: #f1f5f9;
      border: 2px solid transparent;
      border-radius: 0.875rem;
      font-size: 0.875rem;
      color: #0f172a;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .reg-input::placeholder { color: #94a3b8; }
    .reg-input:focus {
      background: #ffffff;
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20,184,166,0.1);
    }
    .reg-input--error { border-color: #ef4444 !important; }
    .reg-input--pw { padding-right: 2.75rem; }
    .reg-input-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      pointer-events: none;
      transition: color 0.3s ease;
    }
    .reg-input-wrapper:focus-within .reg-input-icon { color: #14b8a6; }
    .reg-input-action {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.125rem;
      line-height: 1;
    }
    .reg-error-text {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      margin-left: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .reg-error-text::before { content: '⚠️'; font-size: 0.625rem; }

    /* File Upload */
    .reg-file-upload {
      position: relative;
      border: 2px dashed #cbd5e1;
      border-radius: 0.875rem;
      padding: 0.875rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .reg-file-upload:hover {
      border-color: #14b8a6;
      background: rgba(20,184,166,0.03);
    }
    .reg-file-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      padding: 0;
      border: none;
    }
    .reg-file-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .reg-file-content svg { color: #94a3b8; }

    /* Organization Section */
    .reg-org-section {
      padding-top: 1rem;
      margin-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }

    /* Role Cards */
    .reg-role-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .reg-role-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.875rem 0.5rem;
      border: 2px solid #e2e8f0;
      border-radius: 1rem;
      background: white;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .reg-role-card:hover {
      border-color: #99f6e4;
      background: #f0fdfa;
      transform: translateY(-2px);
    }
    .reg-role-card--active {
      border-color: #0d9488 !important;
      background: #f0fdfa !important;
      box-shadow: 0 0 0 3px rgba(13,148,136,0.1);
    }
    .reg-role-icon { font-size: 1.5rem; margin-bottom: 0.375rem; }
    .reg-role-label { font-size: 0.75rem; font-weight: 600; color: #334155; }
    .reg-role-check {
      position: absolute;
      top: 0.375rem;
      right: 0.375rem;
      width: 18px; height: 18px;
      background: #0d9488;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 700;
    }

    /* Alerts */
    .reg-alert {
      padding: 0.75rem 1rem;
      border-radius: 0.875rem;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
      animation: regCardEntry 0.3s ease-out;
    }
    .reg-alert--error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    /* Buttons */
    .reg-submit {
      width: 100%;
      padding: 0.875rem;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: white;
      font-weight: 700;
      font-size: 0.875rem;
      border: none;
      border-radius: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      box-shadow: 0 4px 15px rgba(13,148,136,0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .reg-submit::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
      background-size: 200% 100%;
      animation: regShimmer 3s ease-in-out infinite;
    }
    .reg-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(13,148,136,0.35);
    }
    .reg-submit:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }
    .reg-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .reg-submit--finish { flex: 1; }

    .reg-btn-row {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .reg-btn-outline {
      flex: 1;
      padding: 0.875rem;
      border: 1.5px solid #cbd5e1;
      background: white;
      color: #475569;
      font-weight: 600;
      font-size: 0.875rem;
      border-radius: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }
    .reg-btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .reg-btn-ghost {
      flex: 1;
      padding: 0.875rem;
      border: 1.5px solid #e2e8f0;
      background: transparent;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.875rem;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .reg-btn-ghost:hover {
      background: #f8fafc;
      color: #64748b;
    }

    /* Spinner */
    .reg-spinner {
      width: 1.125rem; height: 1.125rem;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: regSpin 0.6s linear infinite;
    }
    .reg-spinner--teal {
      border-color: rgba(13,148,136,0.2);
      border-top-color: #0d9488;
    }
    .reg-spinner--lg {
      width: 2.5rem; height: 2.5rem;
      border-width: 3px;
    }

    /* Footer Link */
    .reg-footer-link {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .reg-footer-link a {
      color: #0d9488;
      font-weight: 700;
      text-decoration: none;
      margin-left: 0.125rem;
      transition: color 0.2s ease;
    }
    .reg-footer-link a:hover { color: #0f766e; }

    /* Upload Cards */
    .reg-upload-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 480px) {
      .reg-upload-grid { grid-template-columns: 1fr; }
    }
    .reg-upload-card {
      position: relative;
      border: 2px dashed #cbd5e1;
      border-radius: 1.25rem;
      padding: 1.5rem 1rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .reg-upload-card:hover {
      border-color: #14b8a6;
      background: rgba(20,184,166,0.04);
      transform: translateY(-3px);
    }
    .reg-upload-card--alt:hover {
      border-color: #818cf8;
      background: rgba(99,102,241,0.04);
    }
    .reg-upload-card--loading {
      background: #f8fafc;
      pointer-events: none;
    }
    .reg-upload-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      padding: 0;
      border: none;
    }
    .reg-upload-content { display: flex; flex-direction: column; align-items: center; gap: 0.375rem; }
    .reg-upload-icon {
      font-size: 1.75rem;
      margin-bottom: 0.25rem;
      transition: transform 0.3s ease;
    }
    .reg-upload-card:hover .reg-upload-icon { transform: scale(1.15); }
    .reg-upload-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #334155;
    }
    .reg-upload-desc {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .reg-upload-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      color: #0d9488;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    /* Review Card */
    .reg-review-card {
      background: #f8fafc;
      border-radius: 1.25rem;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.25rem;
    }
    .reg-review-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .reg-review-row:last-child { border-bottom: none; }
    .reg-review-label { color: #64748b; font-size: 0.8125rem; }
    .reg-review-value { font-weight: 700; color: #0f172a; font-size: 0.875rem; }

    /* Skills */
    .reg-skills-section {
      padding-top: 0.75rem;
      margin-top: 0.5rem;
    }
    .reg-skill-add {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .reg-skill-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 0.75rem;
      font-size: 0.8125rem;
      outline: none;
      transition: border-color 0.2s ease;
      background: white;
    }
    .reg-skill-input:focus { border-color: #14b8a6; }
    .reg-skill-add-btn {
      padding: 0.5rem 0.75rem;
      background: #f1f5f9;
      border: 1.5px solid #cbd5e1;
      border-radius: 0.75rem;
      cursor: pointer;
      color: #475569;
      display: flex;
      align-items: center;
      transition: all 0.2s ease;
    }
    .reg-skill-add-btn:hover {
      background: #0d9488;
      border-color: #0d9488;
      color: white;
    }
    .reg-skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .reg-skill-tag {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      background: white;
      border: 1.5px solid #e2e8f0;
      border-radius: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #334155;
      transition: all 0.2s ease;
    }
    .reg-skill-tag:hover { border-color: #14b8a6; }
    .reg-skill-actions {
      display: flex;
      gap: 0.125rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .reg-skill-tag:hover .reg-skill-actions { opacity: 1; }
    .reg-skill-action-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      font-size: 0.8125rem;
      padding: 0 0.125rem;
      transition: color 0.2s ease;
    }
    .reg-skill-action-btn:hover { color: #0d9488; }
    .reg-skill-action-btn--delete:hover { color: #ef4444; }
    .reg-skill-action-btn--save { color: #0d9488; }
    .reg-skill-edit-input {
      width: 80px;
      padding: 0.125rem 0.375rem;
      border: 1.5px solid #14b8a6;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      outline: none;
      background: white;
    }
    .reg-skills-empty {
      color: #94a3b8;
      font-style: italic;
      font-size: 0.8125rem;
      padding: 0.25rem 0;
    }

    /* Modal */
    .reg-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15,23,42,0.6);
      backdrop-filter: blur(6px);
      animation: regCardEntry 0.3s ease-out;
    }
    .reg-modal {
      position: relative;
      width: 100%;
      max-width: 72rem;
      height: 90vh;
      margin: 1rem;
      background: white;
      border-radius: 2rem;
      box-shadow: 0 40px 80px rgba(0,0,0,0.15);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .reg-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 2rem;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
    }
    .reg-modal-header-left {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .reg-modal-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(13,148,136,0.25);
    }
    .reg-modal-header-left h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
    }
    .reg-modal-header-left p {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
    }
    .reg-modal-close {
      width: 40px; height: 40px;
      border-radius: 1rem;
      background: white;
      border: 1.5px solid #e2e8f0;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .reg-modal-close:hover {
      color: #ef4444;
      border-color: #fecaca;
      background: #fef2f2;
    }
    .reg-modal-body {
      flex: 1;
      position: relative;
    }
    .reg-modal-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .reg-modal-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      gap: 1rem;
      color: #64748b;
      font-weight: 500;
    }
    .reg-modal-hint {
      position: absolute;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.75rem 1.5rem;
      background: rgba(15,23,42,0.9);
      color: white;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      backdrop-filter: blur(8px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      pointer-events: none;
      animation: regPulse 2s ease-in-out infinite;
    }
  `]
})
export class AuthRegisterComponent implements OnInit {
  currentStep = 1;
  registerForm!: FormGroup;
  isExtracting = false;
  isSubmitting = false;
  error: string | null = null;
  extractedCompetences: string[] = [];
  avatarFile: File | null = null;
  showPassword = false;
  showResumeBuilder = false;
  safeCvBuilderUrl: SafeResourceUrl | undefined;

  // Store the full resume data & PDF from the builder so we can save after registration
  private storedResumeData: any = null;
  private storedPdfBase64: string | null = null;
  roles = [
    { value: 'FREELANCER', label: 'Freelancer', icon: '👤' },
    { value: 'CLIENT', label: 'Client', icon: '💼' },
    { value: 'PARTNER', label: 'Partner', icon: '🤝' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: UserProfileService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.safeCvBuilderUrl = this.sanitizer.bypassSecurityTrustResourceUrl('http://localhost:3000');
  }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      role: ['FREELANCER', Validators.required],
      phone: [''],
      companyName: [''],
      industry: [''],
      website: [''],
      competences: [[]],
    });
  }

  newCompetence = '';
  editingIndex: number | null = null;
  editingValue = '';

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.registerForm.invalid) return;

      const email = this.registerForm.get('email')?.value;
      const role = this.registerForm.get('role')?.value;

      this.isSubmitting = true;
      this.error = null;

      this.authService.checkEmail(email).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res.exists) {
            this.error = "A user with this email already exists.";
          } else {
            this.error = null;
            if (role === 'CLIENT' || role === 'PARTNER') {
              this.currentStep = 3; // Skip CV upload for clients and partners
            } else {
              this.currentStep++;
            }
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = "Unable to verify email. Please try again.";
        }
      });
      return;
    }
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    const role = this.registerForm.get('role')?.value;
    if (this.currentStep === 3 && (role === 'CLIENT' || role === 'PARTNER')) {
      this.currentStep = 1; // Go back to step 1
    } else if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.avatarFile = input.files[0];
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      this.error = 'Please select a PDF file.';
      return;
    }

    this.isExtracting = true;
    this.error = null;
    const role = this.registerForm.get('role')?.value;
    this.authService.extractCompetences(file, role).subscribe({
      next: (competences) => {
        this.extractedCompetences = competences;
        this.registerForm.patchValue({ competences });
        this.isExtracting = false;
        this.nextStep(); // Move to review step after extraction
      },
      error: (err) => {
        this.error = "Error analyzing CV. You can continue manually.";
        this.isExtracting = false;
      },
    });
  }

  addCompetence(): void {
    if (this.newCompetence.trim()) {
      this.extractedCompetences.push(this.newCompetence.trim());
      this.registerForm.patchValue({ competences: this.extractedCompetences });
      this.newCompetence = '';
    }
  }

  removeCompetence(index: number): void {
    this.extractedCompetences.splice(index, 1);
    this.registerForm.patchValue({ competences: this.extractedCompetences });
  }

  openResumeBuilder(): void {
    this.showResumeBuilder = true;
  }

  closeResumeBuilder(): void {
    this.showResumeBuilder = false;
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    // Only listen to messages from our local builder
    if (event.origin !== 'http://localhost:3000') return;

    if (event.data && event.data.type === 'OPENRESUME_EXPORT') {
      const resumeData = event.data.payload;
      const pdfBase64: string | null = event.data.pdfBase64 || null;
      console.log('[Signup] Received OPENRESUME_EXPORT, pdfBase64 present:', !!pdfBase64, 'length:', pdfBase64?.length);
      this.handleResumeData(resumeData, pdfBase64);
    }
  }

  private handleResumeData(resumeData: any, pdfBase64: string | null) {
    // Store full data for saving after registration
    this.storedResumeData = resumeData;
    this.storedPdfBase64 = pdfBase64;
    console.log('[Signup] Stored pdfBase64, present:', !!this.storedPdfBase64, 'length:', this.storedPdfBase64?.length);

    // Extract skills from the OpenResume structure
    if (resumeData.skills) {
      const skills: string[] = [];
      const addSkill = (skillText: string) => {
        const cleanSkill = skillText.trim();
        if (cleanSkill) {
          // If the text is absurdly long, truncate it to avoid DB errors
          const truncated = cleanSkill.length > 150 ? cleanSkill.substring(0, 150) + '...' : cleanSkill;
          skills.push(truncated);
        }
      };

      if (resumeData.skills.featuredSkills && Array.isArray(resumeData.skills.featuredSkills)) {
        resumeData.skills.featuredSkills.forEach((fs: any) => {
          if (fs.skill) addSkill(fs.skill);
        });
      }
      if (resumeData.skills.descriptions && Array.isArray(resumeData.skills.descriptions)) {
        resumeData.skills.descriptions.forEach((desc: string) => {
          if (desc) {
            desc.split(',').forEach((s: string) => addSkill(s));
          }
        });
      }
      this.extractedCompetences = [...new Set([...this.extractedCompetences, ...skills])];
      this.registerForm.patchValue({ competences: this.extractedCompetences });
    }

    // Try to extract name if not already filled (OpenResume uses profile.name as full name)
    if (!this.registerForm.get('firstName')?.value && resumeData.profile?.name) {
      const parts = resumeData.profile.name.split(' ');
      this.registerForm.patchValue({ firstName: parts[0] || '' });
      if (parts.length > 1) {
        this.registerForm.patchValue({ lastName: parts.slice(1).join(' ') });
      }
    }

    this.closeResumeBuilder();
    this.currentStep = 3;
  }

  startEdit(index: number): void {
    this.editingIndex = index;
    this.editingValue = this.extractedCompetences[index];
  }

  saveEdit(): void {
    if (this.editingIndex !== null && this.editingValue.trim()) {
      this.extractedCompetences[this.editingIndex] = this.editingValue.trim();
      this.registerForm.patchValue({ competences: this.extractedCompetences });
      this.editingIndex = null;
      this.editingValue = '';
    }
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.editingValue = '';
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    this.isSubmitting = true;
    this.error = null;

    const registrationData = {
      ...this.registerForm.value
    };

    this.authService.registerUser(registrationData, this.avatarFile).subscribe({
      next: (res: any) => {
        // Registration response now includes access_token from backend
        const token = res?.access_token;

        if (this.storedResumeData && token) {
          // We have CV data and a token — save CV to backend
          console.log('[Signup] Token received, saving CV. pdfBase64 present:', !!this.storedPdfBase64);
          this.authService.setSession(token, res?.refresh_token);
          this.saveCvAfterRegistration();
        } else if (this.storedResumeData && !token) {
          // CV data exists but no token — fallback to login page
          console.warn('Registration succeeded but no token returned, CV not saved');
          this.isSubmitting = false;
          this.router.navigate(['/auth/login'], { queryParams: { registered: true } });
        } else {
          // No CV data — normal flow
          this.isSubmitting = false;
          this.router.navigate(['/auth/login'], { queryParams: { registered: true } });
        }
      },
      error: (err) => {
        console.error('[Signup] Registration FAILED:', err);
        this.error = err?.error?.error || err?.error?.message || err?.message || 'An error occurred during registration.';
        this.isSubmitting = false;
      },
    });
  }

  private saveCvAfterRegistration(): void {
    console.log('[Signup] saveCvAfterRegistration called, pdfBase64 present:', !!this.storedPdfBase64);
    // Import CV JSON data (skills, experience, education)
    this.profileService.importCv(this.storedResumeData).subscribe({
      next: () => {
        console.log('[Signup] importCv success, now checking pdfBase64:', !!this.storedPdfBase64, 'length:', this.storedPdfBase64?.length);
        if (this.storedPdfBase64) {
          this.uploadCvPdfAfterRegistration();
        } else {
          console.warn('[Signup] No pdfBase64 stored, skipping PDF upload');
          this.finishRegistration();
        }
      },
      error: (err) => {
        console.error('[Signup] importCv FAILED:', err);
        this.finishRegistration(); // Still navigate, CV can be re-imported later
      },
    });
  }

  private uploadCvPdfAfterRegistration(): void {
    console.log('[Signup] uploadCvPdfAfterRegistration called');
    if (!this.storedPdfBase64) {
      console.warn('[Signup] storedPdfBase64 is null at upload time!');
      this.finishRegistration();
      return;
    }
    const byteString = atob(this.storedPdfBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: 'application/pdf' });
    const file = new File([blob], 'resume.pdf', { type: 'application/pdf' });
    console.log('[Signup] Uploading PDF, file size:', file.size);

    this.profileService.uploadCvPdf(file).subscribe({
      next: () => {
        console.log('[Signup] CV PDF uploaded successfully!');
        this.finishRegistration();
      },
      error: (err) => {
        console.error('[Signup] uploadCvPdf FAILED:', err);
        this.finishRegistration();
      },
    });
  }

  private finishRegistration(): void {
    this.isSubmitting = false;
    // User is already logged in, go straight to profile
    this.router.navigate(['/profile']);
  }
}
