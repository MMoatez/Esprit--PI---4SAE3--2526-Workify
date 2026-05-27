// =============================
// REQUEST
// =============================
export interface RecommendRequest {
  description: string;
  mots_cles: string[];
  tags: string[];
  audience_cible: string;
  interfaces_existantes: string[];
  top_k: number;
  web_top_k?: number; // optionnel si utilisé côté backend
}


// =============================
// INTERFACES RECOMMANDÉES
// =============================
export interface InterfaceRecommandation {
  nom: string;
  type: string;
  description: string;
  score: number;
  sources?: string[]; // mieux que string[] | null
}


// =============================
// PALETTE COLORS
// =============================
export interface PaletteColorEntry {
  nom?: string;
  hex?: string;
  usage?: string;
}


// =============================
// PALETTE DETAILS
// =============================
export interface PaletteDetails {
  primaire?: string;
  secondaire?: string;
  accent?: string;
  fond?: string;
  texte?: string;
  style_visuel?: string;
  ambiance?: string;
  raw?: { [key: string]: PaletteColorEntry };
}


// =============================
// PALETTE RECOMMANDATION
// =============================
export interface PaletteRecommandation {
  palette: PaletteDetails;
  score: number;
  projets?: string[];
}


// =============================
// PROJETS SIMILAIRES
// =============================
export interface ProjetSimilaire {
  proj_id: string;
  nom: string;
  domaine: string;
  score: number;
}


// =============================
// WEB PROJECTS (NOUVEAU)
// =============================
export interface WebProjectSimilaire {
  title: string;
  url: string;
  snippet: string;
  source: string;
}


// =============================
// RESPONSE GLOBALE
// =============================
export interface RecommendResponse {
  interfaces_recommandees: InterfaceRecommandation[];
  palettes_recommandees: PaletteRecommandation[];
  projets_similaires: ProjetSimilaire[];
  web_projects_similaires?: WebProjectSimilaire[];
}