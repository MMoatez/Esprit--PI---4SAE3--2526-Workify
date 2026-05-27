import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { EvaluationStatusDto } from '../../../../core/models/feedback.model';

@Component({
  standalone: false,
  selector: 'app-evaluation-countdown',
  templateUrl: './evaluation-countdown.component.html',
  styleUrls: ['./evaluation-countdown.component.css']
})
export class EvaluationCountdownComponent implements OnInit, OnDestroy, OnChanges {

  @Input() offerId!: number;
  @Output() statusUpdate = new EventEmitter<EvaluationStatusDto>();

  status: EvaluationStatusDto | null = null;
  secondsRemaining = 0;
  displayTime = '';
  isUrgent = false;

  private destroy$ = new Subject<void>();

  constructor(private feedbackService: FeedbackService) {}

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnChanges(): void {
    this.destroy$.next();
    this.startPolling();
  }

  private startPolling(): void {
    if (!this.offerId) return;

    // Polling du statut toutes les 5 secondes
    interval(5000).pipe(
      startWith(0),
      switchMap(() => this.feedbackService.getEvaluationStatus(this.offerId)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (s) => {
        this.status = s;
        this.secondsRemaining = s.secondsRemaining;
        this.updateDisplay();
        this.statusUpdate.emit(s);
      },
      error: () => {}
    });

    // Ticker local (chaque seconde)
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.secondsRemaining > 0) {
        this.secondsRemaining--;
        this.updateDisplay();
      }
    });
  }

  private updateDisplay(): void {
    const s = this.secondsRemaining;
    this.isUrgent = s <= 15 && s > 0;
    if (s <= 0) {
      this.displayTime = 'Expired';
    } else if (s < 60) {
      this.displayTime = `${s}s`;
    } else {
      this.displayTime = `${Math.floor(s / 60)}m ${s % 60}s`;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
