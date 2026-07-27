import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DocumentDto, OcrResultDto, PagedResult } from '../models/client.models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  getByClient(clientId: number): Observable<DocumentDto[]> {
    return this.http.get<DocumentDto[]>(`${this.apiUrl}/client/${clientId}`);
  }

  getByClientPaged(clientId: number, page: number, pageSize: number): Observable<PagedResult<DocumentDto>> {
    return this.http.get<PagedResult<DocumentDto>>(`${this.apiUrl}/client/${clientId}/paged`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getAll(): Observable<DocumentDto[]> {
    return this.http.get<DocumentDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<DocumentDto> {
    return this.http.get<DocumentDto>(`${this.apiUrl}/${id}`);
  }

  create(idClient: number, typeDocument: string, file: File): Observable<DocumentDto> {
    const formData = new FormData();
    formData.append('idClient', idClient.toString());
    formData.append('typeDocument', typeDocument);
    formData.append('file', file);
    return this.http.post<DocumentDto>(this.apiUrl, formData);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  download(id: number): Observable<{ blob: Blob; filename: string }> {
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        const disposition = response.headers.get('Content-Disposition') ?? '';
        const match = disposition.match(/filename="?([^";\n]+)"?/);
        const filename = match ? match[1] : 'document';
        return { blob: response.body!, filename };
      })
    );
  }

  preview(id: number): Observable<{ objectUrl: string; contentType: string; filename: string }> {
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        const disposition = response.headers.get('Content-Disposition') ?? '';
        const match = disposition.match(/filename="?([^";\n]+)"?/);
        const filename = match ? match[1] : 'document';
        const blob = response.body!;
        const contentType = blob.type || this.guessContentType(filename);
        const objectUrl = URL.createObjectURL(blob);
        return { objectUrl, contentType, filename };
      })
    );
  }

  private guessContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default: return 'application/octet-stream';
    }
  }

  isPreviewable(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(ext ?? '');
  }

  updateValidation(id: number, statutValidation: string): Observable<DocumentDto> {
    return this.http.put<DocumentDto>(`${this.apiUrl}/${id}/validation`, { statutValidation });
  }

  /** Déclenche la vérification OCR pour un document */
  verifyOcr(id: number): Observable<OcrResultDto> {
    return this.http.post<OcrResultDto>(`${this.apiUrl}/${id}/ocr`, {});
  }

  /** Récupère les résultats OCR d'un document */
  getOcrResult(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/ocr`);
  }
}
