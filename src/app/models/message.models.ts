export interface MessageDto {
  id: number;
  expediteurUserId: number;
  expediteurNom?: string;
  destinataireUserId: number;
  destinataireNom?: string;
  contenu: string;
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
}
