import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClientSearchItem {
  id: number;
  codeClient: string;
  nom: string;
  prenom: string;
  ville: string;
  statut: string;
}

export interface DocumentSearchItem {
  id: number;
  idClient: number;
  codeClient: string;
  nomClient: string;
  typeDocument: string;
  nomFichier: string;
  statutValidation: string;
}

export interface GlobalSearchResult {
  clients: ClientSearchItem[];
  documents: DocumentSearchItem[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private apiUrl = `${environment.apiUrl}/search`;

  constructor(private http: HttpClient) {}

  globalSearch(query: string, limit: number = 5): Observable<GlobalSearchResult> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());
    return this.http.get<GlobalSearchResult>(this.apiUrl, { params });
  }
}
