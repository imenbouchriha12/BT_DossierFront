import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CompteDto, MouvementDto, CoursDto, CoursTempsReelDto, CompteTotalDto, PagedResult } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private baseUrl = `${environment.apiUrl}`;
  private hubBaseUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  private hub?: signalR.HubConnection;
  /** Événement poussé par le serveur quand les cours de change sont actualisés. */
  coursMaj$ = new Subject<CoursTempsReelDto[]>();

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Établit la connexion temps réel au hub des cours de change (/hubs/cours). */
  connect(): void {
    if (this.hub && (this.hub.state === signalR.HubConnectionState.Connected || this.hub.state === signalR.HubConnectionState.Connecting)) {
      return;
    }
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${this.hubBaseUrl}/hubs/cours`, {
        accessTokenFactory: () => this.auth.getToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    hub.on('CoursMaj', (data: CoursTempsReelDto[]) => {
      this.coursMaj$.next(data ?? []);
    });

    hub.start().catch(err => console.error('SignalR cours : échec de connexion', err));
    this.hub = hub;
  }

  disconnect(): void {
    if (this.hub) {
      this.hub.stop();
      this.hub = undefined;
    }
  }

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
