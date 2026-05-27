import { Injectable } from '@angular/core';
import { ApiProject } from '../models/my-project.model';

const STORAGE_KEY = 'workify_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {

  // ── Charger tous les favoris ────────────────────────
  getAll(): ApiProject[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // ── Vérifier si un projet est en favori ─────────────
  isFavorite(projectId: number): boolean {
    return this.getAll().some(p => p.id === projectId);
  }

  // ── Ajouter aux favoris ─────────────────────────────
  add(project: ApiProject): void {
    const favorites = this.getAll();
    if (!favorites.some(p => p.id === project.id)) {
      favorites.unshift(project);
      this.save(favorites);
    }
  }

  // ── Retirer des favoris ─────────────────────────────
  remove(projectId: number): void {
    const updated = this.getAll().filter(p => p.id !== projectId);
    this.save(updated);
  }

  // ── Toggle ──────────────────────────────────────────
  toggle(project: ApiProject): boolean {
    if (this.isFavorite(project.id!)) {
      this.remove(project.id!);
      return false; // retiré
    } else {
      this.add(project);
      return true;  // ajouté
    }
  }

  // ── Compter ─────────────────────────────────────────
  count(): number {
    return this.getAll().length;
  }

  // ── Vider tous les favoris ──────────────────────────
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private save(favorites: ApiProject[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      console.error('localStorage quota exceeded');
    }
  }
}