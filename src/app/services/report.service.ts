import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  generateClientListPdf(params: {
    ville?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
  }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/clients/pdf`, params, { responseType: 'blob' });
  }

  generateClientListExcel(params: {
    ville?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
  }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/clients/excel`, params, { responseType: 'blob' });
  }

  generateStatsPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/stats/pdf`, { responseType: 'blob' });
  }
}
