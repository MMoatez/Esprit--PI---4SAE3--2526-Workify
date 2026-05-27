import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormationService, Formation, Domain, Status } from '../formation/formation.service';

@Component({
  selector: 'app-formation-list',
  standalone: false,
  templateUrl: './formation-list.component.html',
  styleUrls: ['./formation-list.component.scss']
})
export class FormationListComponent implements OnInit {
  formations: Formation[] = [];
  filteredFormations: Formation[] = [];
  searchTerm: string = '';
  selectedDomain: Domain | 'ALL' = 'ALL';
  selectedStatus: Status | 'ALL' = 'ALL';
  domains = Object.values(Domain);
  statuses = Object.values(Status);

  constructor(private formationService: FormationService) { }

  ngOnInit(): void {
    this.loadFormations();
  }

  loadFormations(): void {
    this.formationService.getFormations().subscribe({
      next: (data) => {
        this.formations = data;
        this.applyFilters();
      },
      error: (err) => console.error('Error loading formations', err)
    });
  }

  applyFilters(): void {
    this.filteredFormations = this.formations.filter(f => {
      const matchesSearch = f.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        f.field.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesDomain = this.selectedDomain === 'ALL' || f.field === this.selectedDomain;
      const matchesStatus = this.selectedStatus === 'ALL' || f.status === this.selectedStatus;

      return matchesSearch && matchesDomain && matchesStatus;
    });
  }

  getDomainColor(domain: Domain): string {
    switch (domain) {
      case Domain.IT: return 'bg-blue-100 text-blue-700';
      case Domain.MARKETING: return 'bg-pink-100 text-pink-700';
      case Domain.DESIGN_CREATION: return 'bg-purple-100 text-purple-700';
      case Domain.SECURITY_NETWORK: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }
}
