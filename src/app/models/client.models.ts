export interface DetailClientDto {
  id: number;
  profession: string;
  employeur: string;
  secteurActivite: string;
  revenuMensuel: number;
  situationFamiliale: string;
  typeResidence: string;
}

export interface ClientDto {
  id: number;
  codeClient: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
  nationalite: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  dateCreation: string;
  statut: string;
  estArchive: boolean;
  motifBlocage?: string;
  detail?: DetailClientDto;
}

export interface CreateClientDto {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
  nationalite: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  statut: string;
  detail?: CreateDetailClientDto;
}

export interface CreateDetailClientDto {
  profession: string;
  employeur: string;
  secteurActivite: string;
  revenuMensuel: number;
  situationFamiliale: string;
  typeResidence: string;
}

export interface UpdateClientDto {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
  nationalite: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  statut: string;
  detail?: UpdateDetailClientDto;
}

export interface UpdateDetailClientDto {
  profession: string;
  employeur: string;
  secteurActivite: string;
  revenuMensuel: number;
  situationFamiliale: string;
  typeResidence: string;
}

export interface ClientSearchDto {
  codeClient?: string;
  nom?: string;
  prenom?: string;
  ville?: string;
  statut?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClientStatsDto {
  totalClients: number;
  clientsActifs: number;
  clientsEnAttente: number;
  clientsBloques: number;
  nouveauxClientsMois: number;
  hommes: number;
  femmes: number;
  totalDocuments: number;
  documentsValides: number;
  documentsEnAttente: number;
  documentsRejetes: number;
  repartitionVille: VilleStat[];
  repartitionStatut: StatutStat[];
  creationsParMois: CreationMois[];
  clientsRecents: ClientRecentsItem[];
  documentsRecents: DocumentRecentsItem[];
}

export interface DocumentRecentsItem {
  id: number;
  typeDocument: string;
  nomFichier: string;
  statutValidation: string;
  codeClient: string;
  nomClient: string;
  dateAjout: string;
}

export interface ClientRecentsItem {
  id: number;
  codeClient: string;
  nom: string;
  prenom: string;
  ville: string;
  dateCreation: string;
}

export interface VilleStat {
  ville: string;
  count: number;
}

export interface StatutStat {
  statut: string;
  count: number;
}

export interface CreationMois {
  mois: string;
  count: number;
}

export interface DocumentDto {
  id: number;
  idClient: number;
  typeDocument: string;
  nomFichier: string;
  cheminFichier: string;
  dateAjout: string;
  statutValidation: string;
  codeClient?: string;
  nomClient?: string;
  texteExtrait?: string;
  donneesExtraites?: string;
  scoreConfiance?: number;
  dateVerificationOCR?: string;
  resultatVerification?: string;
}

export interface OcrResultDto {
  texteExtrait: string;
  donneesExtraitesJson?: string;
  scoreConfiance: number;
  resultatVerification: string;
  champsExtraits: { [key: string]: string };
  champsComparees: { [key: string]: ComparisonResult };
}

export interface ComparisonResult {
  valeurAttendue: string;
  valeurExtraite: string;
  correspond: boolean;
}

export interface CreateDocumentDto {
  idClient: number;
  typeDocument: string;
}
