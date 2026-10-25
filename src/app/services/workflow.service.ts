import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WorkflowValidationDto, PagedResult, WorkflowStatsDto } from '../models/client.models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private apiUrl = `${environment.apiUrl}/workflow`;

  constructor(private http: HttpClient) {}

  getByDocument(documentId: number): Observable<WorkflowValidationDto | null> {
    return this.http.get<WorkflowValidationDto>(`${this.apiUrl}/document/${documentId}`);
  }

  getByDocuments(documentIds: number[]): Observable<WorkflowValidationDto[]> {
    const params = new HttpParams().set('ids', documentIds.join(','));
    return this.http.get<WorkflowValidationDto[]>(`${this.apiUrl}/by-documents`, { params });
  }

  getHistory(documentId: number): Observable<WorkflowValidationDto[]> {
    return this.http.get<WorkflowValidationDto[]>(`${this.apiUrl}/document/${documentId}/history`);
  }

  getEnAttente(page: number = 1, pageSize: number = 10): Observable<PagedResult<WorkflowValidationDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PagedResult<WorkflowValidationDto>>(`${this.apiUrl}/en-attente`, { params });
  }

  getEnAttenteCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/en-attente/count`);
  }

  getStats(): Observable<WorkflowStatsDto> {
    return this.http.get<WorkflowStatsDto>(`${this.apiUrl}/stats`);
  }

  getById(id: number): Observable<WorkflowValidationDto> {
    return this.http.get<WorkflowValidationDto>(`${this.apiUrl}/${id}`);
  }

  valider(id: number, commentaire?: string, derogation = false): Observable<WorkflowValidationDto> {
    return this.http.post<WorkflowValidationDto>(`${this.apiUrl}/${id}/valider`, { commentaire, derogation });
  }

  rejeter(id: number, commentaire: string, derogation = false): Observable<WorkflowValidationDto> {
    return this.http.post<WorkflowValidationDto>(`${this.apiUrl}/${id}/rejeter`, { commentaire, derogation });
  }

  relancer(id: number, commentaire?: string): Observable<WorkflowValidationDto> {
    return this.http.post<WorkflowValidationDto>(`${this.apiUrl}/${id}/relancer`, { commentaire });
  }
}
