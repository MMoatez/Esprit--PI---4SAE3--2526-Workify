import { Component, OnInit } from '@angular/core';
import { PackService } from '../../../services/pack.service';
import { Pack, UserType, DurationDisplay } from '../../../models/pack.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-freelancer-subscription',
  templateUrl: './freelancer-subscription.component.html',
  styleUrls: ['./freelancer-subscription.component.css']
})
export class FreelancerSubscriptionComponent implements OnInit {
  packs: Pack[] = [];
  loading = true;
  error = '';

  constructor(private packService: PackService) {}

  ngOnInit(): void {
    this.loadPacks();
  }

  loadPacks(): void {
    this.loading = true;
    forkJoin([
      this.packService.getPacksByUserType(UserType.FREELANCER),
      this.packService.getPacksByUserType(UserType.FREELANCER_CLIENT)
    ]).subscribe({
      next: ([freelancerPacks, freelancerClientPacks]) => {
        const all = [...freelancerPacks, ...freelancerClientPacks];
        const uniqueById = new Map<number | string, Pack>();

        all.forEach((pack, index) => {
          const key = pack.id ?? `${pack.name}-${pack.duration}-${index}`;
          uniqueById.set(key, pack);
        });

        this.packs = Array.from(uniqueById.values()).sort((a, b) => a.price - b.price);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading packs:', err);
        this.error = 'Unable to load subscription plans';
        this.loading = false;
      }
    });
  }

  getDurationText(duration: string): string {
    return DurationDisplay[duration as keyof typeof DurationDisplay] || duration;
  }

  getMonthlyPrice(pack: Pack): number {
    const months = {
      'ONE_MONTH': 1,
      'THREE_MONTHS': 3,
      'SIX_MONTHS': 6,
      'ONE_YEAR': 12
    };
    return pack.price / (months[pack.duration] || 1);
  }

  isProfessional(pack: Pack): boolean {
    // Logique pour déterminer si c'est le pack "Most Popular"
    return pack.name.toLowerCase().includes('professional') || 
           pack.name.toLowerCase().includes('pro');
  }

  subscribe(pack: Pack): void {
    console.log('Subscribing to:', pack);
    // TODO: Implémenter la logique de souscription
    alert(`You selected: ${pack.name} - $${pack.price}`);
  }
}