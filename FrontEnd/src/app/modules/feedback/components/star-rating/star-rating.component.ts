import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-star-rating',
  template: `
    <div class="star-group">
      <span
        *ngFor="let star of stars"
        class="star"
        [class.filled]="star <= (hovered || value)"
        [class.readonly]="readonly"
        (mouseenter)="!readonly && (hovered = star)"
        (mouseleave)="!readonly && (hovered = 0)"
        (click)="!readonly && select(star)"
      >&#9733;</span>
    </div>
  `,
  styles: [`
    .star-group { display: inline-flex; gap: 2px; }
    .star { font-size: 1.5rem; color: #d1d5db; cursor: pointer; transition: color 0.15s; }
    .star.filled { color: #f59e0b; }
    .star.readonly { cursor: default; }
  `]
})
export class StarRatingComponent {
  @Input() value = 0;
  @Input() readonly = false;
  @Output() valueChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];
  hovered = 0;

  select(star: number): void {
    this.value = star;
    this.valueChange.emit(star);
  }
}
