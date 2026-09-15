import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth.state';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isInitialized()) {
    return authState.isAuthenticated()
      ? true
      : router.createUrlTree(['/login']);
  }

  return authService.restoreSession().pipe(
    map(() => {
      return authState.isAuthenticated()
        ? true
        : router.createUrlTree(['/login']);
    })
  );
};