import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReminderService, ReminderDto, CreateReminderDto, ReminderStatsDto } from '../../services/reminder.service';
import { AuthService, UserDto } from '../../services/auth.service';

@Component({
  selector: 'app-taskboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './taskboard.component.html',
  styleUrls: ['./taskboard.component.css']
})
export class TaskboardComponent implements OnInit {
  allReminders: ReminderDto[] = [];
  users: UserDto[] = [];
  superviseurs: UserDto[] = [];
  agents: UserDto[] = [];
  stats: ReminderStatsDto | null = null;
  loading = true;

  todo: ReminderDto[] = [];
  inProgress: ReminderDto[] = [];
  done: ReminderDto[] = [];

  draggedTask: ReminderDto | null = null;

  showModal = false;
  isEditing = false;
  editId: number | null = null;
  formData: CreateReminderDto = {
    title: '',
    description: '',
    type: 'Autre',
    priority: 'Normale',
    dueDate: '',
    clientId: undefined,
    assignedToUserId: undefined
  };

  statsFilter: 'all' | 'todo' | 'inProgress' | 'done' = 'all';

  get isTeamView(): boolean {
    return this.auth.hasRole('Admin') || this.auth.hasRole('Superviseur');
  }

  get viewLabel(): string {
    return this.isTeamView ? 'Toutes les tâches (équipe)' : 'Mes tâches';
  }

  constructor(
    private reminderService: ReminderService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;

    if (this.isTeamView) {
      this.reminderService.getTeamStats().subscribe({
        next: s => { this.stats = s; }
      });
      this.reminderService.getTeamFiltered({}).subscribe({
        next: r => { this.allReminders = r; this.splitByStatus(); this.loading = false; },
        error: () => { this.loading = false; }
      });
    } else {
      this.reminderService.getStats().subscribe({
        next: s => { this.stats = s; }
      });
      this.reminderService.getAssignedToMe({}).subscribe({
        next: r => { this.allReminders = r; this.splitByStatus(); this.loading = false; },
        error: () => { this.loading = false; }
      });
    }

    this.auth.getAllUsers().subscribe({
      next: u => {
        const active = u.filter(x => x.isActive);
        this.superviseurs = active.filter(x => x.roles.includes('Superviseur'));
        this.agents = active.filter(x => x.roles.includes('Agent'));
        this.users = [...this.superviseurs, ...this.agents];
      }
    });
  }

  splitByStatus(): void {
    this.todo = this.allReminders
      .filter(r => r.status === 'EnAttente')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    this.inProgress = this.allReminders
      .filter(r => r.status === 'EnCours')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    this.done = this.allReminders
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
        this.splitByStatus();
      },
      error: () => {
        this.loadAll();
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
        this.splitByStatus();
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

  getPriorityColor(p: string): string {
    switch (p) {
      case 'Critique': return 'error';
      case 'Haute': return 'warning';
      case 'Basse': return 'text-on-surface-variant/60';
      default: return 'text-on-surface-variant/80';
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

  isOverdue(r: ReminderDto): boolean {
    return r.status !== 'Termine' && new Date(r.dueDate) < new Date();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatDateShort(date: string): string {
    const d = new Date(date);
    const t = new Date();
    const isToday = d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    if (isToday) return "Aujourd'hui";
    const tomorrow = new Date(t);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear();
    if (isTomorrow) return 'Demain';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
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

  openEdit(task: ReminderDto): void {
    this.isEditing = true;
    this.editId = task.id;
    this.formData = {
      title: task.title,
      description: task.description || '',
      type: task.type,
      priority: task.priority,
      dueDate: this.formatDateForInput(new Date(task.dueDate)),
      clientId: task.clientId,
      assignedToUserId: task.assignedToUserId
    };
    this.showModal = true;
  }

  save(): void {
    if (!this.formData.title || !this.formData.dueDate) return;
    if (this.isEditing && this.editId) {
      this.reminderService.update(this.editId, this.formData).subscribe({
        next: () => { this.showModal = false; this.loadAll(); }
      });
    } else {
      this.reminderService.create(this.formData).subscribe({
        next: () => { this.showModal = false; this.loadAll(); }
      });
    }
  }

  deleteReminder(task: ReminderDto): void {
    if (!confirm('Supprimer cette tâche ?')) return;
    this.reminderService.delete(task.id).subscribe({ next: () => this.loadAll() });
  }

  setFilter(filter: 'all' | 'todo' | 'inProgress' | 'done'): void {
    this.statsFilter = this.statsFilter === filter ? 'all' : filter;
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
