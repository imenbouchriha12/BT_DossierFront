import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import {
  MessageDto,
  ConversationDto,
  ConversationPagedDto,
  SendMessageDto,
  PieceJointeDto,
} from '../models/message.models';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/messages`;
  private baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  private hub?: signalR.HubConnection;

  recevoirMessage$ = new Subject<MessageDto>();
  mettreAJourNonLu$ = new Subject<number>();
  messagesLus$ = new Subject<{ userId: number }>();
  presenceChanged$ = new Subject<{ userId: number; enLigne: boolean }>();

  connect(): void {
    if (this.hub && (this.hub.state === signalR.HubConnectionState.Connected || this.hub.state === signalR.HubConnectionState.Connecting)) {
      return;
    }
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/hubs/messages`, {
        accessTokenFactory: () => this.auth.getToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    hub.on('RecevoirMessage', (msg: MessageDto) => this.recevoirMessage$.next(msg));
    hub.on('MettreAJourNonLu', (data: { totalNonLu: number }) => this.mettreAJourNonLu$.next(data.totalNonLu));
    hub.on('MessagesLus', (data: { userId: number }) => this.messagesLus$.next(data));
    hub.on('PresenceChanged', (data: { userId: number; enLigne: boolean }) => this.presenceChanged$.next(data));

    hub.start().catch(err => console.error('SignalR messagerie : échec de connexion', err));
    this.hub = hub;
  }

  disconnect(): void {
    if (this.hub) {
      this.hub.stop();
      this.hub = undefined;
    }
  }

  getConversations(): Observable<ConversationDto[]> {
    return this.http.get<ConversationDto[]>(`${this.apiUrl}/conversations`);
  }

  getMessages(userId: number, page = 1, pageSize = 100): Observable<ConversationPagedDto> {
    return this.http.get<ConversationPagedDto>(`${this.apiUrl}/avec/${userId}`, {
      params: { page, pageSize },
    });
  }

  send(dto: SendMessageDto): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${this.apiUrl}/envoyer`, dto);
  }

  uploadPieceJointe(file: File): Observable<PieceJointeDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<PieceJointeDto>(`${this.apiUrl}/upload`, formData);
  }

  getEnLigne(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/en-ligne`);
  }

  markRead(otherUserId: number): Observable<{ totalNonLu: number }> {
    return this.http.put<{ totalNonLu: number }>(`${this.apiUrl}/lire/${otherUserId}`, {});
  }

  getUnreadCount(): Observable<{ totalNonLu: number }> {
    return this.http.get<{ totalNonLu: number }>(`${this.apiUrl}/non-lu`);
  }
}
