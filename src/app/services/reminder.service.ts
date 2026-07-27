import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReminderDto {
  id: number;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
  completedAt?: string;
  clientId?: number;
  clientName?: string;
  clientCode?: string;
  assignedToUserId?: number;
  assignedToUserName?: string;
  createdByUserId: number;
  createdByUserName?: string;
  dateCreation: string;
}

export interface CreateReminderDto {
  title: string;
  description?: string;
  type: string;
  priority: string;
  dueDate: string;
  clientId?: number;
  assignedToUserId?: number;
}

export interface UpdateReminderDto {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  assignedToUserId?: number;
}

export interface ReminderFilterDto {
  type?: string;
  priority?: string;
  status?: string;
  clientId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReminderStatsDto {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  urgent: number;
}

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private apiUrl = `${environment.apiUrl}/reminders`;

  constructor(private http: HttpClient) {}

  getAll(page = 1, pageSize = 50): Observable<ReminderDto[]> {
    return this.http.get<ReminderDto[]>(this.apiUrl, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getFiltered(filter: ReminderFilterDto): Observable<ReminderDto[]> {
    let params = new HttpParams();
    if (filter.type) params = params.set('type', filter.type);
    if (filter.priority) params = params.set('priority', filter.priority);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.clientId) params = params.set('clientId', filter.clientId.toString());
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    return this.http.get<ReminderDto[]>(`${this.apiUrl}/filtered`, { params });
  }

  getStats(): Observable<ReminderStatsDto> {
    return this.http.get<ReminderStatsDto>(`${this.apiUrl}/stats`);
  }

  getById(id: number): Observable<ReminderDto> {
    return this.http.get<ReminderDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateReminderDto): Observable<ReminderDto> {
    return this.http.post<ReminderDto>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateReminderDto): Observable<ReminderDto> {
    return this.http.put<ReminderDto>(`${this.apiUrl}/${id}`, dto);
  }

  complete(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/complete`, {});
  }

  getTeamFiltered(filter: ReminderFilterDto): Observable<ReminderDto[]> {
    let params = new HttpParams();
    if (filter.type) params = params.set('type', filter.type);
    if (filter.priority) params = params.set('priority', filter.priority);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.clientId) params = params.set('clientId', filter.clientId.toString());
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    return this.http.get<ReminderDto[]>(`${this.apiUrl}/team`, { params });
  }

  getTeamStats(): Observable<ReminderStatsDto> {
    return this.http.get<ReminderStatsDto>(`${this.apiUrl}/team/stats`);
  }

  getAssignedToMe(filter: ReminderFilterDto): Observable<ReminderDto[]> {
    let params = new HttpParams();
    if (filter.type) params = params.set('type', filter.type);
    if (filter.priority) params = params.set('priority', filter.priority);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.clientId) params = params.set('clientId', filter.clientId.toString());
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    return this.http.get<ReminderDto[]>(`${this.apiUrl}/assigned-to-me`, { params });
  }

  sign(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/sign`, {});
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status });
  }

  createFromDocument(clientId: number, title: string): Observable<ReminderDto> {
    return this.http.post<ReminderDto>(`${this.apiUrl}/from-document`, { clientId, title });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
