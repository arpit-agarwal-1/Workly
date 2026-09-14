import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthState } from '../auth/auth.state';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthState);
  const authService = inject(AuthService);

  const accessToken = authState.getAccessToken();

  const isAuthRequest = req.url.includes('/auth/');

  // Authentication endpoints don't need the access-token header.
  if (!accessToken || isAuthRequest) {
    return next(req);
  }

  const authenticatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap(() => {
          const newAccessToken = authState.getAccessToken();

          if (!newAccessToken) {
            authState.clear();

            return throwError(() => error);
          }

          const retryRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`
            }
          });

          return next(retryRequest);
        }),
        catchError((refreshError) => {
          authState.clear();

          return throwError(() => refreshError);
        })
      );
    })
  );
};