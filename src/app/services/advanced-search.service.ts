import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TagDto {
  id: number;
  tag: string;
  createdAt: string;
  createdByUsername: string;
}

@Injectable({ providedIn: 'root' })
export class AdvancedSearchService {
  private apiUrl = `${environment.apiUrl}/advancedsearch`;

  constructor(private http: HttpClient) {}

  getClientTags(clientId: number): Observable<TagDto[]> {
    return this.http.get<TagDto[]>(`${this.apiUrl}/clients/${clientId}/tags`);
  }

  addClientTag(clientId: number, tag: string): Observable<TagDto> {
    return this.http.post<TagDto>(`${this.apiUrl}/clients/${clientId}/tags`, { tag });
  }

  removeClientTag(tagId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/clients/tags/${tagId}`);
  }

  getDocumentTags(documentId: number): Observable<TagDto[]> {
    return this.http.get<TagDto[]>(`${this.apiUrl}/documents/${documentId}/tags`);
  }

  addDocumentTag(documentId: number, tag: string): Observable<TagDto> {
    return this.http.post<TagDto>(`${this.apiUrl}/documents/${documentId}/tags`, { tag });
  }

  removeDocumentTag(tagId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/documents/tags/${tagId}`);
  }
}
