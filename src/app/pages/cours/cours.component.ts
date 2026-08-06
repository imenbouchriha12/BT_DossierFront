import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { FinanceService } from '../../services/finance.service';
import { CoursTempsReelDto, CoursDto } from '../../models/finance.models';
Chart.register(...registerables);

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cours.component.html',
})
export class CoursComponent implements OnInit, AfterViewInit {
  @ViewChild('historiqueChart') historiqueCanvas!: ElementRef<HTMLCanvasElement>;

  cours: CoursTempsReelDto[] = [];
  loading = true;
  error = '';

  deviseSelectionnee = '';
  historique: CoursDto[] = [];
  historiqueLoading = false;
  historiqueDisponible = true;

  private chart: Chart | null = null;

  constructor(private financeService: FinanceService, private cdr: ChangeDetectorRef) {}

  get dateSource(): Date | null {
    const dated = this.cours.find(c => !!c.date);
    return dated?.date ? new Date(dated.date) : null;
  }

  ngOnInit(): void {
    this.financeService.getCoursTempsReel().subscribe({
      next: (cours) => {
        this.cours = cours;
        const eur = cours.find(c => c.devise === 'EUR');
        this.deviseSelectionnee = eur?.devise ?? cours[0]?.devise ?? '';
        if (this.deviseSelectionnee) this.loadHistorique();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les cours de change.';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderChart(), 100);
  }

  selectDevise(devise: string) {
    this.deviseSelectionnee = devise;
    this.loadHistorique();
  }

  loadHistorique() {
    if (!this.deviseSelectionnee) return;
    this.historiqueLoading = true;
    this.historiqueDisponible = true;
    this.financeService.getCoursHistorique(this.deviseSelectionnee).subscribe({
      next: (hist) => {
        this.historique = hist;
        this.historiqueDisponible = hist.length > 0;
        this.historiqueLoading = false;
        this.cdr.detectChanges();
        this.renderChart();
      },
      error: () => {
        this.historique = [];
        this.historiqueDisponible = false;
        this.historiqueLoading = false;
      }
    });
  }

  renderChart() {
    if (!this.historiqueCanvas || this.historique.length === 0) return;
    if (this.chart) this.chart.destroy();
    this.chart = null;
    if (this.historique.length === 0) return;

    const labels = this.historique.map(h => new Date(h.journee).toLocaleDateString('fr-FR'));
    const data = this.historique.map(h => h.valeur);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Cours ${this.deviseSelectionnee} (TND)`,
          data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#2563eb',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: false }
        }
      }
    };

    this.chart = new Chart(this.historiqueCanvas.nativeElement, config);
  }

  formatValeur(c: CoursTempsReelDto): string {
    return c.valeur.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
}
