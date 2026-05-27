import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FormationService, Formation, Domain, Status } from '../../../../modules/formation/formation/formation.service';

@Component({
  selector: 'app-formation-admin',
  standalone: false,
  templateUrl: './formation-admin.component.html',
  styleUrls: ['./formation-admin.component.scss']
})
export class FormationAdminComponent implements OnInit {
  formations: Formation[] = [];
  formationForm: FormGroup;
  showForm = false;
  editingId: number | null = null;
  domains = Object.values(Domain);
  statuses = Object.values(Status);
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private formationService: FormationService,
    private router: Router
  ) {
    this.formationForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      field: [Domain.IT, [Validators.required]],
      level: [1, [Validators.required, Validators.min(1)]],
      status: [Status.ONLINE, [Validators.required]],
      period: ['', [Validators.required]],
      googleMeetLink: [''],
      address: [''],
      idPackFk: [null]
    });
  }

  ngOnInit(): void {
    this.loadFormations();
  }

  loadFormations(): void {
    this.formationService.getFormations().subscribe({
      next: (data) => this.formations = data,
      error: (err) => console.error('Error loading formations', err)
    });
  }

  onSubmit(): void {
    if (this.formationForm.invalid) return;

    this.loading = true;
    this.successMessage = null;
    this.errorMessage = null;

    const formationData = this.formationForm.value;

    if (this.editingId) {
      this.formationService.updateFormation(this.editingId, formationData).subscribe({
        next: () => {
          this.handleSuccess('Course updated successfully!');
          this.loadFormations();
        },
        error: (err) => this.handleError('Error during update.')
      });
    } else {
      this.formationService.createFormation(formationData).subscribe({
        next: (newFormation) => {
          this.handleSuccess('Course created successfully! Redirecting to content management...');
          setTimeout(() => {
            this.router.navigate(['/admin/formations', newFormation.id, 'content']);
          }, 1500);
        },
        error: (err) => this.handleError('Error during creation.')
      });
    }
  }

  editFormation(formation: Formation): void {
    this.editingId = formation.id || null;
    this.formationForm.patchValue(formation);
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteFormation(id: number): void {
    if (confirm('Are you sure you want to delete this course?')) {
      this.formationService.deleteFormation(id).subscribe({
        next: () => this.loadFormations(),
        error: (err) => alert('Error during deletion.')
      });
    }
  }

  resetForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.formationForm.reset({
      field: Domain.IT,
      level: 1,
      status: Status.ONLINE
    });
  }

  private handleSuccess(msg: string): void {
    this.loading = false;
    this.successMessage = msg;
    setTimeout(() => this.resetForm(), 2000);
  }

  private handleError(msg: string): void {
    this.loading = false;
    this.errorMessage = msg;
  }
}
