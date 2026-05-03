import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = (route.data?.['roles'] as UserRole[] | undefined) ?? [];
  if (!allowedRoles.length) {
    return true;
  }

  const currentRole = authService.getUserRole();
  if (currentRole && allowedRoles.includes(currentRole)) {
    return true;
  }

  if (currentRole === 'admin') {
    return router.createUrlTree(['/admin']);
  }

  return router.createUrlTree(['/catalog']);
};
