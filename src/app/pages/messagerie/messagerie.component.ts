import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { AuthService, UserDto } from '../../services/auth.service';
import { MessageDto, ConversationDto, PieceJointeDto } from '../../models/message.models';
import { ToastService } from '../../shared/toast/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.css'],
})
export class MessagerieComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  conversations: ConversationDto[] = [];
  filteredConversations: ConversationDto[] = [];
  messages: MessageDto[] = [];
  users: UserDto[] = [];
  onlineUsers = new Set<number>();
  currentUserId: number = 0;
  selectedUserId: number | null = null;
  selectedUser: ConversationDto | null = null;
  inputText = '';
  searchTerm = '';
  unreadTotal = 0;
  loading = true;
  loadingMessages = false;
  showNewModal = false;
  pendingAttachment: PieceJointeDto | null = null;
  uploading = false;

  constructor(
    private messageService: MessageService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUser()?.id ?? 0;
    this.messageService.connect();
    this.loadConversations();
    this.loadUsers();
    this.loadOnlineUsers();
    this.subscribeToEvents();
  }

  ngOnDestroy(): void {
    // La connexion SignalR est partagée au niveau du service : on la garde active
    // pour continuer à recevoir les messages et les non-lus sur les autres pages.
  }

  // ── Chargements ──────────────────────────────────────────────────────

  loadConversations(): void {
    this.messageService.getConversations().subscribe({
      next: list => {
        this.conversations = list;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
    this.messageService.getUnreadCount().subscribe({
      next: c => this.unreadTotal = c.totalNonLu,
      error: () => {},
    });
  }

  loadUsers(): void {
    this.auth.getAllUsers().subscribe({
      next: u => this.users = u.filter(x => x.isActive && x.id !== this.currentUserId),
      error: () => {},
    });
  }

  // ── SignalR ──────────────────────────────────────────────────────────

  private subscribeToEvents(): void {
    this.messageService.recevoirMessage$.subscribe(msg => this.onMessageRecu(msg));
    this.messageService.mettreAJourNonLu$.subscribe(total => {
      this.unreadTotal = total;
      this.cdr.detectChanges();
    });
    this.messageService.messagesLus$.subscribe(data => {
      if (data.userId === this.selectedUserId) {
        this.messages.forEach(m => {
          if (m.expediteurUserId === this.currentUserId) m.lu = true;
        });
        this.cdr.detectChanges();
      }
    });
    this.messageService.presenceChanged$.subscribe(({ userId, enLigne }) => {
      const conv = this.conversations.find(c => c.autreUserId === userId);
      if (conv) conv.enLigne = enLigne;
      if (this.selectedUser?.autreUserId === userId) this.selectedUser.enLigne = enLigne;
      if (enLigne) this.onlineUsers.add(userId);
      else this.onlineUsers.delete(userId);
      this.cdr.detectChanges();
    });
  }

  private loadOnlineUsers(): void {
    this.messageService.getEnLigne().subscribe({
      next: ids => {
        this.onlineUsers = new Set(ids);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  private onMessageRecu(msg: MessageDto): void {
    const estLeMien = msg.expediteurUserId === this.currentUserId;

    if (estLeMien && msg.destinataireUserId === this.selectedUserId) {
      // Retour de diffusion de mon propre envoi (multi-onglets) : déduplication
      const idx = this.messages.findIndex(m => m.id === msg.id || (m.id === 0 && m.dateEnvoi === msg.dateEnvoi));
      if (idx >= 0) this.messages[idx] = msg;
      else this.messages.push(msg);
      this.refreshLastMessage();
      this.scrollToBottom();
    } else if (!estLeMien && msg.expediteurUserId === this.selectedUserId) {
      this.messages.push(msg);
      this.markRead();
      this.scrollToBottom();
    } else if (!estLeMien) {
      // Message arrivé pendant que je suis sur une autre conversation
      this.loadConversations();
    }
    this.cdr.detectChanges();
  }

  // ── Conversation ─────────────────────────────────────────────────────

  selectConversation(conv: ConversationDto): void {
    this.selectedUserId = conv.autreUserId;
    this.selectedUser = conv;
    this.loadMessages();
  }

  closeConversation(): void {
    this.selectedUserId = null;
    this.selectedUser = null;
    this.messages = [];
    this.pendingAttachment = null;
  }

  startConversation(user: UserDto): void {
    this.showNewModal = false;
    const existing = this.conversations.find(c => c.autreUserId === user.id);
    this.selectedUserId = user.id;
    this.selectedUser = existing ?? {
      autreUserId: user.id,
      autreNom: user.username,
      autreMatricule: user.matricule,
      autreRole: user.roles?.[0] ?? '',
      enLigne: this.isOnline(user.id),
      nonLu: 0,
    };
    this.messages = [];
    this.loadMessages();
  }

  loadMessages(): void {
    if (!this.selectedUserId) return;
    this.loadingMessages = true;
    this.messageService.getMessages(this.selectedUserId, 1, 200).subscribe({
      next: res => {
        this.messages = res.items;
        this.loadingMessages = false;
        this.markRead();
        this.scrollToBottom();
      },
      error: () => { this.loadingMessages = false; },
    });
  }

  markRead(): void {
    if (!this.selectedUserId) return;
    this.messageService.markRead(this.selectedUserId).subscribe({
      next: c => {
        this.unreadTotal = c.totalNonLu;
        const conv = this.conversations.find(x => x.autreUserId === this.selectedUserId);
        if (conv) conv.nonLu = 0;
      },
      error: () => {},
    });
  }

  send(): void {
    const contenu = this.inputText.trim();
    const pj = this.pendingAttachment;
    if ((!contenu && !pj) || !this.selectedUserId) return;
    this.inputText = '';
    this.pendingAttachment = null;
    if (this.chatInput) this.chatInput.nativeElement.style.height = 'auto';

    const temp: MessageDto = {
      id: 0,
      expediteurUserId: this.currentUserId,
      expediteurNom: this.auth.currentUser()?.username,
      destinataireUserId: this.selectedUserId,
      contenu,
      pieceJointeUrl: pj?.url,
      pieceJointeNom: pj?.nom,
      pieceJointeType: pj?.type,
      dateEnvoi: new Date().toISOString(),
      lu: false,
    };
    this.messages.push(temp);
    this.scrollToBottom();

    this.messageService.send({
      destinataireUserId: this.selectedUserId,
      contenu,
      pieceJointeUrl: pj?.url ?? null,
      pieceJointeNom: pj?.nom ?? null,
      pieceJointeType: pj?.type ?? null,
    }).subscribe({
      next: sent => {
        const idx = this.messages.findIndex(m => m.id === 0 && m.contenu === sent.contenu && m.pieceJointeUrl === sent.pieceJointeUrl);
        if (idx >= 0) this.messages[idx] = sent;
        else this.messages.push(sent);
        this.refreshLastMessage();
        this.scrollToBottom();
      },
      error: () => {
        this.inputText = contenu;
        this.pendingAttachment = pj;
        this.messages = this.messages.filter(m => m !== temp);
        this.toast.error('Échec de l\'envoi du message.');
        this.cdr.detectChanges();
      },
    });
  }

  triggerImageUpload(): void {
    this.fileInput.nativeElement.accept = 'image/*';
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = true;
    this.messageService.uploadPieceJointe(file).subscribe({
      next: pj => {
        this.pendingAttachment = pj;
        this.uploading = false;
        this.toast.success('Fichier joint prêt à être envoyé.');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.uploading = false;
        const msg = err?.error?.message ?? 'Échec de l\'envoi du fichier.';
        this.toast.error(msg);
        this.cdr.detectChanges();
      },
    });
  }

  removeAttachment(): void {
    this.pendingAttachment = null;
  }

  refreshLastMessage(): void {
    this.messageService.getConversations().subscribe({
      next: list => {
        this.conversations = list;
        this.applyFilter();
        const sel = this.selectedUser;
        if (sel) {
          const upd = list.find(c => c.autreUserId === sel.autreUserId);
          if (upd) sel.dernierMessage = upd.dernierMessage;
        }
      },
      error: () => {},
    });
  }

  // ── Interactions ─────────────────────────────────────────────────────

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.shiftKey) return;
    event.preventDefault();
    this.send();
  }

  autoGrow(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  openNew(): void { this.showNewModal = true; }
  closeNew(): void { this.showNewModal = false; }

  applyFilter(): void {
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredConversations = this.conversations
      .filter(c =>
        !q ||
        (c.autreNom?.toLowerCase().includes(q) ?? false) ||
        (c.autreMatricule?.toLowerCase().includes(q) ?? false)
      )
      .sort((a, b) => new Date(b.derniereDate ?? 0).getTime() - new Date(a.derniereDate ?? 0).getTime());
  }

  // ── Helpers d'affichage ──────────────────────────────────────────────

  isMine(m: MessageDto): boolean {
    return m.expediteurUserId === this.currentUserId;
  }

  isImage(type?: string | null): boolean {
    return !!type && type.startsWith('image/');
  }

  hasPieceJointe(m: MessageDto): boolean {
    return !!m.pieceJointeUrl;
  }

  fullUrl(relative?: string | null): string {
    if (!relative) return '';
    const sansPrefixe = relative.replace(/^\/?uploads\//, '');
    return `${environment.staticUrl}${sansPrefixe}`;
  }

  isOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  formatTime(d?: string | null): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const t = new Date();
    const sameDay = date.toDateString() === t.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  roleLabel(role?: string): string {
    switch (role) {
      case 'Admin': return 'Administrateur';
      case 'Superviseur': return 'Superviseur';
      case 'Agent': return 'Agent';
      default: return role || 'Utilisateur';
    }
  }

  roleColor(role?: string): string {
    switch (role) {
      case 'Admin': return 'bg-error/10 text-error';
      case 'Superviseur': return 'bg-warning/10 text-warning';
      case 'Agent': return 'bg-primary/10 text-primary';
      default: return 'bg-surface-container-high text-on-surface-variant';
    }
  }

  initials(name?: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/[\s.]+/);
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  avatarColor(id: number): string {
    const colors = ['bg-primary', 'bg-warning', 'bg-error', 'bg-tertiary', 'bg-secondary'];
    return colors[Math.abs(id) % colors.length];
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        const el = this.messagesContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      } catch { /* ignore */ }
    }, 30);
  }
}
