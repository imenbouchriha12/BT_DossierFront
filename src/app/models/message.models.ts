export interface MessageDto {
  id: number;
  expediteurUserId: number;
  expediteurNom?: string;
  destinataireUserId: number;
  destinataireNom?: string;
  contenu: string;
  pieceJointeUrl?: string | null;
  pieceJointeNom?: string | null;
  pieceJointeType?: string | null;
  dateEnvoi: string;
  lu: boolean;
  dateLecture?: string | null;
}

export interface ConversationDto {
  autreUserId: number;
  autreNom?: string;
  autreMatricule?: string;
  autreRole?: string;
  enLigne: boolean;
  dernierMessage?: string;
  derniereDate?: string | null;
  nonLu: number;
}

export interface ConversationPagedDto {
  items: MessageDto[];
  total: number;
}

export interface SendMessageDto {
  destinataireUserId: number;
  contenu: string;
  pieceJointeUrl?: string | null;
  pieceJointeNom?: string | null;
  pieceJointeType?: string | null;
}

export interface PieceJointeDto {
  url: string;
  nom: string;
  type: string;
}
