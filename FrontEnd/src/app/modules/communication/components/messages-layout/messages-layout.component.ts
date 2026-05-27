import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-messages-layout',
  standalone: false,
  templateUrl: './messages-layout.component.html',
  styleUrls: ['./messages-layout.component.css']
})
export class MessagesLayoutComponent implements OnInit, OnDestroy {
  // Pour le responsive mobile
  showConversationList: boolean = true;
  hasActiveThread: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.hasActiveThread = /\/communication\/(\d+)/.test(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(e => {
        this.hasActiveThread = /\/communication\/(\d+)/.test(e.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleView(): void {
    this.showConversationList = !this.showConversationList;
  }
}
