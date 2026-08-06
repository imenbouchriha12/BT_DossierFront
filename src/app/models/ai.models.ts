// ============ Modèles IA : fraude, risque et assistant ============

// ----- Règles antifraude -----
export interface RegleAntifraudeDto {
  id: number;
  code: string;
  nom: string;
  description?: string;
  type: string;
  seuil: number;
  seuilSecondaire?: number;
  periodeJours: number;
  poids: number;
  actif: boolean;
  priorite: number;
  dateCreation: string;
}

export interface CreateRegleAntifraudeDto {
  code: string;
  nom: string;
  description?: string;
  type: string;
  seuil: number;
  seuilSecondaire?: number;
  periodeJours: number;
  poids: number;
  actif: boolean;
  priorite: number;
}

export interface UpdateRegleAntifraudeDto {
  code?: string;
  nom?: string;
  description?: string;
  type?: string;
  seuil?: number;
  seuilSecondaire?: number;
  periodeJours?: number;
  poids?: number;
  actif?: boolean;
  priorite?: number;
}

// ----- Alertes fraude -----
export interface AlertesFraudeDto {
  id: number;
  idClient: number;
  codeClient: string;
  nomClient: string;
  idRegle?: number;
  nomRegle?: string;
  idMouvement?: number;
  numCompte?: string;
  agence?: string;
  montant?: number;
  type: string;
  niveau: string;
  score: number;
  description: string;
  statut: string;
  donneesJson?: string;
  dateDetection: string;
  traiteeParUserId?: number;
  dateTraitement?: string;
  commentaire?: string;
}

export interface AlertesFraudeSearchDto {
  idClient?: number;
  statut?: string;
  niveau?: string;
  type?: string;
  dateDebut?: string;
  dateFin?: string;
  page: number;
  pageSize: number;
}

export interface PagedAlertesDto {
  items: AlertesFraudeDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnalyseFraudeResultatDto {
  idClient: number;
  alertesCrees: number;
  alertesExistantes: number;
  alertes: {
    type: string;
    niveau: string;
    score: number;
    description: string;
    numCompte?: string;
    montant?: number;
  }[];
}

export interface FraudStatsDto {
  totalAlertes: number;
  alertesActives: number;
  critique: number;
  haute: number;
  moyenne: number;
  traitees: number;
}

// ----- Score de risque -----
export interface ComposantRisqueDto {
  code: string;
  libelle: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface RapportRisqueDto {
  idClient: number;
  score: number;
  niveau: string;
  synthese: string;
  dateCalcul: string;
  composants: ComposantRisqueDto[];
}

export interface ScoreRisqueDto {
  id: number;
  idClient: number;
  score: number;
  niveau: string;
  composantsJson?: string;
  synthese: string;
  dateCalcul: string;
}

export interface HistoriqueRisqueDto {
  items: ScoreRisqueDto[];
  total: number;
}

// ----- Assistant IA -----
export interface ChatRequestDto {
  message: string;
  clientId?: number;
}

export interface DonneeContextuelleDto {
  type: string;
  libelle: string;
  valeur: string;
}

export interface ChatResponseDto {
  reponse: string;
  mode: string;
  contexte?: DonneeContextuelleDto[];
}

export interface ClientSummaryDto {
  idClient: number;
  codeClient: string;
  nomComplet: string;
  typeClient?: string;
  statut: string;
  soldeTotal: number;
  nbComptes: number;
  nbDocumentsManquants: number;
  nbAlertesActives: number;
  niveauRisque?: string;
  scoreRisque?: number;
  resume: string;
  mode: string;
}
