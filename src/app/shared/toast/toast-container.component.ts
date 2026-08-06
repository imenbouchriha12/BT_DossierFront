import { Component, OnDestroy } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastItem, ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.css'],
})
export class ToastContainerComponent implements OnDestroy {
  toasts: ToastItem[] = [];
  private sub: Subscription;

  constructor(private toastService: ToastService) {
    this.sub = this.toastService.onToasts.subscribe(items => {
      this.toasts = items;
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onOui(id: number): void {
    this.toastService.resolve(id, true);
  }

  onNon(id: number): void {
    this.toastService.resolve(id, false);
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
