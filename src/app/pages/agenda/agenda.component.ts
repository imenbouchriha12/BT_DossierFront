import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReminderService, ReminderDto, CreateReminderDto, ReminderStatsDto } from '../../services/reminder.service';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  reminders: ReminderDto[] = [];
  filteredReminders: ReminderDto[] = [];
  stats: ReminderStatsDto | null = null;
  clients: any[] = [];
  loading = true;

  currentView: 'month' | 'week' | 'agenda' = 'agenda';
  selectedDate = new Date();
  currentMonth = new Date();

  filterType = '';
  filterPriority = '';
  filterStatus = '';

  showModal = false;
  isEditing = false;
  formData: CreateReminderDto = {
    title: '',
    description: '',
    type: 'Autre',
    priority: 'Normale',
    dueDate: '',
    clientId: undefined,
    assignedToUserId: undefined
  };
  editId: number | null = null;

  weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  calendarDays: (Date | null)[] = [];
  weekDays: Date[] = [];

  constructor(
    private reminderService: ReminderService,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.buildCalendar();
    this.buildWeek();
  }

  loadData(): void {
    this.loading = true;
    this.reminderService.getStats().subscribe({
      next: s => { this.stats = s; }
    });
    this.reminderService.getFiltered({}).subscribe({
      next: r => { this.reminders = r; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.clientService.search({ pageSize: 100 }).subscribe({
      next: (result) => this.clients = result?.items || []
    });
  }

  applyFilter(): void {
    let list = [...this.reminders];
    if (this.filterType) list = list.filter(r => r.type === this.filterType);
    if (this.filterPriority) list = list.filter(r => r.priority === this.filterPriority);
    if (this.filterStatus) list = list.filter(r => r.status === this.filterStatus);
    this.filteredReminders = list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterPriority = '';
    this.filterStatus = '';
    this.applyFilter();
  }

  get activeFilterCount(): number {
    return (this.filterType ? 1 : 0) + (this.filterPriority ? 1 : 0) + (this.filterStatus ? 1 : 0);
  }

  openCreate(): void {
    this.isEditing = false;
    this.editId = null;
    this.formData = {
      title: '',
      description: '',
      type: 'Autre',
      priority: 'Normale',
      dueDate: this.formatDateForInput(new Date()),
      clientId: undefined,
      assignedToUserId: undefined
    };
    this.showModal = true;
  }

  openEdit(r: ReminderDto): void {
    this.isEditing = true;
    this.editId = r.id;
    this.formData = {
      title: r.title,
      description: r.description || '',
      type: r.type,
      priority: r.priority,
      dueDate: this.formatDateForInput(new Date(r.dueDate)),
      clientId: r.clientId,
      assignedToUserId: r.assignedToUserId
    };
    this.showModal = true;
  }

  save(): void {
    if (!this.formData.title || !this.formData.dueDate) return;
    if (this.isEditing && this.editId) {
      this.reminderService.update(this.editId, this.formData).subscribe({
        next: () => { this.showModal = false; this.loadData(); }
      });
    } else {
      this.reminderService.create(this.formData).subscribe({
        next: () => { this.showModal = false; this.loadData(); }
      });
    }
  }

  markComplete(r: ReminderDto): void {
    this.reminderService.complete(r.id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Erreur completion rappel:', err)
    });
  }

  deleteReminder(r: ReminderDto): void {
    if (!confirm('Supprimer ce rappel ?')) return;
    this.reminderService.delete(r.id).subscribe({ next: () => this.loadData() });
  }

  isOverdue(r: ReminderDto): boolean {
    return r.status !== 'Termine' && new Date(r.dueDate) < new Date();
  }

  isToday(date: Date): boolean {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  }

  getRemindersForDay(date: Date): ReminderDto[] {
    return this.reminders.filter(r => {
      const d = new Date(r.dueDate);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  }

  buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    this.calendarDays = [];
    for (let i = 0; i < startOffset; i++) this.calendarDays.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) this.calendarDays.push(new Date(year, month, d));
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  selectDay(date: Date): void {
    this.selectedDate = date;
    this.buildWeek();
  }

  buildWeek(): void {
    const d = new Date(this.selectedDate);
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek);
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      this.weekDays.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
  }

  get monthLabel(): string {
    return this.currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get todayReminders(): ReminderDto[] {
    const now = new Date();
    return this.reminders
      .filter(r => r.status !== 'Termine' && new Date(r.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10);
  }

  get overdueReminders(): ReminderDto[] {
    return this.reminders.filter(r => this.isOverdue(r)).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  priorityIcon(p: string): string {
    switch (p) {
      case 'Critique': return 'error';
      case 'Haute': return 'warning';
      case 'Basse': return 'arrow_downward';
      default: return 'remove';
    }
  }

  typeIcon(t: string): string {
    switch (t) {
      case 'Appel': return 'phone';
      case 'Email': return 'mail';
      case 'Rendez-vous': return 'event';
      case 'Relance': return 'campaign';
      case 'Document': return 'description';
      default: return 'notifications';
    }
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'EnAttente': return 'En attente';
      case 'EnCours': return 'En cours';
      case 'Termine': return 'Terminé';
      case 'Annule': return 'Annulé';
      default: return s;
    }
  }

  typeLabel(t: string): string {
    switch (t) {
      case 'Rendez-vous': return 'Rendez-vous';
      case 'Appel': return 'Appel';
      case 'Email': return 'Email';
      case 'Relance': return 'Relance';
      case 'Document': return 'Document';
      default: return t;
    }
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatDateShort(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  private formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  }
}
