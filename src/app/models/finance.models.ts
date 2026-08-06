export interface CompteDto {
  id: number;
  idClient: number;
  numCompte: string;
  agence: string;
  devise: string;
  solde: number;
  soldeContreValeur: number;
  dateOuverture?: string | null;
  codeClient?: string;
  nomClient?: string;
}

export interface MouvementDto {
  id: number;
  numCompte: string;
  agence: string;
  montant: number;
  dateMvt: string;
  devMVT: string;
  sens: string;
}

export interface CoursDto {
  id: number;
  journee: string;
  devise: string;
  valeur: number;
  multiplicateur: number;
}

export interface CoursTempsReelDto {
  devise: string;
  nom: string;
  symbole: string;
  valeur: number;
  date: string | null;
}

export interface CompteTotalDto {
  devise: string;
  total: number;
  totalContreValeur: number;
  nombreComptes: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
