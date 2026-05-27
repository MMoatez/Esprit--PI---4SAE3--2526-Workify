import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: false,
  template: `
    <div class="flex items-center gap-1">
      <button 
        *ngFor="let star of stars; let i = index"
        type="button"
        (click)="rate(i + 1)"
        (mouseenter)="hover(i + 1)"
        (mouseleave)="hover(0)"
        class="focus:outline-none transition-all duration-200"
        [class.cursor-default]="readonly"
        [disabled]="readonly"
      >
        <svg 
          [class.text-yellow-400]="(hoverRating || rating) >= i + 1"
          [class.text-slate-200]="(hoverRating || rating) < i + 1"
          [class.scale-110]="!readonly && hoverRating === i + 1"
          class="w-6 h-6 fill-current transition-transform"
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      </button>
      <span *ngIf="showValue" class="ml-2 text-slate-500 font-bold text-sm">{{ rating > 0 ? rating : '0' }}/5</span>
    </div>
  `
})
export class StarRatingComponent {
  @Input() rating: number = 0;
  @Input() readonly: boolean = false;
  @Input() showValue: boolean = true;
  @Output() ratingChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];
  hoverRating: number = 0;

  rate(value: number): void {
    if (!this.readonly) {
      this.rating = value;
      this.ratingChange.emit(this.rating);
    }
  }

  hover(value: number): void {
    if (!this.readonly) {
      this.hoverRating = value;
    }
  }
}
