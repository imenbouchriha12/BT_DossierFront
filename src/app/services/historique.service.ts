import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HistoriqueDto {
  id: number;
  tableModifiee: string;
  entiteId: number;
  action: string;
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
  utilisateurId: number;
  utilisateurNom: string;
  dateHeure: string;
}

export interface PagedHistoriqueResult {
  items: HistoriqueDto[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class HistoriqueService {
  private apiUrl = `${environment.apiUrl}/historique`;

  constructor(private http: HttpClient) {}

  search(params: {
    tableModifiee?: string;
    utilisateurNom?: string;
    action?: string;
    dateDebut?: string;
    dateFin?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedHistoriqueResult> {
    let httpParams = new HttpParams();
    if (params.tableModifiee) httpParams = httpParams.set('tableModifiee', params.tableModifiee);
    if (params.utilisateurNom) httpParams = httpParams.set('utilisateurNom', params.utilisateurNom);
    if (params.action) httpParams = httpParams.set('action', params.action);
    if (params.dateDebut) httpParams = httpParams.set('dateDebut', params.dateDebut);
    if (params.dateFin) httpParams = httpParams.set('dateFin', params.dateFin);
    httpParams = httpParams.set('page', (params.page ?? 1).toString());
    httpParams = httpParams.set('pageSize', (params.pageSize ?? 20).toString());
    return this.http.get<PagedHistoriqueResult>(this.apiUrl, { params: httpParams });
  }

  getTables(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tables`);
  }

  getActions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/actions`);
  }
}
