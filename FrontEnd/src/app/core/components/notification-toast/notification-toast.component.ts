import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  PriorityNotificationService,
  NotificationToast
} from '../../services/priority-notification.service';

/**
 * NotificationToastComponent
 * ──────────────────────────
 * Renders a stacked list of reminder toasts in the top-right corner of the
 * viewport.  Each toast is colour-coded by priority:
 *   HIGH   → red left border  + 🔴 icon
 *   MEDIUM → orange left border + 🟠 icon
 *   LOW    → yellow left border + 🟡 icon
 *
 * Clicking a toast navigates to the conversation; the close button dismisses it.
 * Toasts auto-dismiss after 6 seconds (timer lives in PriorityNotificationService).
 *
 * Placement: declared in AppModule, placed in app.component.html so it is
 * always visible regardless of which route is active.
 */
@Component({
  selector  : 'app-notification-toast',
  standalone: false,
  templateUrl: './notification-toast.component.html',
  styleUrls : ['./notification-toast.component.css']
})
export class NotificationToastComponent implements OnInit, OnDestroy {

  toasts: NotificationToast[] = [];

  private destroy$ = new Subject<void>();

  constructor(private notifSvc: PriorityNotificationService) {}

  ngOnInit(): void {
    this.notifSvc.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(t => this.toasts = t);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismiss(id: string, event?: Event): void {
    event?.stopPropagation();
    this.notifSvc.dismissToast(id);
  }

  navigate(toast: NotificationToast): void {
    if (toast.conversationId) {
      this.notifSvc.navigateTo(toast.conversationId);
    }
    this.notifSvc.dismissToast(toast.id);
  }

  priorityIcon(p: string): string {
    if (p === 'HIGH')   return '🔴';
    if (p === 'LOW')    return '🟡';
    return '🟠'; // MEDIUM
  }

  toastTitle(toast: NotificationToast): string {
    if (toast.type === 'archive_notice') return 'Auto-archived';
    if (toast.priority === 'HIGH')       return 'Urgent reminder';
    if (toast.priority === 'LOW')        return 'Reminder';
    return 'Unread message';
  }

  trackById(_: number, toast: NotificationToast): string {
    return toast.id;
  }
}
