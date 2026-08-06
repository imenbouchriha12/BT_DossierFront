import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/notifications`;
  private baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  private hub?: signalR.HubConnection;
  recevoirNotification$ = new Subject<NotificationDto>();

  connect(): void {
    if (this.hub && (this.hub.state === signalR.HubConnectionState.Connected || this.hub.state === signalR.HubConnectionState.Connecting)) {
      return;
    }
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/hubs/notifications`, {
        accessTokenFactory: () => this.auth.getToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    hub.on('ReceiveNotification', (data: Partial<NotificationDto>) => {
      const notif: NotificationDto = {
        id: data.id ?? 0,
        userId: data.userId ?? 0,
        titre: data.titre ?? '',
        message: data.message ?? '',
        type: data.type ?? 'Info',
        lien: data.lien,
        estLu: data.estLu ?? false,
        dateCreation: data.dateCreation ?? new Date().toISOString(),
      };
      this.recevoirNotification$.next(notif);
    });

    hub.start().catch(err => console.error('SignalR notifications : échec de connexion', err));
    this.hub = hub;
  }

  disconnect(): void {
    if (this.hub) {
      this.hub.stop();
      this.hub = undefined;
    }
  }

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
