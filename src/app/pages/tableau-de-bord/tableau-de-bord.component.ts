import { Component, OnInit, ViewChild, ElementRef, OnDestroy, AfterViewInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  DashboardService,
  FinanceDashboard,
  DashboardStats,
  ClientEvolution,
  GeographicDistribution,
  TopRevenueClient,
  AgentPerformance,
  DashboardAlert,
  AlertSeverity,
} from '../../services/dashboard.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ToastService } from '../../shared/toast/toast.service';
import { FinanceService } from '../../services/finance.service';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

type PageView = 'finance' | 'global';

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tableau-de-bord.component.html',
  styleUrls: ['./tableau-de-bord.component.css']
})
export class TableauDeBordComponent implements OnInit, AfterViewInit, OnDestroy {
  pageView: PageView = 'finance';

  financeLoading = signal(true);
  financeError = signal('');
  finance = signal<FinanceDashboard | null>(null);

  statsLoading = signal(true);
  statsError = signal('');
  stats = signal<DashboardStats | null>(null);

  Math = Math;

  // Évolution animée (mode vidéo)
  evolutionFrame = 0;
  evolutionPlaying = false;
  evolutionInterval: any = null;
  evolutionSpeedMs = 600;

  @ViewChild('deviseChart') deviseCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('evolutionChart') fluxCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('etatsChart') etatsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('agencesChart') agencesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('evolutionVideo') evolutionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('geoChart') geoCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('docsChart') docsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('agentChart') agentCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeChart') typeCanvas!: ElementRef<HTMLCanvasElement>;

  private deviseChart: Chart | null = null;
  private fluxChart: Chart | null = null;
  private etatsChart: Chart | null = null;
  private agencesChart: Chart | null = null;
  private clientEvolutionChart: Chart | null = null;
  private geoChart: Chart | null = null;
  private revenueChart: Chart | null = null;
  private docsChart: Chart | null = null;
  private agentChart: Chart | null = null;
  private typeChart: Chart | null = null;
  private coursMajSub: Subscription | null = null;

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private financeService: FinanceService
  ) {}

  ngOnInit() {
    this.loadFinance();
    this.loadStats();
    this.financeService.connect();
    this.coursMajSub = this.financeService.coursMaj$.subscribe(nouveauxCours => {
      const fin = this.finance();
      if (!fin || !nouveauxCours || nouveauxCours.length === 0) return;
      const date = nouveauxCours.find(c => !!c.date)?.date ?? fin.coursJour.find(c => !!c.date)?.date;
      fin.coursJour = nouveauxCours.map(c => ({
        devise: c.devise,
        symbole: c.symbole,
        nom: c.nom,
        valeur: c.valeur,
        date: c.date ?? date ?? null,
      }));
      this.finance.set(fin);
      if (this.pageView === 'finance') this.initDeviseChart();
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.stopEvolution();
    this.destroyAllCharts();
    this.coursMajSub?.unsubscribe();
  }

  get today(): Date {
    return new Date();
  }

  get kpis() {
    return this.finance()?.kpis ?? null;
  }

  get kpisGlobaux() {
    return this.stats()?.kpis ?? null;
  }

  get evolution(): ClientEvolution | null {
    return this.stats()?.clientEvolution ?? null;
  }

  get totalLabels(): number {
    return this.evolution?.labels.length ?? 0;
  }

  get evolutionProgress(): number {
    if (!this.totalLabels) return 0;
    return Math.round(((this.evolutionFrame + 1) / this.totalLabels) * 100);
  }

  get viewTitle(): string {
    return this.pageView === 'finance' ? "Vue d'ensemble financière" : 'Vue globale';
  }

  get viewSubtitle(): string {
    return this.pageView === 'finance'
      ? 'Agrégats financiers consolidés (comptes, flux, cours)'
      : 'Clients, documents, agents & alertes — portefeuille complet';
  }

  switchView(view: PageView): void {
    if (this.pageView === view) return;
    this.pageView = view;
    setTimeout(() => this.initCurrentViewCharts(), 80);
  }

  refresh(): void {
    if (this.pageView === 'finance') {
      this.loadFinance();
    } else {
      this.loadStats();
    }
    this.toast.info('Tableau de bord actualisé.', 'Actualisation');
  }

  loadFinance() {
    this.financeLoading.set(true);
    this.financeError.set('');
    this.dashboardService.getFinanceDashboard().subscribe({
      next: (data) => {
        this.finance.set(data);
        this.financeLoading.set(false);
        if (this.pageView === 'finance') {
          setTimeout(() => this.initCurrentViewCharts(), 100);
        }
      },
      error: (err) => {
        console.error('Erreur chargement du dashboard financier:', err);
        this.financeLoading.set(false);
        this.financeError.set('Impossible de charger les données financières.');
      }
    });
  }

  loadStats() {
    this.statsLoading.set(true);
    this.statsError.set('');
    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.statsLoading.set(false);
        this.evolutionFrame = 0;
        if (this.pageView === 'global') {
          setTimeout(() => this.initCurrentViewCharts(), 120);
        }
      },
      error: (err) => {
        console.error('Erreur chargement du tableau de bord global:', err);
        this.statsLoading.set(false);
        this.statsError.set('Impossible de charger les données globales.');
      },
    });
  }

  // ═══════════════════ CHARTS ═══════════════════

  private initCurrentViewCharts() {
    this.destroyAllCharts();
    if (this.pageView === 'finance' && this.finance()) {
      this.initDeviseChart();
      this.initFluxChart();
      this.initEtatsChart();
      this.initAgencesChart();
    } else if (this.pageView === 'global' && this.stats()) {
      this.initClientEvolutionChart();
      this.initGeoChart();
      this.initRevenueChart();
      this.initDocsChart();
      this.initAgentChart();
      this.initTypeChart();
    }
  }

  private destroyAllCharts() {
    this.deviseChart?.destroy();
    this.fluxChart?.destroy();
    this.etatsChart?.destroy();
    this.agencesChart?.destroy();
    this.clientEvolutionChart?.destroy();
    this.geoChart?.destroy();
    this.revenueChart?.destroy();
    this.docsChart?.destroy();
    this.agentChart?.destroy();
    this.typeChart?.destroy();
  }

  /** Doughnut : répartition des actifs par devise */
  private initDeviseChart() {
    if (!this.deviseCanvas || !this.finance()?.repartitionParDevise) return;
    const rep = this.finance()!.repartitionParDevise.filter(r => r.soldeContreValeur !== 0);

    const palette = ['#1e3a5f', '#0e7490', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e'];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: rep.map(r => r.devise),
        datasets: [{
          data: rep.map(r => r.soldeContreValeur),
          backgroundColor: palette,
          borderWidth: 3,
          borderColor: '#fff',
          hoverBorderWidth: 4,
          hoverBorderColor: '#fff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, padding: 16, font: { size: 12, weight: 'bold' }, color: '#334155' }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = rep[context.dataIndex];
                return ` ${item.devise}: ${this.formatMontant(item.soldeContreValeur)} TND (${item.part}%) — ${item.nombreComptes} compte(s)`;
              }
            }
          }
        }
      }
    };

    this.deviseChart = new Chart(this.deviseCanvas.nativeElement, config);
  }

  /** Line : évolution mensuelle des flux crédits / débits */
  private initFluxChart() {
    if (!this.fluxCanvas || !this.finance()?.evolutionMouvements) return;
    const evo = this.finance()!.evolutionMouvements;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: evo.map(e => e.mois),
        datasets: [
          {
            label: 'Crédits (entrées)',
            data: evo.map(e => e.credits),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#059669',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Débits (sorties)',
            data: evo.map(e => e.debits),
            borderColor: '#e11d48',
            backgroundColor: 'rgba(225, 29, 72, 0.12)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#e11d48',
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
            labels: { usePointStyle: true, padding: 16, font: { size: 12, weight: 'bold' }, color: '#334155' }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 14,
            callbacks: {
              label: (context: any) => ` ${context.dataset.label}: ${this.formatMontant(context.parsed.y)} TND`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            ticks: { color: '#64748b', font: { size: 12 }, callback: (value) => this.formatCompact(value as number) }
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    };

    this.fluxChart = new Chart(this.fluxCanvas.nativeElement, config);
  }

  /** Barre horizontale : état des comptes */
  private initEtatsChart() {
    if (!this.etatsCanvas || !this.finance()?.etatsComptes) return;
    const etats = this.finance()!.etatsComptes.filter(e => e.nombre > 0);

    const colorMap: Record<string, string> = {
      'Créditeur': '#10b981',
      'Soldé': '#94a3b8',
      'Découvert': '#ef4444'
    };

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: etats.map(e => e.etat),
        datasets: [{
          label: 'Nombre de comptes',
          data: etats.map(e => e.nombre),
          backgroundColor: etats.map(e => colorMap[e.etat] ?? '#6366f1'),
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 34,
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
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = etats[context.dataIndex];
                return ` ${item.nombre} compte(s) — Encours: ${this.formatMontant(item.soldeContreValeur)} TND`;
              }
            }
          }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.15)' }, ticks: { color: '#64748b', font: { size: 12 } } },
          y: { grid: { display: false }, ticks: { color: '#334155', font: { size: 13, weight: 'bold' } } }
        }
      }
    };

    this.etatsChart = new Chart(this.etatsCanvas.nativeElement, config);
  }

  /** Barre horizontale : top des agences */
  private initAgencesChart() {
    if (!this.agencesCanvas || !this.finance()?.topAgences) return;
    const agences = this.finance()!.topAgences.slice(0, 8);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: agences.map(a => `Agence ${a.agence}`),
        datasets: [{
          label: 'Encours (TND)',
          data: agences.map(a => a.soldeContreValeur),
          backgroundColor: '#1e3a5f',
          hoverBackgroundColor: '#2f5684',
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 28,
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
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = agences[context.dataIndex];
                return ` ${this.formatMontant(item.soldeContreValeur)} TND — ${item.nombreComptes} compte(s), ${item.nbMouvements} mvt(s)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            ticks: { color: '#64748b', font: { size: 12 }, callback: (value) => this.formatCompact(value as number) }
          },
          y: { grid: { display: false }, ticks: { color: '#334155', font: { size: 13, weight: 'bold' } } }
        }
      }
    };

    this.agencesChart = new Chart(this.agencesCanvas.nativeElement, config);
  }

  /** Line animée : nouveaux clients mois par mois (mode vidéo) */
  private initClientEvolutionChart() {
    if (!this.evolutionCanvas || !this.evolution) return;
    const evo = this.evolution;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: evo.labels,
        datasets: [
          {
            label: 'Nouveaux clients',
            data: evo.newClients,
            borderColor: '#0e7490',
            backgroundColor: 'rgba(14, 116, 144, 0.12)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#0e7490',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Clients actifs',
            data: evo.activeClients,
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#059669',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 16, font: { size: 12, weight: 'bold' }, color: '#334155' },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 14,
            callbacks: {
              label: (context: any) => ` ${context.dataset.label}: ${context.parsed.y} client(s)`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            ticks: { color: '#64748b', font: { size: 12 }, precision: 0 },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    };

    this.clientEvolutionChart = new Chart(this.evolutionCanvas.nativeElement, config);
    this.applyEvolutionFrame();
  }

  /** Affiche uniquement les données jusqu'au frame courant */
  private applyEvolutionFrame() {
    if (!this.clientEvolutionChart || !this.evolution) return;
    const datasets = this.clientEvolutionChart.data.datasets;
    const n = this.evolutionFrame + 1;
    datasets[0].data = this.evolution.newClients.slice(0, n);
    datasets[1].data = this.evolution.activeClients.slice(0, n);
    this.clientEvolutionChart.data.labels = this.evolution.labels.slice(0, n);
    this.clientEvolutionChart.update('none');
  }

  // ── Contrôles du mode vidéo ───────────────────────

  toggleEvolution() {
    if (this.evolutionPlaying) {
      this.stopEvolution();
    } else {
      this.playEvolution();
    }
  }

  playEvolution() {
    if (!this.evolution || this.totalLabels === 0) return;
    if (this.evolutionFrame >= this.totalLabels - 1) this.evolutionFrame = 0;
    this.evolutionPlaying = true;
    this.evolutionInterval = setInterval(() => {
      if (this.evolutionFrame >= this.totalLabels - 1) {
        this.stopEvolution();
        return;
      }
      this.evolutionFrame++;
      this.applyEvolutionFrame();
      this.cdr.detectChanges();
    }, this.evolutionSpeedMs);
  }

  stopEvolution() {
    this.evolutionPlaying = false;
    if (this.evolutionInterval) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = null;
    }
  }

  restartEvolution() {
    this.stopEvolution();
    this.evolutionFrame = 0;
    this.applyEvolutionFrame();
    this.playEvolution();
  }

  seekEvolution(event: Event) {
    const target = event.target as HTMLInputElement;
    this.evolutionFrame = Number(target.value);
    this.applyEvolutionFrame();
  }

  /** Barre horizontale : répartition par ville */
  private initGeoChart() {
    if (!this.geoCanvas || !this.stats()?.geographicDistribution) return;
    const geo = this.stats()!.geographicDistribution.slice(0, 8);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: geo.map((g: GeographicDistribution) => g.city),
        datasets: [
          {
            label: 'Clients',
            data: geo.map((g: GeographicDistribution) => g.clientCount),
            backgroundColor: '#0e7490',
            hoverBackgroundColor: '#155e75',
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 24,
          },
        ],
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
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = geo[context.dataIndex];
                return ` ${item.clientCount} client(s) — ${item.percentage}%`;
              },
            },
          },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.15)' }, ticks: { color: '#64748b', font: { size: 12 }, precision: 0 } },
          y: { grid: { display: false }, ticks: { color: '#334155', font: { size: 13, weight: 'bold' } } },
        },
      },
    };

    this.geoChart = new Chart(this.geoCanvas.nativeElement, config);
  }

  /** Barre horizontale : top revenus clients */
  private initRevenueChart() {
    if (!this.revenueCanvas || !this.stats()?.topRevenueClients) return;
    const top = this.stats()!.topRevenueClients.slice(0, 8);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: top.map((t: TopRevenueClient) => t.fullName),
        datasets: [
          {
            label: 'Revenu mensuel',
            data: top.map((t: TopRevenueClient) => t.monthlyRevenue),
            backgroundColor: '#1e3a5f',
            hoverBackgroundColor: '#2f5684',
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 24,
          },
        ],
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
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = top[context.dataIndex];
                return ` ${this.formatMontant(item.monthlyRevenue)} DT/mois — ${item.profession || '—'}`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            ticks: { color: '#64748b', font: { size: 12 }, callback: (value) => this.formatCompact(value as number) },
          },
          y: { grid: { display: false }, ticks: { color: '#334155', font: { size: 13, weight: 'bold' } } },
        },
      },
    };

    this.revenueChart = new Chart(this.revenueCanvas.nativeElement, config);
  }

  /** Doughnut : documents en attente par type */
  private initDocsChart() {
    if (!this.docsCanvas || !this.stats()?.documentsPending) return;
    const byType = this.stats()!.documentsPending.byType;

    if (byType.length === 0) {
      this.docsChart = new Chart(this.docsCanvas.nativeElement, {
        type: 'doughnut',
        data: { labels: ['Aucun document'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } },
      });
      return;
    }

    const palette = ['#1e3a5f', '#0e7490', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e'];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: byType.map((d) => d.documentType),
        datasets: [
          {
            data: byType.map((d) => d.count),
            backgroundColor: palette,
            borderWidth: 3,
            borderColor: '#fff',
            hoverBorderWidth: 4,
            hoverBorderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, padding: 12, font: { size: 11, weight: 'bold' }, color: '#334155' },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = byType[context.dataIndex];
                return ` ${item.count} doc(s) — ${item.percentage}%`;
              },
            },
          },
        },
      },
    };

    this.docsChart = new Chart(this.docsCanvas.nativeElement, config);
  }

  /** Barre : performance des agents */
  private initAgentChart() {
    if (!this.agentCanvas || !this.stats()?.agentPerformance) return;
    const agents = this.stats()!.agentPerformance.slice(0, 8);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: agents.map((a: AgentPerformance) => a.username),
        datasets: [
          {
            label: 'Clients créés ce mois',
            data: agents.map((a: AgentPerformance) => a.clientsCreatedThisMonth),
            backgroundColor: '#0e7490',
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 22,
          },
          {
            label: 'Documents traités',
            data: agents.map((a: AgentPerformance) => a.documentsProcessedThisMonth),
            backgroundColor: '#10b981',
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 22,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 12, font: { size: 11, weight: 'bold' }, color: '#334155' },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = agents[context.dataIndex];
                return ` ${context.dataset.label}: ${context.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.15)' }, ticks: { color: '#64748b', font: { size: 12 }, precision: 0 } },
        },
      },
    };

    this.agentChart = new Chart(this.agentCanvas.nativeElement, config);
  }

  /** Doughnut : répartition des clients par type */
  private initTypeChart() {
    if (!this.typeCanvas || !this.stats()?.typeDistribution) return;
    const types = this.stats()!.typeDistribution.filter((t) => t.count > 0);

    if (types.length === 0) {
      this.typeChart = new Chart(this.typeCanvas.nativeElement, {
        type: 'doughnut',
        data: { labels: ['Aucun client'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } },
      });
      return;
    }

    const palette: Record<string, string> = {
      'Particulier': '#1e3a5f',
      'Entreprise': '#0e7490',
      'VIP': '#8b5cf6',
      'Professionnel': '#14b8a6',
      'Association': '#f59e0b',
    };

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: types.map((t) => t.type),
        datasets: [
          {
            data: types.map((t) => t.count),
            backgroundColor: types.map((t) => palette[t.type] ?? '#64748b'),
            borderWidth: 3,
            borderColor: '#fff',
            hoverBorderWidth: 4,
            hoverBorderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, padding: 12, font: { size: 11, weight: 'bold' }, color: '#334155' },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            cornerRadius: 12,
            padding: 14,
            callbacks: {
              label: (context: any) => {
                const item = types[context.dataIndex];
                return ` ${item.count} client(s) — ${item.percentage}%`;
              },
            },
          },
        },
      },
    };

    this.typeChart = new Chart(this.typeCanvas.nativeElement, config);
  }

  // ═══════════════════ HELPERS ═══════════════════

  formatMontant(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatCours(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  get coursJourSorted() {
    const cours = this.finance()?.coursJour ?? [];
    return [...cours].sort((a, b) => (a.devise === 'TND' ? -1 : b.devise === 'TND' ? 1 : a.devise.localeCompare(b.devise)));
  }

  get coursJourPrincipaux() {
    const principaux = ['TND', 'EUR', 'USD', 'GBP'];
    return this.coursJourSorted.filter(c => principaux.includes(c.devise));
  }

  get coursJourDate(): Date | null {
    const cours = this.finance()?.coursJour ?? [];
    const dated = cours.find(c => !!c.date);
    return dated?.date ? new Date(dated.date) : null;
  }

  formatCompact(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (abs >= 1_000) return (value / 1_000).toFixed(1).replace('.', ',') + ' k';
    return value.toLocaleString('fr-FR');
  }

  sensLabel(sens: string): string {
    return sens === 'C' ? 'Crédit' : 'Débit';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  alertSeverityClass(severity: AlertSeverity): string {
    return this.dashboardService.getAlertSeverityClass(severity);
  }

  alertIcon(type: any): string {
    return this.dashboardService.getAlertIcon(type);
  }

  severityLabel(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.Info: return 'Info';
      case AlertSeverity.Warning: return 'Attention';
      case AlertSeverity.Error: return 'Erreur';
      case AlertSeverity.Critical: return 'Critique';
      default: return 'Info';
    }
  }

  perfClass(score: number): string {
    if (score >= 70) return 'bg-green-100 text-green-700';
    if (score >= 40) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-600';
  }
}
