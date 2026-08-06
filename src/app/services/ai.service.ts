import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatRequestDto, ChatResponseDto, ClientSummaryDto } from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  chat(request: ChatRequestDto): Observable<ChatResponseDto> {
    return this.http.post<ChatResponseDto>(`${this.apiUrl}/chat`, request);
  }

  resumeClient(clientId: number): Observable<ClientSummaryDto> {
    return this.http.get<ClientSummaryDto>(`${this.apiUrl}/clients/${clientId}/resume`);
  }
}
