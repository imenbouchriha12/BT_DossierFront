import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationDto {
  id: number;
  userId: number;
  titre: string;
  message: string;
  type: string;
  lien?: string;
  estLu: boolean;
  dateCreation: string;
}

export interface NotificationCountDto {
  totalNonLu: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getAll(page: number = 1, pageSize: number = 20): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(this.apiUrl, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getNonLuCount(): Observable<NotificationCountDto> {
    return this.http.get<NotificationCountDto>(`${this.apiUrl}/non-lu/count`);
  }

  markAsLu(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/lu`, {});
  }

  markAllAsLu(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/marquer-tout-lu`, {});
  }
}
