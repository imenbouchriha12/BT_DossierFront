import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ReminderService, ReminderDto, CreateReminderDto, ReminderStatsDto } from '../../services/reminder.service';
import { ClientService } from '../../services/client.service';
import { AuthService, UserDto } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { fieldBorder } from '../../shared/validation.utils';

@Component({
  selector: 'app-agenda-taches',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agenda-taches.component.html',
  styleUrls: ['./agenda-taches.component.css']
})
export class AgendaTachesComponent implements OnInit {
  allReminders: ReminderDto[] = [];
  filteredReminders: ReminderDto[] = [];
  stats: ReminderStatsDto | null = null;
  clients: any[] = [];
  users: UserDto[] = [];
  superviseurs: UserDto[] = [];
  agents: UserDto[] = [];
  loading = true;

  pageView: 'planning' | 'kanban' = 'planning';
  currentView: 'agenda' | 'month' | 'week' = 'agenda';
  selectedDate = new Date();
  currentMonth = new Date();

  filterType = '';
  filterPriority = '';
  filterStatus = '';

  showModal = false;
  isEditing = false;
  editId: number | null = null;
  touchedModal: Record<string, boolean> = {};

  markModalTouched(field: string): void {
    this.touchedModal[field] = true;
  }

  private modalState(field: string): 'idle' | 'error' | 'ok' {
    if (!this.touchedModal[field]) return 'idle';
    const value = field === 'title' ? this.formData.title : this.formData.dueDate;
    return value && value.trim() ? 'ok' : 'error';
  }

  modalBorder(field: string): string {
    return fieldBorder(this.modalState(field));
  }

  modalMessage(field: string): string {
    if (!this.touchedModal[field]) return '';
    const value = field === 'title' ? this.formData.title : this.formData.dueDate;
    if (!value || !value.trim()) return field === 'title' ? 'Le titre est requis.' : 'La date est requise.';
    return 'Champ valide.';
  }

  modalMessageClass(field: string): string {
    const state = this.modalState(field);
    if (state === 'error') return 'text-red-600';
    if (state === 'ok') return 'text-emerald-600';
    return '';
  }

  modalMessageIcon(field: string): string {
    const state = this.modalState(field);
    if (state === 'error') return 'error';
    if (state === 'ok') return 'check_circle';
    return '';
  }

  isModalValid(): boolean {
    return !!this.formData.title?.trim() && !!this.formData.dueDate?.trim();
  }

  formData: CreateReminderDto = {
    title: '',
    description: '',
    type: 'Autre',
    priority: 'Normale',
    dueDate: '',
    clientId: undefined,
    assignedToUserId: undefined
  };

  todo: ReminderDto[] = [];
  inProgress: ReminderDto[] = [];
  done: ReminderDto[] = [];
  draggedTask: ReminderDto | null = null;
  statsFilter: 'all' | 'todo' | 'inProgress' | 'done' = 'all';

  weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  calendarDays: (Date | null)[] = [];
  weekDays: Date[] = [];

  constructor(
    private reminderService: ReminderService,
    private clientService: ClientService,
    public auth: AuthService,
    private toast: ToastService
  ) {}

  get isTeamView(): boolean {
    return this.auth.hasRole('Admin') || this.auth.hasRole('Superviseur');
  }

  get viewLabel(): string {
    return this.isTeamView ? 'Toutes les activités (équipe)' : 'Mes activités';
  }

  ngOnInit(): void {
    this.loadData();
    this.buildCalendar();
    this.buildWeek();
  }

  loadData(): void {
    this.loading = true;
    if (this.isTeamView) {
      this.reminderService.getTeamStats().subscribe({ next: s => { this.stats = s; } });
      this.reminderService.getTeamFiltered({}).subscribe({
        next: r => { this.allReminders = r; this.applyFilter(); this.loading = false; },
        error: () => { this.loading = false; }
      });
    } else {
      this.reminderService.getStats().subscribe({ next: s => { this.stats = s; } });
      this.reminderService.getAssignedToMe({}).subscribe({
        next: r => { this.allReminders = r; this.applyFilter(); this.loading = false; },
        error: () => { this.loading = false; }
      });
    }
    this.clientService.search({ pageSize: 100 }).subscribe({
      next: (result) => this.clients = result?.items || []
    });
    this.auth.getAllUsers().subscribe({
      next: u => {
        const active = u.filter(x => x.isActive);
        this.superviseurs = active.filter(x => x.roles.includes('Superviseur'));
        this.agents = active.filter(x => x.roles.includes('Agent'));
        this.users = [...this.superviseurs, ...this.agents];
      }
    });
  }

  // ── Filtres ──────────────────────────────────────────────────────────

  applyFilter(): void {
    let list = [...this.allReminders];
    if (this.filterType) list = list.filter(r => r.type === this.filterType);
    if (this.filterPriority) list = list.filter(r => r.priority === this.filterPriority);
    if (this.filterStatus) list = list.filter(r => r.status === this.filterStatus);
    this.filteredReminders = list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    this.splitByStatus();
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

  setFilter(filter: 'all' | 'todo' | 'inProgress' | 'done'): void {
    this.statsFilter = this.statsFilter === filter ? 'all' : filter;
  }

  // ── Kanban ───────────────────────────────────────────────────────────

  splitByStatus(): void {
    this.todo = this.filteredReminders
      .filter(r => r.status === 'EnAttente')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    this.inProgress = this.filteredReminders
      .filter(r => r.status === 'EnCours')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    this.done = this.filteredReminders
      .filter(r => r.status === 'Termine')
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  get filteredTodo(): ReminderDto[] {
    return this.statsFilter === 'all' || this.statsFilter === 'todo' ? this.todo : [];
  }

  get filteredInProgress(): ReminderDto[] {
    return this.statsFilter === 'all' || this.statsFilter === 'inProgress' ? this.inProgress : [];
  }

  get filteredDone(): ReminderDto[] {
    return this.statsFilter === 'all' || this.statsFilter === 'done' ? this.done : [];
  }

  onDragStart(event: DragEvent, task: ReminderDto): void {
    if (!this.canDrag(task)) {
      event.preventDefault();
      return;
    }
    this.draggedTask = task;
    event.dataTransfer?.setData('text/plain', task.id.toString());
    event.dataTransfer!.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onDrop(event: DragEvent, targetStatus: string): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    if (!this.draggedTask || this.draggedTask.status === targetStatus) return;

    if (!this.isTeamView && targetStatus === 'Termine') {
      this.signTask(this.draggedTask);
      this.draggedTask = null;
      return;
    }

    this.draggedTask.status = targetStatus;
    this.reminderService.updateStatus(this.draggedTask.id, targetStatus).subscribe({
      next: () => {
        this.draggedTask = null;
        this.applyFilter();
      },
      error: () => {
        this.loadData();
        this.draggedTask = null;
      }
    });
  }

  canDrag(task: ReminderDto): boolean {
    if (task.status === 'Termine') return false;
    if (!task.assignedToUserId) return false;
    const uid = this.auth.currentUser()?.id;
    return task.assignedToUserId === uid || task.createdByUserId === uid;
  }

  canSign(task: ReminderDto): boolean {
    if (task.status === 'Termine') return false;
    if (this.isTeamView) return false;
    return task.assignedToUserId === this.auth.currentUser()?.id;
  }

  canEdit(task: ReminderDto): boolean {
    if (task.status === 'Termine') return false;
    const uid = this.auth.currentUser()?.id;
    return task.assignedToUserId === uid || task.createdByUserId === uid;
  }

  signTask(task: ReminderDto): void {
    this.reminderService.sign(task.id).subscribe({
      next: () => {
        task.status = 'Termine';
        this.applyFilter();
      },
      error: (err) => console.error('Erreur signature:', err)
    });
  }

  getAssigneeName(task: ReminderDto): string {
    return task.assignedToUserName || task.assignedToUserId?.toString() || '—';
  }

  getAssigneeRole(task: ReminderDto): string {
    if (!task.assignedToUserId) return '';
    const user = this.users.find(u => u.id === task.assignedToUserId);
    return user?.roles?.includes('Superviseur') ? 'Sup.' : user?.roles?.includes('Agent') ? 'Agent' : '';
  }

  getAssigneeInitials(task: ReminderDto): string {
    const name = task.assignedToUserName;
    if (!name) return '?';
    const parts = name.split(/[\s.]+/);
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  // ── Calendrier ───────────────────────────────────────────────────────

  isOverdue(r: ReminderDto): boolean {
    return r.status !== 'Termine' && new Date(r.dueDate) < new Date();
  }

  isToday(date: Date): boolean {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  }

  getRemindersForDay(date: Date): ReminderDto[] {
    return this.filteredReminders.filter(r => {
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

  shiftWeek(days: number): void {
    this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), this.selectedDate.getDate() + days);
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

  get weekLabel(): string {
    if (this.weekDays.length < 7) return '';
    return `${this.weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${this.weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  get todayReminders(): ReminderDto[] {
    const now = new Date();
    return this.allReminders
      .filter(r => r.status !== 'Termine' && new Date(r.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 8);
  }

  get overdueReminders(): ReminderDto[] {
    return this.allReminders.filter(r => this.isOverdue(r)).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // ── CRUD ─────────────────────────────────────────────────────────────

  openCreate(): void {
    this.isEditing = false;
    this.editId = null;
    this.touchedModal = {};
    this.formData = {
      title: '',
      description: '',
      type: 'Autre',
      priority: 'Normale',
      dueDate: this.formatDateForInput(new Date()),
      clientId: undefined,
      assignedToUserId: this.isTeamView ? undefined : this.auth.currentUser()?.id
    };
    this.showModal = true;
  }

  openEdit(r: ReminderDto): void {
    this.isEditing = true;
    this.editId = r.id;
    this.touchedModal = {};
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
    this.touchedModal = { title: true, dueDate: true };
    if (!this.isModalValid()) return;
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
      error: (err) => console.error('Erreur completion:', err)
    });
  }

  async deleteReminder(r: ReminderDto): Promise<void> {
    const ok = await lastValueFrom(this.toast.confirm(`Supprimer définitivement « ${r.title} » ?`));
    if (!ok) return;
    this.reminderService.delete(r.id).subscribe({
      next: () => { this.loadData(); this.toast.success('Rappel supprimé avec succès.'); },
      error: (err) => { console.error('Erreur suppression:', err); this.toast.info("Impossible de supprimer ce rappel.", 'Échec'); }
    });
  }

  // ── Helpers d'affichage ──────────────────────────────────────────────

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
      default: return 'task_alt';
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

  getPriorityBg(p: string): string {
    switch (p) {
      case 'Critique': return 'bg-error/10 text-error';
      case 'Haute': return 'bg-warning/10 text-warning';
      case 'Basse': return 'bg-surface-container-high text-on-surface-variant/60';
      default: return 'bg-surface-container-high text-on-surface-variant/80';
    }
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatDateShort(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const t = new Date();
    const isToday = d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    if (isToday) return "Aujourd'hui";
    const tomorrow = new Date(t);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear();
    if (isTomorrow) return 'Demain';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
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
