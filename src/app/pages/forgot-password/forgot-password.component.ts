import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [RouterLink, NgIf, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  email = '';
  error = '';
  success = '';
  loading = false;

  constructor(private http: HttpClient) {}

  onSubmit(): void {
    this.error = '';
    this.success = '';

    if (!this.email) {
      this.error = 'Veuillez saisir votre adresse email.';
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
