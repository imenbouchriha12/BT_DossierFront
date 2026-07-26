import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces TypeScript pour les DTOs
export interface DashboardStats {
  kpis: KpiSummary;
  clientEvolution: ClientEvolution;
  geographicDistribution: GeographicDistribution[];
  topRevenueClients: TopRevenueClient[];
  documentsPending: DocumentsPending;
  agentPerformance: AgentPerformance[];
  alerts: DashboardAlert[];
}

export interface KpiSummary {
  totalActiveClients: number;
  newClientsThisMonth: number;
  newClientsPercentageChange: number;
  blockedClients: number;
  inactiveClients: number;
  totalDocuments: number;
  pendingDocuments: number;
  validatedDocumentsThisMonth: number;
  averageMonthlyRevenue: number;
  totalMonthlyRevenue: number;
  totalActiveUsers: number;
}

export interface ClientEvolution {
  labels: string[];
  newClients: number[];
  activeClients: number[];
  blockedClients: number[];
  suspendedClients: number[];
}

export interface GeographicDistribution {
  city: string;
  clientCount: number;
  percentage: number;
  totalRevenue: number;
  latitude?: number;
  longitude?: number;
}

export interface TopRevenueClient {
  clientId: number;
  codeClient: string;
  fullName: string;
  city: string;
  monthlyRevenue: number;
  profession: string;
  sectorActivite: string;
}

export interface DocumentsPending {
  totalPending: number;
  byType: DocumentTypeCount[];
  urgentCount: number;
  recentPending: PendingDocumentItem[];
}

export interface DocumentTypeCount {
  documentType: string;
  count: number;
  percentage: number;
}

export interface PendingDocumentItem {
  documentId: number;
  clientCode: string;
  clientName: string;
  documentType: string;
  fileName: string;
  dateAdded: string;
  daysPending: number;
  isUrgent: boolean;
}

export interface AgentPerformance {
  userId: number;
  username: string;
  matricule: string;
  clientsCreatedThisMonth: number;
  totalClientsManaged: number;
  documentsProcessedThisMonth: number;
  performanceScore: number;
  modificationsCount: number;
}

export interface DashboardAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  count: number;
  createdAt: string;
  actionUrl: string;
}

export enum AlertType {
  InactiveClients = 0,
  PendingDocuments = 1,
  BlockedClients = 2,
  AbnormalRevenue = 3,
  SystemWarning = 4
}

export enum AlertSeverity {
  Info = 0,
  Warning = 1,
  Error = 2,
  Critical = 3
}

export interface DashboardConfig {
  userId: number;
  widgets: WidgetConfig[];
  theme: string;
  showAlerts: boolean;
  lastUpdated: string;
}

export interface WidgetConfig {
  widgetId: string;
  widgetType: string;
  position: number;
  isVisible: boolean;
  size: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  /**
   * Récupère toutes les statistiques du tableau de bord
   */
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Récupère les KPIs principaux
   */
  getKpis(): Observable<KpiSummary> {
    return this.http.get<KpiSummary>(`${this.apiUrl}/kpis`);
  }

  /**
   * Récupère l'évolution des clients sur plusieurs mois
   * @param months Nombre de mois (par défaut: 6)
   */
  getClientEvolution(months: number = 6): Observable<ClientEvolution> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<ClientEvolution>(`${this.apiUrl}/client-evolution`, { params });
  }

  /**
   * Récupère la répartition géographique des clients
   * @param topN Nombre de villes à retourner (par défaut: 10)
   */
  getGeographicDistribution(topN: number = 10): Observable<GeographicDistribution[]> {
    const params = new HttpParams().set('topN', topN.toString());
    return this.http.get<GeographicDistribution[]>(`${this.apiUrl}/geographic-distribution`, { params });
  }

  /**
   * Récupère le top des clients par revenu mensuel
   * @param topN Nombre de clients à retourner (par défaut: 10)
   */
  getTopRevenueClients(topN: number = 10): Observable<TopRevenueClient[]> {
    const params = new HttpParams().set('topN', topN.toString());
    return this.http.get<TopRevenueClient[]>(`${this.apiUrl}/top-revenue-clients`, { params });
  }

  /**
   * Récupère les documents en attente de validation
   */
  getPendingDocuments(): Observable<DocumentsPending> {
    return this.http.get<DocumentsPending>(`${this.apiUrl}/pending-documents`);
  }

  /**
   * Récupère la performance des agents
   */
  getAgentPerformance(): Observable<AgentPerformance[]> {
    return this.http.get<AgentPerformance[]>(`${this.apiUrl}/agent-performance`);
  }

  /**
   * Récupère les alertes actives
   */
  getAlerts(): Observable<DashboardAlert[]> {
    return this.http.get<DashboardAlert[]>(`${this.apiUrl}/alerts`);
  }

  /**
   * Sauvegarde la configuration personnalisée du tableau de bord
   * @param config Configuration à sauvegarder
   */
  saveDashboardConfig(config: DashboardConfig): Observable<any> {
    return this.http.post(`${this.apiUrl}/config`, config);
  }

  /**
   * Récupère la configuration personnalisée de l'utilisateur
   * @param userId ID de l'utilisateur
   */
  getDashboardConfig(userId: number): Observable<DashboardConfig> {
    return this.http.get<DashboardConfig>(`${this.apiUrl}/config/${userId}`);
  }

  /**
   * Obtient la classe CSS selon la sévérité de l'alerte
   */
  getAlertSeverityClass(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.Info:
        return 'bg-blue-100 border-blue-500 text-blue-700';
      case AlertSeverity.Warning:
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case AlertSeverity.Error:
        return 'bg-orange-100 border-orange-500 text-orange-700';
      case AlertSeverity.Critical:
        return 'bg-red-100 border-red-500 text-red-700';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  }

  /**
   * Obtient l'icône selon le type d'alerte
   */
  getAlertIcon(type: AlertType): string {
    switch (type) {
      case AlertType.InactiveClients:
        return 'fa-user-clock';
      case AlertType.PendingDocuments:
        return 'fa-file-clock';
      case AlertType.BlockedClients:
        return 'fa-user-lock';
      case AlertType.AbnormalRevenue:
        return 'fa-chart-line';
      case AlertType.SystemWarning:
        return 'fa-exclamation-triangle';
      default:
        return 'fa-bell';
    }
  }
}
