import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiProject,
  MyProject,
  ProjectFile,
  Planning,
  Colonne,
  Tache,
  CreateColonneDto,
  CreateTacheDto,
} from '../models/my-project.model';

@Injectable({
  providedIn: 'root',
})
export class MyProjectsService {
  private apiUrl = 'http://localhost:8089/api';
  private projectsApiUrl = 'http://localhost:8063/api/projects';

  constructor(private http: HttpClient) {}

  // =============== PROJETS ===============

  getAllProjects(): Observable<ApiProject[]> {
    return this.http.get<ApiProject[]>(this.projectsApiUrl);
  }

  getMyProjects(clientEmail: string): Observable<ApiProject[]> {
    return this.http.get<ApiProject[]>(`${this.projectsApiUrl}/my`, { params: { clientEmail } });
  }

  getProjectById(id: number): Observable<ApiProject> {
    return this.http.get<ApiProject>(`${this.projectsApiUrl}/${id}`);
  }

  createProject(project: ApiProject): Observable<ApiProject> {
    return this.http.post<ApiProject>(this.projectsApiUrl, project);
  }

  createProjectAuto(project: ApiProject): Observable<ApiProject> {
    return this.http.post<ApiProject>(this.projectsApiUrl, project);
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.projectsApiUrl}/${id}`);
  }

  // =============== PROJECT FILES (moatez-service) ===============

  getProjectFiles(projectId: number): Observable<ProjectFile[]> {
    return this.http.get<ProjectFile[]>(`${this.apiUrl}/projects/${projectId}/files`);
  }

  uploadFile(projectId: number, file: File, userId: number): Observable<ProjectFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', String(userId));
    return this.http.post<ProjectFile>(`${this.apiUrl}/projects/${projectId}/files/upload`, formData);
  }

  downloadFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/projects/files/${fileId}/download`, {
      responseType: 'blob'
    });
  }

  deleteFile(fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projects/files/${fileId}`);
  }

  // =============== AI TASKS ===============

  generateTasksWithAI(projectId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/projects/${projectId}/tasks/generate`, {});
  }

  // =============== PLANNING ===============

  getPlanningByProjectId(projectId: number): Observable<Planning> {
    return this.http.get<Planning>(
      `${this.apiUrl}/plannings/projet/${projectId}`,
    ); // ← CORRIGÉ
  }

  createPlanning(projectId: number): Observable<Planning> {
    return this.http.post<Planning>(`${this.apiUrl}/plannings`, {
      idProjet: projectId,
    }); // ← CORRIGÉ
  }

  // =============== COLONNES ===============

  getColonnesByPlanningId(planningId: number): Observable<Colonne[]> {
    return this.http.get<Colonne[]>(
      `${this.apiUrl}/colonnes/planning/${planningId}`,
    );
  }

  createColonne(colonne: CreateColonneDto): Observable<Colonne> {
    return this.http.post<Colonne>(`${this.apiUrl}/colonnes`, colonne);
  }

  updateColonne(id: number, colonne: Partial<Colonne>): Observable<Colonne> {
    return this.http.put<Colonne>(`${this.apiUrl}/colonnes/${id}`, colonne);
  }

  deleteColonne(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/colonnes/${id}`);
  }

  // =============== TÂCHES ===============

  getTachesByColonneId(colonneId: number): Observable<Tache[]> {
    return this.http.get<Tache[]>(`${this.apiUrl}/taches/colonne/${colonneId}`);
  }

  createTache(tache: CreateTacheDto): Observable<Tache> {
    return this.http.post<Tache>(`${this.apiUrl}/taches`, tache);
  }

  updateTache(id: number, tache: Partial<Tache>): Observable<Tache> {
    return this.http.put<Tache>(`${this.apiUrl}/taches/${id}`, tache);
  }

  deleteTache(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/taches/${id}`);
  }

  moveTache(tacheId: number, newColonneId: number): Observable<Tache> {
    return this.http.put<Tache>(`${this.apiUrl}/taches/${tacheId}/move`, {
      idColonne: newColonneId,
    });
  }

  updateProject(id: number, project: ApiProject): Observable<ApiProject> {
  // ⚠️ Supprimer clientId avant d’envoyer au backend
  const { clientId, ...payload } = project;
  return this.http.put<ApiProject>(`${this.projectsApiUrl}/${id}`, payload);
}



}
