import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClientStatusReport {
  clientId: number;
  codeClient: string;
  statutActuel: string;
  documentsRequis: number;
  documentsValides: number;
  documentsEnAttente: number;
  documentsRejetes: number;
  documentsManquants: string[];
  peutEtreActif: boolean;
  derniereMiseAJour: string;
}

export interface BlockClientRequest {
  raison: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientStatusService {
  private apiUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  /**
   * Obtenir le rapport de statut détaillé d'un client
   */
  getStatusReport(clientId: number): Observable<ClientStatusReport> {
    return this.http.get<ClientStatusReport>(
      `${this.apiUrl}/${clientId}/clientstatus/report`
    );
  }

  /**
   * Obtenir la liste des documents manquants
   */
  getMissingDocuments(clientId: number): Observable<{ clientId: number; documentsManquants: string[] }> {
    return this.http.get<{ clientId: number; documentsManquants: string[] }>(
      `${this.apiUrl}/${clientId}/clientstatus/missing-documents`
    );
  }

  /**
   * Recalculer manuellement le statut d'un client
   */
  recalculateStatus(clientId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${clientId}/clientstatus/recalculate`,
      {}
    );
  }

  /**
   * Bloquer un client avec une raison
   */
  blockClient(clientId: number, raison: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${clientId}/clientstatus/block`,
      { raison }
    );
  }

  /**
   * Débloquer un client
   */
  unblockClient(clientId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${clientId}/clientstatus/unblock`,
      {}
    );
  }
}
