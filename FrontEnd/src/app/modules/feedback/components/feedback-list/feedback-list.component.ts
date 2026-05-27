import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { FreelancerSummaryDto, FeedbackDto } from '../../../../core/models/feedback.model';

@Component({
  standalone: false,
  selector: 'app-feedback-list',
  templateUrl: './feedback-list.component.html',
  styleUrls: ['./feedback-list.component.css']
})
export class FeedbackListComponent implements OnInit, OnChanges {

  @Input() freelancerId!: number;
  @Input() freelancerName: string = '';

  summary: FreelancerSummaryDto | null = null;
  loading = true;

  filterRating: number | null = null;
  sortField = 'date';
  sortOrder = 'desc';
  page = 0;
  size = 5;

  readonly ratingFilters = [null, 5, 4, 3, 2, 1];

  constructor(private feedbackService: FeedbackService) {}

  ngOnInit(): void { this.load(); }
  ngOnChanges(): void { this.load(); }

  load(): void {
    if (!this.freelancerId) return;
    this.loading = true;
    this.feedbackService.getFreelancerSummary(this.freelancerId, {
      rating: this.filterRating ?? undefined,
      sort: this.sortField,
      order: this.sortOrder,
      page: this.page,
      size: this.size,
    }).subscribe({
      next: (s) => { this.summary = s; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  setFilter(rating: number | null): void {
    this.filterRating = rating;
    this.page = 0;
    this.load();
  }

  toggleSort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'desc';
    }
    this.load();
  }

  onFeedbackUpdated(updated: FeedbackDto): void {
    if (!this.summary) return;
    const idx = this.summary.feedbacks.findIndex(f => f.id === updated.id);
    if (idx > -1) this.summary.feedbacks[idx] = updated;
  }

  downloadingReport = false;

  downloadReport(): void {
    if (this.downloadingReport) return;
    this.downloadingReport = true;
    this.feedbackService.downloadReport(this.freelancerId, this.freelancerName).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reputation-report-${this.freelancerId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingReport = false;
      },
      error: () => { this.downloadingReport = false; }
    });
  }

  get stars(): number[] { return [1, 2, 3, 4, 5]; }
}
