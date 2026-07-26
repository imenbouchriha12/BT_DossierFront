import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RequiredDocumentStatus {
  templateId: number;
  nomDocument: string;
  description?: string;
  estObligatoire: boolean;
  ordre: number;
  formatsAcceptes?: string;
  tailleMaxMo?: number;
  statut?: string;
  documentId?: number;
  dateUpload?: string;
}

export interface ClientPortalView {
  codeClient: string;
  nomComplet: string;
  typeClient: string;
  email: string;
  tauxCompletion: number;
  obligatoiresFournis: number;
  obligatoiresTotal: number;
  documents: RequiredDocumentStatus[];
}

export interface PortalUploadResult {
  documentId: number;
  nomDocument: string;
  typeDocument: string;
  statutValidation: string;
  dateUpload: string;
  message: string;
}

export interface GenerateLinkResponse {
  portalLink: string;
  dateExpiration: string;
  emailEnvoye: boolean;
  message: string;
}

export interface TokenInfo {
  id: number;
  idClient: number;
  codeClient: string;
  nomComplet: string;
  dateCreation: string;
  dateExpiration: string;
  estRevoque: boolean;
  nbAcces: number;
  dernierAcces?: string;
}

@Injectable({ providedIn: 'root' })
export class PortalService {
  private apiUrl = `${environment.apiUrl}/clientportal`;

  constructor(private http: HttpClient) {}

  getPortalView(token: string): Observable<ClientPortalView> {
    return this.http.get<ClientPortalView>(`${this.apiUrl}/portal/${token}`);
  }

  uploadDocument(token: string, typeDocument: string, file: File): Observable<PortalUploadResult> {
    const formData = new FormData();
    formData.append('typeDocument', typeDocument);
    formData.append('file', file);
    return this.http.post<PortalUploadResult>(`${this.apiUrl}/portal/${token}/upload`, formData);
  }

  generateLink(clientId: number, dureeJours: number = 7): Observable<GenerateLinkResponse> {
    return this.http.post<GenerateLinkResponse>(`${this.apiUrl}/${clientId}/invite`, { dureeJours });
  }

  getTokenInfo(clientId: number): Observable<{ hasActiveToken: boolean; token?: TokenInfo }> {
    return this.http.get<{ hasActiveToken: boolean; token?: TokenInfo }>(`${this.apiUrl}/${clientId}/token-info`);
  }

  revokeAccess(clientId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${clientId}/revoke`);
  }
}
