import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { fieldBorder, isValidEmail } from '../../shared/validation.utils';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, NgIf, NgClass],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css']
})
export class InscriptionComponent {
  username = '';
  email = '';
  error = '';
  success = '';
  loading = false;
  usernameTouched = false;
  emailTouched = false;

  constructor(private auth: AuthService, private router: Router, private toast: ToastService) {}

  get usernameState(): string {
    if (!this.usernameTouched) return 'idle';
    return this.username ? 'ok' : 'error';
  }

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
    this.usernameTouched = true;
    this.emailTouched = true;

    if (!this.username || !this.email || !isValidEmail(this.email)) {
      this.error = 'Veuillez vérifier les champs du formulaire.';
      this.toast.error('Veuillez vérifier les champs du formulaire.');
      return;
    }

    this.loading = true;

    this.auth.register({
      username: this.username,
      email: this.email
    }).subscribe({
      next: (res) => {
        this.success = res.message || 'Compte créé avec succès. En attente d\'activation par l\'administrateur.';
        this.toast.success(this.success);
        this.loading = false;
      },
      error: (err) => {
        const msg = err.error?.message || 'Erreur lors de l\'inscription.';
        this.error = msg;
        this.toast.error(msg);
        this.loading = false;
      }
    });
  }
}
