import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { fieldBorder, isValidEmail } from '../../shared/validation.utils';

@Component({
  standalone: true,
  imports: [RouterLink, NgIf, NgClass, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  email = '';
  error = '';
  success = '';
  loading = false;
  emailTouched = false;

  constructor(private http: HttpClient) {}

  get emailState(): string {
    if (!this.emailTouched) return 'idle';
    if (!this.email) return 'error';
    return isValidEmail(this.email) ? 'ok' : 'error';
  }

  get emailMessage(): string {
    if (!this.emailTouched) return '';
    if (!this.email) return 'L\'adresse email est requise.';
    return isValidEmail(this.email) ? 'Adresse email valide.' : 'Adresse email invalide.';
  }

  fieldBorder = fieldBorder;

  onSubmit(): void {
    this.error = '';
    this.success = '';
    this.emailTouched = true;

    if (!this.email || !isValidEmail(this.email)) {
      this.error = 'Veuillez saisir une adresse email valide.';
      return;
    }

    this.loading = true;

    this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email: this.email })
      .subscribe({
        next: (res) => {
          this.success = res.message || 'Si cette adresse email existe, un lien de réinitialisation vous a été envoyé.';
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Erreur lors de la demande.';
          this.loading = false;
        }
      });
  }
}
