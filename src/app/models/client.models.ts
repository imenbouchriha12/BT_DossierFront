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
  typeClient?: string;
  matriculeFiscal?: string;
  registreCommerce?: string;
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
  typeClient?: string;
  matriculeFiscal?: string;
  registreCommerce?: string;
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
  typeClient?: string;
  matriculeFiscal?: string;
  registreCommerce?: string;
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
  typeClient?: string;
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
  repartitionType: TypeStat[];
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

export interface TypeStat {
  type: string;
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
}

export interface CreateDocumentDto {
  idClient: number;
  typeDocument: string;
}

export interface EtapeValidationDto {
  id: number;
  idWorkflow: number;
  ordre: number;
  roleRequis: string;
  libelle: string;
  statut: string; // EnAttente | Valide | Rejete | NonApplicable
  userId?: number;
  nomUser?: string;
  decisionDate?: string;
  commentaire?: string;
}

export interface WorkflowValidationDto {
  id: number;
  idDocument: number;
  statutGlobal: string; // EnCours | Valide | Rejete
  etapeCourante?: string;
  motifRejet?: string;
  createdByUserId?: number;
  dateCreation: string;
  dateMaj: string;
  etapes: EtapeValidationDto[];
  typeDocument?: string;
  nomFichier?: string;
  statutValidation?: string;
  idClient?: number;
  codeClient?: string;
  nomClient?: string;
  uploadedByNom?: string;
}

export interface WorkflowStatsDto {
  totalEnAttente: number;
  parRole: { [role: string]: number };
}

export interface EvenementClientDto {
  id: number;
  idClient: number;
  type: string; // Client | Document | Statut | Compte | Rappel | Note | Contact | Workflow
  message: string;
  donneesJson?: string;
  utilisateurId?: number;
  utilisateurNom?: string;
  dateEvenement: string;
  idLien?: number;
  typeLien?: string;
}

export interface NoteClientDto {
  id: number;
  idClient: number;
  titre?: string;
  contenu: string;
  categorie: string;
  creeParUserId: number;
  creeParNom?: string;
  dateCreation: string;
  modifieParUserId?: number;
  modifieParNom?: string;
  dateMaj?: string;
  estEpinglee: boolean;
}

export interface ContactClientDto {
  id: number;
  idClient: number;
  typeContact: string; // Conjoint | Garant | Reference | Heritier | Autre
  nom: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  relation?: string;
  dateCreation: string;
}
