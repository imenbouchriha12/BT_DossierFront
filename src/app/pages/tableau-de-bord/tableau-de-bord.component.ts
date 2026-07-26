import { Component, OnInit, ViewChild, ElementRef, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardStats, KpiSummary, DashboardAlert, AlertSeverity } from '../../services/dashboard.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tableau-de-bord.component.html',
  styleUrls: ['./tableau-de-bord.component.css']
})
export class TableauDeBordComponent implements OnInit, AfterViewInit, OnDestroy {
  // Signals pour la réactivité
  loading = signal(true);
  stats = signal<DashboardStats | null>(null);
  kpis = signal<KpiSummary | null>(null);
  alerts = signal<DashboardAlert[]>([]);

  // Math pour le template
  Math = Math;

  // ViewChild pour les canvas des graphiques
  @ViewChild('evolutionChart') evolutionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('geoChart') geoCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('docsChart') docsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('performanceChart') performanceCanvas!: ElementRef<HTMLCanvasElement>;

  // Instances des graphiques
  private evolutionChart: Chart | null = null;
  private geoChart: Chart | null = null;
  private revenueChart: Chart | null = null;
  private docsChart: Chart | null = null;
  private performanceChart: Chart | null = null;

  // Pour la sévérité des alertes
  AlertSeverity = AlertSeverity;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  ngAfterViewInit() {
    // Les graphiques seront créés après le chargement des données
  }

  ngOnDestroy() {
    this.destroyAllCharts();
  }

  /**
   * Charge toutes les données du tableau de bord
   */
  loadDashboard() {
    this.loading.set(true);

    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.kpis.set(stats.kpis);
        this.alerts.set(stats.alerts);
        this.loading.set(false);
        setTimeout(() => this.initAllCharts(), 100);
      },
      error: (error) => {
        console.error('Erreur lors du chargement du tableau de bord:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Initialise tous les graphiques
   */
  private initAllCharts() {
    this.destroyAllCharts();
    this.initEvolutionChart();
    this.initGeographicChart();
    this.initRevenueChart();
    this.initDocumentsChart();
    this.initPerformanceChart();
  }

  /**
   * Détruit tous les graphiques
   */
  private destroyAllCharts() {
    this.evolutionChart?.destroy();
    this.geoChart?.destroy();
    this.revenueChart?.destroy();
    this.docsChart?.destroy();
    this.performanceChart?.destroy();
  }

  /**
   * Graphique d'évolution des clients (Line Chart)
   */
  private initEvolutionChart() {
    if (!this.evolutionCanvas || !this.stats()?.clientEvolution) return;

    const evolution = this.stats()!.clientEvolution;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: evolution.labels,
        datasets: [
          {
            label: 'Nouveaux clients',
            data: evolution.newClients,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Clients actifs',
            data: evolution.activeClients,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Bloqués',
            data: evolution.blockedClients,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#f43f5e',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 13, weight: 'bold' },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 16,
            displayColors: true,
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 12, weight: 'normal' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              color: '#64748b',
              font: { size: 12, weight: 'normal' },
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index',
        }
      }
    };

    this.evolutionChart = new Chart(this.evolutionCanvas.nativeElement, config);
  }

  /**
   * Graphique de répartition géographique (Bar Chart horizontal)
   */
  private initGeographicChart() {
    if (!this.geoCanvas || !this.stats()?.geographicDistribution) return;

    const geo = this.stats()!.geographicDistribution.slice(0, 10);

    // Gradient colors
    const gradientColors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
    ];

    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16', '#3b82f6'];

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: geo.map(g => g.city),
        datasets: [{
          label: 'Nombre de clients',
          data: geo.map(g => g.clientCount),
          backgroundColor: colors,
          borderRadius: 10,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 16,
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
            callbacks: {
              afterLabel: (context) => {
                const item = geo[context.dataIndex];
                return `${item.percentage}% du total\nRevenu: ${item.totalRevenue.toLocaleString('fr-FR')} DT/mois`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#64748b', font: { size: 12, weight: 'normal' } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#475569', font: { size: 13, weight: 'bold' } }
          }
        }
      }
    };

    this.geoChart = new Chart(this.geoCanvas.nativeElement, config);
  }

  /**
   * Graphique des top revenus (Horizontal Bar Chart)
   */
  private initRevenueChart() {
    if (!this.revenueCanvas || !this.stats()?.topRevenueClients) return;

    const top = this.stats()!.topRevenueClients.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: top.map(c => c.fullName),
        datasets: [{
          label: 'Revenu mensuel (DT)',
          data: top.map(c => c.monthlyRevenue),
          backgroundColor: '#10b981',
          hoverBackgroundColor: '#059669',
          borderRadius: 10,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 16,
            borderColor: 'rgba(16, 185, 129, 0.3)',
            borderWidth: 1,
            callbacks: {
              afterLabel: (context) => {
                const client = top[context.dataIndex];
                return `Code: ${client.codeClient}\nVille: ${client.city}\nProfession: ${client.profession}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              color: '#64748b',
              font: { size: 12, weight: 'normal' },
              callback: (value) => `${value} DT`
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#475569',
              font: { size: 12, weight: 'bold' },
              callback: function(value, index) {
                const label = this.getLabelForValue(value as number);
                return label.length > 20 ? label.substring(0, 20) + '...' : label;
              }
            }
          }
        }
      }
    };

    this.revenueChart = new Chart(this.revenueCanvas.nativeElement, config);
  }

  /**
   * Graphique des documents en attente (Doughnut Chart)
   */
  private initDocumentsChart() {
    if (!this.docsCanvas || !this.stats()?.documentsPending) return;

    const docs = this.stats()!.documentsPending;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: docs.byType.map(d => d.documentType),
        datasets: [{
          data: docs.byType.map(d => d.count),
          backgroundColor: [
            '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
            '#10b981', '#06b6d4', '#f43f5e', '#84cc16'
          ],
          borderWidth: 3,
          borderColor: '#fff',
          hoverBorderWidth: 4,
          hoverBorderColor: '#fff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 12, weight: 'bold' },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 16,
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (context: any) => {
                const item = docs.byType[context.dataIndex];
                return `${item.documentType}: ${item.count} (${item.percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.docsChart = new Chart(this.docsCanvas.nativeElement, config);
  }

  /**
   * Graphique de performance des agents (Bar Chart)
   */
  private initPerformanceChart() {
    if (!this.performanceCanvas || !this.stats()?.agentPerformance) return;

    const performance = this.stats()!.agentPerformance.slice(0, 10);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: performance.map(p => p.username),
        datasets: [
          {
            label: 'Clients créés ce mois',
            data: performance.map(p => p.clientsCreatedThisMonth),
            backgroundColor: '#6366f1',
            hoverBackgroundColor: '#4f46e5',
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: 'Documents traités',
            data: performance.map(p => p.documentsProcessedThisMonth),
            backgroundColor: '#10b981',
            hoverBackgroundColor: '#059669',
            borderRadius: 8,
            borderSkipped: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 13, weight: 'bold' },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 16,
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
            callbacks: {
              afterBody: (items) => {
                const agent = performance[items[0].dataIndex];
                return `\nScore de performance: ${agent.performanceScore.toFixed(1)}/100\nTotal clients gérés: ${agent.totalClientsManaged}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 12, weight: 'normal' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#64748b', font: { size: 12, weight: 'normal' } }
          }
        }
      }
    };

    this.performanceChart = new Chart(this.performanceCanvas.nativeElement, config);
  }

  /**
   * Obtient la classe CSS selon la sévérité de l'alerte
   */
  getAlertClass(severity: AlertSeverity): string {
    return this.dashboardService.getAlertSeverityClass(severity);
  }

  /**
   * Obtient l'icône selon le type d'alerte
   */
  getAlertIcon(type: number): string {
    return this.dashboardService.getAlertIcon(type);
  }

  /**
   * Formatage des montants
   */
  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Export du tableau de bord en PDF (à implémenter)
   */
  exportToPdf() {
    // Cette fonctionnalité sera implémentée avec QuestPDF côté backend
    alert('Export PDF en cours de développement...');
  }
}
