import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EvenementClientDto, NoteClientDto, ContactClientDto } from '../models/client.models';

export interface PagedEvenementsDto {
  items: EvenementClientDto[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private baseUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  getEvenements(clientId: number, page = 1, pageSize = 20): Observable<PagedEvenementsDto> {
    let params = new HttpParams();
    params = params.set('page', page.toString());
    params = params.set('pageSize', pageSize.toString());
    return this.http.get<PagedEvenementsDto>(`${this.baseUrl}/${clientId}/activity/evenements`, { params });
  }

  getNotes(clientId: number): Observable<NoteClientDto[]> {
    return this.http.get<NoteClientDto[]>(`${this.baseUrl}/${clientId}/activity/notes`);
  }

  createNote(clientId: number, dto: { titre?: string; contenu: string; categorie: string; estEpinglee?: boolean }): Observable<NoteClientDto> {
    return this.http.post<NoteClientDto>(`${this.baseUrl}/${clientId}/activity/notes`, dto);
  }

  updateNote(clientId: number, noteId: number, dto: { titre?: string; contenu?: string; categorie?: string; estEpinglee?: boolean }): Observable<NoteClientDto> {
    return this.http.put<NoteClientDto>(`${this.baseUrl}/${clientId}/activity/notes/${noteId}`, dto);
  }

  deleteNote(clientId: number, noteId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${clientId}/activity/notes/${noteId}`);
  }

  getContacts(clientId: number): Observable<ContactClientDto[]> {
    return this.http.get<ContactClientDto[]>(`${this.baseUrl}/${clientId}/activity/contacts`);
  }

  createContact(clientId: number, dto: {
    typeContact: string;
    nom: string;
    prenom?: string;
    telephone?: string;
    email?: string;
    adresse?: string;
    relation?: string;
  }): Observable<ContactClientDto> {
    return this.http.post<ContactClientDto>(`${this.baseUrl}/${clientId}/activity/contacts`, dto);
  }

  updateContact(clientId: number, contactId: number, dto: {
    typeContact?: string;
    nom?: string;
    prenom?: string;
    telephone?: string;
    email?: string;
    adresse?: string;
    relation?: string;
  }): Observable<ContactClientDto> {
    return this.http.put<ContactClientDto>(`${this.baseUrl}/${clientId}/activity/contacts/${contactId}`, dto);
  }

  deleteContact(clientId: number, contactId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${clientId}/activity/contacts/${contactId}`);
  }
}
