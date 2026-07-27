import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/marketing-layout/marketing-layout.component').then(m => m.MarketingLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/accueil/accueil.component').then(m => m.AccueilComponent) },
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
      { path: 'liste-clients', loadComponent: () => import('./pages/liste-clients/liste-clients.component').then(m => m.ListeClientsComponent) },
      { path: 'nouveau-client', loadComponent: () => import('./pages/nouveau-client/nouveau-client.component').then(m => m.NouveauClientComponent) },
      { path: 'modifier-client/:id', loadComponent: () => import('./pages/nouveau-client/nouveau-client.component').then(m => m.NouveauClientComponent) },
      { path: 'client/:id', loadComponent: () => import('./pages/detail-client/detail-client.component').then(m => m.DetailClientComponent) },
      { path: 'gestion-documents', loadComponent: () => import('./pages/gestion-documents/gestion-documents.component').then(m => m.GestionDocumentsComponent) },
      { path: 'agenda', loadComponent: () => import('./pages/agenda/agenda.component').then(m => m.AgendaComponent) },
      { path: 'taskboard', loadComponent: () => import('./pages/taskboard/taskboard.component').then(m => m.TaskboardComponent) },
      { path: 'rapports', loadComponent: () => import('./pages/rapports/rapports.component').then(m => m.RapportsComponent) },
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
