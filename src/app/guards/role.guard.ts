import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as string[];

  if (auth.isLoggedIn() && auth.hasAnyRole(allowedRoles)) {
    return true;
  }

  return router.parseUrl('/tableau-de-bord');
};
