import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CompteDto, MouvementDto, CoursDto, CoursTempsReelDto, CompteTotalDto, PagedResult } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getComptesByClient(idClient: number): Observable<CompteDto[]> {
    return this.http.get<CompteDto[]>(`${this.baseUrl}/comptes/client/${idClient}`);
  }

  searchComptes(params: {
    numCompte?: string;
    agence?: string;
    devise?: string;
    codeClient?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<CompteDto>> {
    let httpParams = new HttpParams();
    if (params.numCompte) httpParams = httpParams.set('numCompte', params.numCompte);
    if (params.agence) httpParams = httpParams.set('agence', params.agence);
    if (params.devise) httpParams = httpParams.set('devise', params.devise);
    if (params.codeClient) httpParams = httpParams.set('codeClient', params.codeClient);
    httpParams = httpParams.set('page', (params.page ?? 1).toString());
    httpParams = httpParams.set('pageSize', (params.pageSize ?? 20).toString());
    return this.http.get<PagedResult<CompteDto>>(`${this.baseUrl}/comptes`, { params: httpParams });
  }

  getTotauxByClient(idClient: number): Observable<CompteTotalDto[]> {
    return this.http.get<CompteTotalDto[]>(`${this.baseUrl}/comptes/client/${idClient}/totaux`);
  }

  getCompte(id: number): Observable<CompteDto> {
    return this.http.get<CompteDto>(`${this.baseUrl}/comptes/${id}`);
  }

  getMouvementsByCompte(id: number, params: {
    dateDebut?: string;
    dateFin?: string;
    sens?: string;
    montantMin?: number;
    montantMax?: number;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<MouvementDto>> {
    let httpParams = this.buildParams(params);
    return this.http.get<PagedResult<MouvementDto>>(`${this.baseUrl}/comptes/${id}/mouvements`, { params: httpParams });
  }

  getMouvementsByClient(idClient: number, params: {
    dateDebut?: string;
    dateFin?: string;
    sens?: string;
    montantMin?: number;
    montantMax?: number;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<MouvementDto>> {
    let httpParams = this.buildParams(params);
    return this.http.get<PagedResult<MouvementDto>>(`${this.baseUrl}/mouvements/client/${idClient}`, { params: httpParams });
  }

  getCours(devise?: string): Observable<CoursDto[]> {
    let httpParams = new HttpParams();
    if (devise) httpParams = httpParams.set('devise', devise);
    return this.http.get<CoursDto[]>(`${this.baseUrl}/cours`, { params: httpParams });
  }

  getCoursTempsReel(): Observable<CoursTempsReelDto[]> {
    return this.http.get<CoursTempsReelDto[]>(`${this.baseUrl}/cours/temps-reel`);
  }

  getCoursHistorique(devise: string, dateDebut?: string, dateFin?: string): Observable<CoursDto[]> {
    let httpParams = new HttpParams();
    if (dateDebut) httpParams = httpParams.set('dateDebut', dateDebut);
    if (dateFin) httpParams = httpParams.set('dateFin', dateFin);
    return this.http.get<CoursDto[]>(`${this.baseUrl}/cours/${devise}/historique`, { params: httpParams });
  }

  private buildParams(params: { dateDebut?: string; dateFin?: string; sens?: string; montantMin?: number; montantMax?: number; page?: number; pageSize?: number }): HttpParams {
    let httpParams = new HttpParams();
    if (params.dateDebut) httpParams = httpParams.set('dateDebut', params.dateDebut);
    if (params.dateFin) httpParams = httpParams.set('dateFin', params.dateFin);
    if (params.sens) httpParams = httpParams.set('sens', params.sens);
    if (params.montantMin !== undefined && params.montantMin !== null) httpParams = httpParams.set('montantMin', params.montantMin.toString());
    if (params.montantMax !== undefined && params.montantMax !== null) httpParams = httpParams.set('montantMax', params.montantMax.toString());
    httpParams = httpParams.set('page', (params.page ?? 1).toString());
    httpParams = httpParams.set('pageSize', (params.pageSize ?? 20).toString());
    return httpParams;
  }
}
