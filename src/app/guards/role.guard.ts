import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.hasAnyRole(allowedRoles)) {
    return true;
  }

  return router.parseUrl('/tableau-de-bord');
};
