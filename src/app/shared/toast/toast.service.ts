import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type ToastType = 'info' | 'success' | 'confirm' | 'error';

export interface ToastItem {
  id: number;
  type: ToastType;
  titre?: string;
  message: string;
  /** Durée d'affichage en ms (0 = persiste jusqu'à action, pour les confirmations). */
  duration: number;
}

/**
 * Système de toasts (pop-ups en bas à droite) :
 *  - info     (bleu)   : information à l'utilisateur
 *  - success  (vert)   : action effectuée correctement
 *  - confirm  (rouge)  : validation d'une suppression (Oui / Non)
 *  - error    (rouge)  : échec d'une opération
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts$ = new Subject<ToastItem[]>();
  private toasts: ToastItem[] = [];
  private resolvers = new Map<number, Subject<boolean>>();
  private nextId = 1;

  /** Flux des toasts actifs, consommé par <app-toast-container/>. */
  onToasts = this.toasts$.asObservable();

  info(message: string, titre = 'Information'): number {
    return this.push({ type: 'info', titre, message, duration: 4500 });
  }

  success(message: string, titre = 'Succès'): number {
    return this.push({ type: 'success', titre, message, duration: 4500 });
  }

  error(message: string, titre = 'Erreur'): number {
    return this.push({ type: 'error', titre, message, duration: 6000 });
  }

  /**
   * Confirmation (rouge, boutons Oui / Non).
   * Résout `true` si l'utilisateur confirme, `false` sinon.
   */
  confirm(message: string, titre = 'Confirmation'): Observable<boolean> {
    const id = this.nextId++;
    const item: ToastItem = { id, type: 'confirm', titre, message, duration: 0 };
    const resolver = new Subject<boolean>();
    this.toasts.push(item);
    this.resolvers.set(id, resolver);
    this.emit();
    return resolver.asObservable();
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.resolvers.delete(id);
    this.emit();
  }

  resolve(id: number, valeur: boolean): void {
    const resolver = this.resolvers.get(id);
    if (resolver) {
      resolver.next(valeur);
      resolver.complete();
    }
    this.dismiss(id);
  }

  private push(item: Omit<ToastItem, 'id'>): number {
    const id = this.nextId++;
    this.toasts.push({ ...item, id });
    this.emit();
    if (item.duration > 0) {
      setTimeout(() => this.dismiss(id), item.duration);
    }
    return id;
  }

  private emit(): void {
    this.toasts$.next([...this.toasts]);
  }
}
