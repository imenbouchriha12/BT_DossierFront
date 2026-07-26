import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClientDto, CreateClientDto, UpdateClientDto, ClientSearchDto, PagedResult, ClientStatsDto } from '../models/client.models';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private apiUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  search(search: ClientSearchDto): Observable<PagedResult<ClientDto>> {
    let params = new HttpParams();
    if (search.codeClient) params = params.set('codeClient', search.codeClient);
    if (search.nom) params = params.set('nom', search.nom);
    if (search.prenom) params = params.set('prenom', search.prenom);
    if (search.ville) params = params.set('ville', search.ville);
    if (search.statut) params = params.set('statut', search.statut);
    if (search.dateDebut) params = params.set('dateDebut', search.dateDebut);
    if (search.dateFin) params = params.set('dateFin', search.dateFin);
    params = params.set('page', (search.page ?? 1).toString());
    params = params.set('pageSize', (search.pageSize ?? 10).toString());
    return this.http.get<PagedResult<ClientDto>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<ClientDto> {
    return this.http.get<ClientDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateClientDto): Observable<ClientDto> {
    return this.http.post<ClientDto>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateClientDto): Observable<ClientDto> {
    return this.http.put<ClientDto>(`${this.apiUrl}/${id}`, dto);
  }

  archive(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  restore(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/restore`, {});
  }

  getArchived(page: number = 1, pageSize: number = 10): Observable<PagedResult<ClientDto>> {
    return this.http.get<PagedResult<ClientDto>>(`${this.apiUrl}/archived`, {
      params: new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString())
    });
  }

  export(search: ClientSearchDto): Observable<Blob> {
    let params = new HttpParams();
    if (search.codeClient) params = params.set('codeClient', search.codeClient);
    if (search.nom) params = params.set('nom', search.nom);
    if (search.prenom) params = params.set('prenom', search.prenom);
    if (search.ville) params = params.set('ville', search.ville);
    if (search.statut) params = params.set('statut', search.statut);
    if (search.dateDebut) params = params.set('dateDebut', search.dateDebut);
    if (search.dateFin) params = params.set('dateFin', search.dateFin);
    return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' });
  }

  getStats(): Observable<ClientStatsDto> {
    return this.http.get<ClientStatsDto>(`${this.apiUrl}/stats`);
  }

  importExcel(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/import`, formData);
  }

  getVilles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/villes`);
  }
}
