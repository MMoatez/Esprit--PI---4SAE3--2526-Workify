// Projet
export interface MyProject {
  id?: number;
  name: string;
  planning?: Planning;
}

export interface ApiProject {
  id: number;
  title: string | null;
  shortDescription: string | null;
  detailedDescription: string | null;
  category: string | null;
  budget: number | null;
  estimatedDuration?: number | null;
  complexity?: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientId: number | null;
  createdAt: string | null;
  status: string | null;
}

// Planning
export interface Planning {
  id?: number;
  idProjet?: number;
  creationDate?: string;
  colonnes: Colonne[];
}

// Colonne (comme Todo, In Progress, Done)
export interface Colonne {
  id?: number;
  idPlanning?: number;
  name: string;
  color: string;
  description?: string;
  taches: Tache[];
}

// Tâche
export interface Tache {
  id?: number;
  task: string;
  idColonne?: number;
}

// DTO pour créer une colonne
export interface CreateColonneDto {
  idPlanning: number;
  name: string;
  color: string;
  description?: string;
}

// DTO pour créer une tâche
export interface CreateTacheDto {
  task: string;
  idColonne: number;
}

// Enums
export enum ProjectStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectCategory {
  APPLICATION_MOBILE = 'APPLICATION_MOBILE',
  SITE_WEB = 'SITE_WEB',
  ECOMMERCE = 'ECOMMERCE',
  DEVELOPPEMENT_SPECIFIQUE = 'DEVELOPPEMENT_SPECIFIQUE',
  DESIGN_GRAPHISME = 'DESIGN_GRAPHISME',
  MARKETING = 'MARKETING',
  VIDEO = 'VIDEO',
  FORMATION = 'FORMATION',
  AUTRE = 'AUTRE',
}
