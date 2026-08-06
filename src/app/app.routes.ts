import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/marketing-layout/marketing-layout.component').then(m => m.MarketingLayoutComponent),
    children: [
      { path: '', redirectTo: 'connexion', pathMatch: 'full' },
      { path: 'connexion', loadComponent: () => import('./pages/connexion/connexion.component').then(m => m.ConnexionComponent) },
      { path: 'inscription', loadComponent: () => import('./pages/inscription/inscription.component').then(m => m.InscriptionComponent) },
      { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/sidebar-layout/sidebar-layout.component').then(m => m.SidebarLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'tableau-de-bord', loadComponent: () => import('./pages/tableau-de-bord/tableau-de-bord.component').then(m => m.TableauDeBordComponent) },
      { path: 'vue-globale', redirectTo: 'tableau-de-bord' },
      { path: 'liste-clients', loadComponent: () => import('./pages/liste-clients/liste-clients.component').then(m => m.ListeClientsComponent) },
      { path: 'comptes', loadComponent: () => import('./pages/comptes/comptes.component').then(m => m.ComptesComponent) },
      { path: 'nouveau-client', loadComponent: () => import('./pages/nouveau-client/nouveau-client.component').then(m => m.NouveauClientComponent) },
      { path: 'modifier-client/:id', loadComponent: () => import('./pages/nouveau-client/nouveau-client.component').then(m => m.NouveauClientComponent) },
      { path: 'client/:id', loadComponent: () => import('./pages/detail-client/detail-client.component').then(m => m.DetailClientComponent) },
      { path: 'gestion-documents', loadComponent: () => import('./pages/gestion-documents/gestion-documents.component').then(m => m.GestionDocumentsComponent) },
      { path: 'agenda-taches', loadComponent: () => import('./pages/agenda-taches/agenda-taches.component').then(m => m.AgendaTachesComponent) },
      { path: 'agenda', redirectTo: 'agenda-taches' },
      { path: 'taskboard', redirectTo: 'agenda-taches' },
      { path: 'rapports', loadComponent: () => import('./pages/rapports/rapports.component').then(m => m.RapportsComponent) },
      { path: 'cours', loadComponent: () => import('./pages/cours/cours.component').then(m => m.CoursComponent) },
      { path: 'assistant-ia', loadComponent: () => import('./pages/assistant-ia/assistant-ia.component').then(m => m.AssistantIaComponent) },
      { path: 'messagerie', loadComponent: () => import('./pages/messagerie/messagerie.component').then(m => m.MessagerieComponent) },
      { path: 'surveillance-fraude', loadComponent: () => import('./pages/surveillance-fraude/surveillance-fraude.component').then(m => m.SurveillanceFraudeComponent) },
      { path: 'parametres', loadComponent: () => import('./pages/parametres/parametres.component').then(m => m.ParametresComponent) },
      { path: 'changement-mot-de-passe', loadComponent: () => import('./pages/changement-mot-de-passe/changement-mot-de-passe.component').then(m => m.ChangementMotDePasseComponent) },
      { path: 'historique-modifications', loadComponent: () => import('./pages/historique-modifications/historique-modifications.component').then(m => m.HistoriqueModificationsComponent) },
      { path: 'portal', loadComponent: () => import('./pages/portal/portal.component').then(m => m.PortalComponent) },
      {
        path: 'gestion-utilisateurs',
        loadComponent: () => import('./pages/gestion-utilisateurs/gestion-utilisateurs.component').then(m => m.GestionUtilisateursComponent),
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'Superviseur'] },
      },
      { path: '**', redirectTo: 'tableau-de-bord' },
    ],
  },
  { path: '**', redirectTo: '' },
];
