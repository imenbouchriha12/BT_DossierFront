import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentTemplateDto {
  id: number;
  typeClient: string;
  nomDocument: string;
  description?: string;
  estObligatoire: boolean;
  ordre: number;
  formatsAcceptes?: string;
  tailleMaxMo?: number;
  isActive: boolean;
  dateCreation: string;
}

export interface CreateDocumentTemplateDto {
  typeClient: string;
  nomDocument: string;
  description?: string;
  estObligatoire: boolean;
  ordre: number;
  formatsAcceptes?: string;
  tailleMaxMo?: number;
}

export interface UpdateDocumentTemplateDto {
  nomDocument: string;
  description?: string;
  estObligatoire: boolean;
  ordre: number;
  formatsAcceptes?: string;
  tailleMaxMo?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DocumentTemplateService {
  private apiUrl = `${environment.apiUrl}/documenttemplates`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DocumentTemplateDto[]> {
    return this.http.get<DocumentTemplateDto[]>(this.apiUrl);
  }

  getTypesClients(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/types`);
  }

  getByTypeClient(typeClient: string): Observable<DocumentTemplateDto[]> {
    return this.http.get<DocumentTemplateDto[]>(`${this.apiUrl}/by-type/${encodeURIComponent(typeClient)}`);
  }

  getById(id: number): Observable<DocumentTemplateDto> {
    return this.http.get<DocumentTemplateDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateDocumentTemplateDto): Observable<DocumentTemplateDto> {
    return this.http.post<DocumentTemplateDto>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateDocumentTemplateDto): Observable<DocumentTemplateDto> {
    return this.http.put<DocumentTemplateDto>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}