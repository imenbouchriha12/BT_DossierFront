import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HistoriqueRisqueDto, RapportRisqueDto, ScoreRisqueDto } from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class RiskService {
  private apiUrl = `${environment.apiUrl}/risk`;

  constructor(private http: HttpClient) {}

  getRapport(clientId: number): Observable<RapportRisqueDto> {
    return this.http.get<RapportRisqueDto>(`${this.apiUrl}/${clientId}/rapport`);
  }

  calculer(clientId: number): Observable<RapportRisqueDto> {
    return this.http.post<RapportRisqueDto>(`${this.apiUrl}/${clientId}/calculer`, {});
  }

  getHistorique(clientId: number, page = 1, pageSize = 50): Observable<HistoriqueRisqueDto> {
    return this.http.get<HistoriqueRisqueDto>(`${this.apiUrl}/${clientId}/historique`, {
      params: { page, pageSize },
    });
  }

  getRapportsPourClients(idClients: number[]): Observable<ScoreRisqueDto[]> {
    return this.http.post<ScoreRisqueDto[]>(`${this.apiUrl}/rapports`, idClients);
  }
}
