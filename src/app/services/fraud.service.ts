import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AlertesFraudeDto,
  AlertesFraudeSearchDto,
  AnalyseFraudeResultatDto,
  CreateRegleAntifraudeDto,
  FraudStatsDto,
  PagedAlertesDto,
  RegleAntifraudeDto,
  UpdateRegleAntifraudeDto,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class FraudService {
  private apiUrl = `${environment.apiUrl}/fraud`;

  constructor(private http: HttpClient) {}

  getAlertes(search: AlertesFraudeSearchDto): Observable<PagedAlertesDto> {
    let params = new HttpParams();
    if (search.idClient) params = params.set('idClient', search.idClient);
    if (search.statut) params = params.set('statut', search.statut);
    if (search.niveau) params = params.set('niveau', search.niveau);
    if (search.type) params = params.set('type', search.type);
    if (search.dateDebut) params = params.set('dateDebut', search.dateDebut);
    if (search.dateFin) params = params.set('dateFin', search.dateFin);
    params = params.set('page', search.page.toString());
    params = params.set('pageSize', search.pageSize.toString());
    return this.http.get<PagedAlertesDto>(`${this.apiUrl}/alertes`, { params });
  }

  getAlertesByClient(clientId: number): Observable<AlertesFraudeDto[]> {
    return this.http.get<AlertesFraudeDto[]>(`${this.apiUrl}/alertes/client/${clientId}`);
  }

  getAlerte(id: number): Observable<AlertesFraudeDto> {
    return this.http.get<AlertesFraudeDto>(`${this.apiUrl}/alertes/${id}`);
  }

  getStats(): Observable<FraudStatsDto> {
    return this.http.get<FraudStatsDto>(`${this.apiUrl}/stats`);
  }

  traiterAlerte(id: number, statut: string, commentaire?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/alertes/${id}/traiter`, { statut, commentaire });
  }

  analyserClient(clientId: number): Observable<AnalyseFraudeResultatDto> {
    return this.http.post<AnalyseFraudeResultatDto>(`${this.apiUrl}/analyser/${clientId}`, {});
  }

  analyserTous(): Observable<any> {
    return this.http.post(`${this.apiUrl}/analyser`, {});
  }

  getRegles(): Observable<RegleAntifraudeDto[]> {
    return this.http.get<RegleAntifraudeDto[]>(`${this.apiUrl}/regles`);
  }

  createRegle(dto: CreateRegleAntifraudeDto): Observable<RegleAntifraudeDto> {
    return this.http.post<RegleAntifraudeDto>(`${this.apiUrl}/regles`, dto);
  }

  updateRegle(id: number, dto: UpdateRegleAntifraudeDto): Observable<RegleAntifraudeDto> {
    return this.http.put<RegleAntifraudeDto>(`${this.apiUrl}/regles/${id}`, dto);
  }

  toggleRegle(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/regles/${id}/toggle`, {});
  }

  deleteRegle(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/regles/${id}`);
  }
}
