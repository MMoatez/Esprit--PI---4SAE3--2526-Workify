import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { RecommendationService } from './recommendation.service';
import {
  RecommendResponse,
  PaletteDetails,
  InterfaceRecommandation
} from './recommendation.model';

type TabKey = 'interfaces' | 'palettes' | 'projets' | 'web';

@Component({
  selector: 'app-recommendation',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './recommendation.component.html',
  styleUrls: ['./recommendation.component.css']
})
export class RecommendationComponent {

  private svc = inject(RecommendationService);

  // =========================
  // FORM DATA
  // =========================
  description = '';
  motsCles: string[] = [];
  tags: string[] = [];
  audienceCible = '';
  interfacesExistantes: string[] = [];
  topK = 5;
  webTopK = 5;

  // =========================
  // UI STATE
  // =========================
  isLoading = false;
  errorMessage = '';
  response: RecommendResponse | null = null;
  activeTab: TabKey = 'interfaces';
  isDark = false;

  // Modal
  selectedInterface: InterfaceRecommandation | null = null;

  // =========================
  // TABS
  // =========================
  tabs = [
    { key: 'interfaces' as TabKey, label: 'Interfaces' },
    { key: 'palettes' as TabKey, label: 'Palettes' },
    { key: 'projets' as TabKey, label: 'Projects' },
    { key: 'web' as TabKey, label: 'Web Insights' }
  ];

  // =========================
  // PLACEHOLDER IMAGES
  // =========================
  projectImages: Record<string, string> = {
    'GreenCart': 'https://placehold.co/900x520/2E7D32/ffffff?text=GreenCart+UI',
    'FinTrack Pro': 'https://placehold.co/900x520/0D2B55/ffffff?text=FinTrack+Pro+UI',
    'LearnSphere': 'https://placehold.co/900x520/6C3CE1/ffffff?text=LearnSphere+UI',
    'ArchiSpace': 'https://placehold.co/900x520/2D2D2D/ffffff?text=ArchiSpace+UI',
    'MediConnect': 'https://placehold.co/900x520/E53935/ffffff?text=MediConnect+UI',
    'ShiftDesk': 'https://placehold.co/900x520/F57C00/ffffff?text=ShiftDesk+UI',
  };

  // =========================
  // THEME
  // =========================
  toggleTheme(): void {
    this.isDark = !this.isDark;
  }

  // =========================
  // MODAL
  // =========================
  openPreview(iface: InterfaceRecommandation): void {
    this.selectedInterface = iface;
  }

  closePreview(): void {
    this.selectedInterface = null;
  }

  // =========================
  // IMAGE UTILITY
  // =========================
  getProjectImage(name: string): string {
    return this.projectImages[name]
      ?? 'https://placehold.co/900x520/94a3b8/ffffff?text='
      + encodeURIComponent(name + ' UI');
  }

  // =========================
  // TAGS
  // =========================
  addTag(event: KeyboardEvent, array: string[], input: HTMLInputElement): void {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const value = input.value.trim();

    if (value && !array.includes(value)) {
      array.push(value);
    }

    input.value = '';
  }

  removeTag(array: string[], index: number): void {
    array.splice(index, 1);
  }

  // =========================
  // TABS
  // =========================
  showTab(tab: TabKey): void {
    this.activeTab = tab;
  }

  getTabIndex(): number {
    return this.tabs.findIndex(t => t.key === this.activeTab);
  }

  getTabCount(): number {
    return this.tabs.length;
  }

  // =========================
  // SCORE UTILS
  // =========================
  getBarWidth(score: number): string {
    if (!this.response?.interfaces_recommandees?.length) return '0%';

    return this.svc.getBarWidth(
      score,
      this.svc.getMaxScore(this.response.interfaces_recommandees)
    );
  }

  getScorePercent(score: number): number {
    return this.svc.getScorePercent(score);
  }

  getCircleDashOffset(score: number): number {
    const circumference = 2 * Math.PI * 22;
    return circumference - (circumference * this.getScorePercent(score)) / 100;
  }

  // =========================
  // PALETTE
  // =========================
  getPaletteColors(palette: PaletteDetails) {
    return this.svc.getPaletteColors(palette);
  }

  // =========================
  // SUBMIT
  // =========================
  recommend(): void {

    this.response = null;
    this.errorMessage = '';

    if (!this.description.trim()) {
      this.errorMessage = 'La description est obligatoire.';
      return;
    }

    this.isLoading = true;

    this.svc.recommend({
      description: this.description,
      mots_cles: [...this.motsCles],
      tags: [...this.tags],
      audience_cible: this.audienceCible,
      interfaces_existantes: [...this.interfacesExistantes],
      top_k: this.topK,
      web_top_k: this.webTopK
    }).subscribe({

      next: (data) => {

        // 🔥 tri automatique décroissant
        data.interfaces_recommandees?.sort((a, b) => b.score - a.score);
        data.projets_similaires?.sort((a, b) => b.score - a.score);

        this.response = data;
        this.isLoading = false;
        this.activeTab = 'interfaces';
      },

      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          'Erreur serveur. Vérifiez Spring Boot et FastAPI.';
        this.isLoading = false;
      }
    });
  }
}