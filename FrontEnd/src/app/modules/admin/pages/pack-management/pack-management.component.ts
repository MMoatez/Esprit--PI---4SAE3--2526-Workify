import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PackService } from '../../../../core/services/pack.service';
import { Pack, Duration, UserType, DurationDisplay, PackOption } from '../../../../core/models/pack.model';

@Component({
  standalone: false,
  selector: 'app-pack-management',
  templateUrl: './pack-management.component.html',
})
export class PackManagementComponent implements OnInit {
  packs: Pack[] = [];
  loading = false;
  error = '';
  successMessage = '';
  searchTerm = '';
  userTypeFilter: 'ALL' | UserType = 'ALL';

  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  deleteConfirmId: number | null = null;

  durations = Object.values(Duration);
  userTypes = Object.values(UserType);
  durationDisplay = DurationDisplay;

  form: Pack = this.emptyForm();

  constructor(private packService: PackService) {}

  ngOnInit(): void { this.loadPacks(); }

  loadPacks(): void {
    this.loading = true;
    this.packService.getAllPacks().subscribe({
      next: (packs) => { this.packs = packs; this.loading = false; },
      error: () => { this.error = 'Failed to load packs.'; this.loading = false; }
    });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.isEditing = false;
    this.editingId = null;
    this.showForm = true;
    this.clearMessages();
  }

  openEdit(pack: Pack): void {
    const defaultOptions = this.buildDefaultOptions();
    const existingOptions = pack.options || [];
    const mergedOptions = defaultOptions.map(def => {
      const existing = existingOptions.find(o => o.duration === def.duration);
      return existing ? { ...existing } : def;
    });
    this.form = { ...pack, features: pack.features.map(f => ({ ...f })), options: mergedOptions };
    this.isEditing = true;
    this.editingId = pack.id!;
    this.showForm = true;
    this.clearMessages();
  }

  cancelForm(): void { this.showForm = false; this.clearMessages(); }

  submitForm(): void {
    this.clearMessages();
    if (!this.hasAtLeastOneActiveOption(this.form.options ?? [])) {
      this.error = 'At least one duration must be active.';
      return;
    }
    const req$ = this.isEditing && this.editingId !== null
      ? this.packService.updatePack(this.editingId, this.form)
      : this.packService.createPack(this.form);
    req$.subscribe({
      next: () => {
        this.successMessage = this.isEditing ? 'Pack updated.' : 'Pack created.';
        this.showForm = false;
        this.loadPacks();
      },
      error: (err: HttpErrorResponse) => {
        this.error = err?.error?.message || err?.error || 'Operation failed.';
      }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId = id; }
  cancelDelete(): void { this.deleteConfirmId = null; }

  deletePack(id: number): void {
    this.clearMessages();
    this.packService.deletePack(id).subscribe({
      next: () => { this.successMessage = 'Pack deleted.'; this.deleteConfirmId = null; this.loadPacks(); },
      error: () => { this.error = 'Failed to delete pack.'; }
    });
  }

  addFeature(): void { this.form.features.push({ text: '' }); }
  removeFeature(i: number): void { this.form.features.splice(i, 1); }
  trackByIndex(i: number): number { return i; }

  get filteredPacks(): Pack[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.packs.filter(p =>
      (!term || p.name.toLowerCase().includes(term)) &&
      (this.userTypeFilter === 'ALL' || p.userType === this.userTypeFilter)
    );
  }

  get userTypeFilterOptions(): Array<'ALL' | UserType> { return ['ALL', ...this.userTypes]; }
  get totalPacks(): number { return this.packs.length; }
  get totalActiveDurations(): number {
    return this.packs.reduce((s, p) => s + (p.options || []).filter(o => o.active).length, 0);
  }
  get activeOptionsCountGlobal(): number { return this.totalActiveDurations; }
  get inactiveOptionsCountGlobal(): number {
    return this.packs.reduce((s, p) => s + (p.options || []).filter(o => !o.active).length, 0);
  }
  get activeOptionRate(): number {
    const total = this.activeOptionsCountGlobal + this.inactiveOptionsCountGlobal;
    return total === 0 ? 0 : (this.activeOptionsCountGlobal / total) * 100;
  }
  get topUserType(): UserType | null {
    const sorted = this.userTypes.map(t => ({ type: t, count: this.packs.filter(p => p.userType === t).length }))
      .sort((a, b) => b.count - a.count);
    return sorted.length && sorted[0].count > 0 ? sorted[0].type : null;
  }
  get topUserTypeCount(): number {
    return this.topUserType ? this.packs.filter(p => p.userType === this.topUserType).length : 0;
  }
  get durationBars(): { label: string; value: number; percent: number }[] {
    const counts = this.durations.map(d => ({
      label: this.durationDisplay[d],
      value: this.packs.filter(p => (p.options || []).some(o => o.duration === d && o.active)).length
    }));
    const max = Math.max(...counts.map(c => c.value), 1);
    return counts.map(c => ({ ...c, percent: (c.value / max) * 100 }));
  }

  getOption(pack: Pack, duration: Duration): PackOption | undefined {
    return (pack.options || []).find(o => o.duration === duration);
  }
  onOptionActiveChange(option: PackOption): void { if (!option.active) option.price = 0; }
  activeOptionsCount(pack: Pack): number { return (pack.options || []).filter(o => o.active).length; }

  private emptyForm(): Pack {
    return { name: '', description: '', userType: UserType.FREELANCER, features: [], options: this.buildDefaultOptions() };
  }
  private buildDefaultOptions(): PackOption[] {
    return this.durations.map(d => ({ duration: d, price: 0, active: d === Duration.ONE_MONTH }));
  }
  private hasAtLeastOneActiveOption(options: PackOption[]): boolean { return options.some(o => o.active); }
  private clearMessages(): void { this.error = ''; this.successMessage = ''; }
}
