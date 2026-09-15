import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth.state';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const authState = inject(AuthState);
  const router = inject(Router);

  // Auth state is already known.
  if (authState.isInitialized()) {
    return authState.isAuthenticated()
      ? router.createUrlTree(['/dashboard'])
      : true;
  }

  // New tab / page reload:
  // restore the session using the HttpOnly refresh cookie.
  return authService.restoreSession().pipe(
    map(() => {
      return authState.isAuthenticated()
        ? router.createUrlTree(['/dashboard'])
        : true;
    })
  );
};