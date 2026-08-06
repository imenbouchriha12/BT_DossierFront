import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { fieldBorder } from '../../shared/validation.utils';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, NgIf, NgClass],
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.css']
})
export class ConnexionComponent {
  matricule = '';
  password = '';
  error = '';
  loading = false;
  showPassword = false;
  rememberMe = true;
  matriculeTouched = false;
  passwordTouched = false;

  constructor(private auth: AuthService, private router: Router, private toast: ToastService) {
    this.matricule = auth.getRememberedMatricule();
    this.rememberMe = auth.isRemembered();
  }

  get matriculeState(): string {
    if (!this.matriculeTouched) return 'idle';
    return this.matricule ? 'ok' : 'error';
  }

  get passwordState(): string {
    if (!this.passwordTouched) return 'idle';
    return this.password ? 'ok' : 'error';
  }

  fieldBorder = fieldBorder;

  onSubmit(): void {
    this.matriculeTouched = true;
    this.passwordTouched = true;

    if (!this.matricule || !this.password) {
      this.error = 'Veuillez remplir tous les champs.';
      this.toast.error('Veuillez remplir tous les champs.');
      return;
    }

    this.loading = true;
    this.error = '';
    this.auth.setRememberMe(this.rememberMe);
    this.auth.saveMatricule(this.matricule);

    this.auth.login({ matricule: this.matricule, password: this.password }).subscribe({
      next: () => {
        this.toast.success('Connexion réussie. Bienvenue !');
        this.router.navigate(['/tableau-de-bord']);
      },
      error: (err) => {
        const msg = err.error?.message || 'Identifiants invalides ou compte inactif.';
        this.error = msg;
        this.toast.error(msg);
        this.loading = false;
      }
    });
  }
}
